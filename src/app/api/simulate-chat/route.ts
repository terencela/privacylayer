import { NextRequest } from "next/server";
import { detectPII, rehydrate } from "@/lib/pii-engine";

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

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) {
    return new Response("text required", { status: 400 });
  }

  const piiResult = detectPII(text);
  const category = detectCategory(text);

  const tokensByType: Record<string, string[]> = {};
  for (const m of piiResult.matches) {
    if (!tokensByType[m.type]) tokensByType[m.type] = [];
    tokensByType[m.type].push(m.token);
  }

  const templateFn = RESPONSE_TEMPLATES[category] || RESPONSE_TEMPLATES.general;
  const aiResponseWithTokens = templateFn(tokensByType);
  const aiResponseRehydrated = rehydrate(aiResponseWithTokens, piiResult.vault);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "anonymized", text: piiResult.anonymized, threatScore: piiResult.threatScore, matches: piiResult.matches.length })}\n\n`)
      );

      await new Promise((r) => setTimeout(r, 500));

      for (let i = 0; i < aiResponseWithTokens.length; i++) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "token", char: aiResponseWithTokens[i] })}\n\n`)
        );
        await new Promise((r) => setTimeout(r, 15));
      }

      await new Promise((r) => setTimeout(r, 300));
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "rehydrated", text: aiResponseRehydrated })}\n\n`)
      );

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
