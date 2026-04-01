"use client";

// Generative AI risk summary using LaMini-Flan-T5-77M
// 77MB model, runs in browser via WebAssembly, no server.
// Takes detected PII categories + counts, generates a human-readable risk narrative.
// This is the "effective use of generative AI" component.

let generatorInstance: ((prompt: string, options: Record<string, unknown>) => Promise<Array<{ generated_text: string }>>) | null = null;
let genLoadPromise: Promise<void> | null = null;

export type SummaryStatus =
  | { state: "idle" }
  | { state: "loading"; message: string }
  | { state: "ready" }
  | { state: "error"; message: string };

type SummaryProgressCallback = (status: SummaryStatus) => void;

export async function loadSummaryModel(onProgress?: SummaryProgressCallback): Promise<void> {
  if (generatorInstance) return;
  if (genLoadPromise) return genLoadPromise;

  genLoadPromise = (async () => {
    try {
      onProgress?.({ state: "loading", message: "Loading generative model (~77MB)..." });

      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      const gen = await pipeline("text2text-generation", "Xenova/LaMini-Flan-T5-77M", {
        progress_callback: (p: { status: string; progress?: number }) => {
          if (p.status === "downloading" || p.status === "progress") {
            onProgress?.({ state: "loading", message: `Downloading generative model... ${Math.round(p.progress ?? 0)}%` });
          }
        },
      });

      generatorInstance = gen as unknown as typeof generatorInstance;
      onProgress?.({ state: "ready" });
    } catch (err) {
      genLoadPromise = null;
      onProgress?.({ state: "error", message: "Could not load generative model" });
      throw err;
    }
  })();

  return genLoadPromise;
}

export interface RiskInput {
  counts: Record<string, number>;
  threatScore: number;
}

export async function generateRiskSummary(input: RiskInput): Promise<string> {
  const { counts, threatScore } = input;

  // Build a plain-language description for the model
  const parts: string[] = [];
  if (counts["NAME"]) parts.push(`${counts["NAME"]} person name${counts["NAME"] > 1 ? "s" : ""}`);
  if (counts["EMAIL"]) parts.push(`${counts["EMAIL"]} email address${counts["EMAIL"] > 1 ? "es" : ""}`);
  if (counts["PHONE"]) parts.push(`${counts["PHONE"]} phone number${counts["PHONE"] > 1 ? "s" : ""}`);
  if (counts["IBAN"]) parts.push(`${counts["IBAN"]} bank account number${counts["IBAN"] > 1 ? "s" : ""}`);
  if (counts["AHV"]) parts.push(`${counts["AHV"]} Swiss national ID number${counts["AHV"] > 1 ? "s" : ""}`);
  if (counts["DOB"]) parts.push(`${counts["DOB"]} date${counts["DOB"] > 1 ? "s" : ""} of birth`);
  if (counts["ADDRESS"]) parts.push(`${counts["ADDRESS"]} home address${counts["ADDRESS"] > 1 ? "es" : ""}`);
  if (counts["PASSPORT"]) parts.push(`${counts["PASSPORT"]} passport number${counts["PASSPORT"] > 1 ? "s" : ""}`);
  if (counts["CREDIT_CARD"]) parts.push(`${counts["CREDIT_CARD"]} credit card number${counts["CREDIT_CARD"] > 1 ? "s" : ""}`);

  if (parts.length === 0) return "No personal data detected in this document.";

  const detected = parts.join(", ");
  const severity = threatScore >= 75 ? "critical" : threatScore >= 40 ? "high" : "moderate";

  if (!generatorInstance) {
    // Fallback if generative model not loaded: deterministic template
    return fallbackSummary(detected, severity, counts, threatScore);
  }

  const prompt = `Explain the privacy risk: This document contains ${detected}. Risk level is ${severity} with a score of ${threatScore}/100. What could an attacker do with this information? Answer in 2 sentences.`;

  try {
    const result = await generatorInstance(prompt, {
      max_new_tokens: 80,
      temperature: 0.3,
    });
    const text = result?.[0]?.generated_text?.trim();
    if (text && text.length > 20) return text;
    return fallbackSummary(detected, severity, counts, threatScore);
  } catch {
    return fallbackSummary(detected, severity, counts, threatScore);
  }
}

function fallbackSummary(
  detected: string,
  severity: string,
  counts: Record<string, number>,
  threatScore: number
): string {
  const hasIdentity = counts["AHV"] || counts["PASSPORT"];
  const hasFinancial = counts["IBAN"] || counts["CREDIT_CARD"];
  const hasContact = counts["EMAIL"] || counts["PHONE"];

  let attack = "";
  if (hasIdentity && hasFinancial) {
    attack = "open bank accounts, file fraudulent tax returns, and commit full identity theft";
  } else if (hasIdentity) {
    attack = "impersonate this person with Swiss authorities and access government services";
  } else if (hasFinancial) {
    attack = "initiate unauthorized transactions and drain financial accounts";
  } else if (hasContact && counts["NAME"]) {
    attack = "launch targeted phishing attacks and social engineering campaigns";
  } else {
    attack = "build a detailed profile for targeted fraud or social engineering";
  }

  return `This document exposes ${detected} — a privacy threat score of ${threatScore}/100 (${severity}). Combined, this data is sufficient for an attacker to ${attack}.`;
}
