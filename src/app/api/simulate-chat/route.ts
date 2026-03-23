import { NextRequest } from "next/server";
import { detectPII, rehydrate } from "@/lib/pii-engine";
import OpenAI from "openai";

// ─── Rate limiting (in-memory, per IP) ───────────────────────────────────────
const RATE_LIMIT = 10; // requests
const RATE_WINDOW = 60 * 60 * 1000; // per hour

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ─── Real AI (when OPENAI_API_KEY is set) ────────────────────────────────────

const SYSTEM_PROMPT = `You are a helpful assistant. The user's message may contain anonymized placeholders 
like [NAME_01], [EMAIL_01], [IBAN_01], [AHV_01] etc. These replace real personal data that has been 
removed for privacy. Treat the placeholders as if they were the real values. Answer helpfully and naturally, 
referring to the placeholders by name when needed (e.g. "I can see [NAME_01] has..."). 
Do not mention or explain the placeholders to the user.`;

async function streamFromOpenAI(
  anonymizedText: string,
  vault: Record<string, string>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: anonymizedText },
    ],
    stream: true,
    max_tokens: 500,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const char = chunk.choices[0]?.delta?.content || "";
    if (char) {
      fullResponse += char;
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "token", char })}\n\n`)
      );
    }
  }

  const rehydrated = rehydrate(fullResponse, vault);
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: "rehydrated", text: rehydrated })}\n\n`)
  );
}

// ─── Simulated fallback (no API key) ─────────────────────────────────────────

const RESPONSE_TEMPLATES: Record<string, (tokens: Record<string, string[]>) => string> = {
  medical: (t) =>
    `Based on the medical records for ${t.NAME?.[0] || "the patient"}, I can see the following:\n\n` +
    `The patient (DOB: ${t.DOB?.[0] || "on file"}) has been diagnosed and a treatment plan is in place. ` +
    `I recommend scheduling a follow-up at the address ${t.ADDRESS?.[0] || "on file"}.\n\n` +
    `Please note: all communications should be sent to ${t.EMAIL?.[0] || "the email on file"} ` +
    `or by phone at ${t.PHONE?.[0] || "the number on file"}.\n\n` +
    `The insurance (${t.ID?.[0] || "ID on file"}) covers this treatment plan. ` +
    `Billing will be processed to account ${t.IBAN?.[0] || "on file"}.`,
  financial: (t) =>
    `I've reviewed the tax documentation for ${t.NAME?.[0] || "the taxpayer"}.\n\n` +
    `Key findings:\n` +
    `- Tax ID: ${t.TAX_ID?.[0] || t.SSN?.[0] || "on file"}\n` +
    `- The return filed from ${t.ADDRESS?.[0] || "the registered address"} appears complete.\n` +
    `- Payments should be directed to ${t.IBAN?.[0] || "the bank account on file"}.\n\n` +
    `I recommend contacting ${t.EMAIL?.[0] || "the email on file"} for any discrepancies.`,
  general: (t) =>
    `I've analyzed the document for ${t.NAME?.[0] || "the individual"}.\n\n` +
    `The document contains references to:\n` +
    (t.EMAIL ? `- Contact email: ${t.EMAIL[0]}\n` : "") +
    (t.PHONE ? `- Phone: ${t.PHONE[0]}\n` : "") +
    (t.ADDRESS ? `- Address: ${t.ADDRESS[0]}\n` : "") +
    (t.IBAN ? `- Bank account: ${t.IBAN[0]}\n` : "") +
    (t.SSN || t.AHV ? `- ID number: ${(t.SSN || t.AHV)?.[0]}\n` : "") +
    `\nAll information has been processed securely.`,
};

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("patient") || lower.includes("diagnosis") || lower.includes("treatment") || lower.includes("hospital"))
    return "medical";
  if (lower.includes("tax") || lower.includes("income") || lower.includes("steuer"))
    return "financial";
  return "general";
}

async function streamSimulated(
  piiResult: ReturnType<typeof detectPII>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const tokensByType: Record<string, string[]> = {};
  for (const m of piiResult.matches) {
    if (!tokensByType[m.type]) tokensByType[m.type] = [];
    tokensByType[m.type].push(m.token);
  }

  const category = detectCategory(piiResult.anonymized);
  const templateFn = RESPONSE_TEMPLATES[category] || RESPONSE_TEMPLATES.general;
  const aiResponseWithTokens = templateFn(tokensByType);
  const aiResponseRehydrated = rehydrate(aiResponseWithTokens, piiResult.vault);

  await new Promise((r) => setTimeout(r, 400));

  for (let i = 0; i < aiResponseWithTokens.length; i++) {
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: "token", char: aiResponseWithTokens[i] })}\n\n`)
    );
    await new Promise((r) => setTimeout(r, 12));
  }

  await new Promise((r) => setTimeout(r, 300));
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: "rehydrated", text: aiResponseRehydrated })}\n\n`)
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 10 requests per hour." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { text } = await req.json();
  if (!text) return new Response("text required", { status: 400 });

  const piiResult = detectPII(text);
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Always send the anonymized result first
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "anonymized",
            text: piiResult.anonymized,
            threatScore: piiResult.threatScore,
            matches: piiResult.matches.length,
            powered_by: hasApiKey ? "gpt-4o-mini" : "simulated",
          })}\n\n`
        )
      );

      try {
        if (hasApiKey) {
          await streamFromOpenAI(piiResult.anonymized, piiResult.vault, controller, encoder);
        } else {
          await streamSimulated(piiResult, controller, encoder);
        }
      } catch (err) {
        // If real AI fails, fall back to simulation silently
        console.error("OpenAI error, falling back to simulation:", err);
        await streamSimulated(piiResult, controller, encoder);
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
