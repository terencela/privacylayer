"use client";

import { useState } from "react";
import Link from "next/link";

const STATS = [
  { value: "50+", label: "PII TYPES DETECTED" },
  { value: "AES-256", label: "VAULT ENCRYPTION" },
  { value: "0 bytes", label: "SENT TO SERVER" },
  { value: "6", label: "COMPLIANCE FRAMEWORKS" },
];

const FLOW_STEPS = [
  { title: "User / App", sub: "raw document" },
  { title: "PII Scanner", sub: "NER + regex" },
  { title: "Token Vault", sub: "AES-256" },
  { title: "Anonymizer", sub: "zero PII out" },
  { title: "AI Model", sub: "Claude / Gemini / GPT", muted: true },
  { title: "De-tokenizer", sub: "values restored" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Ingest",
    desc: "User uploads a PDF, image, or pastes text. The document enters the compliance layer in your browser and never touches a server.",
  },
  {
    step: "02",
    title: "Detect",
    desc: "50+ regex patterns scan in parallel. Names, emails, SSNs, AHV numbers, IBANs, phone numbers, IP addresses, dates of birth, addresses.",
  },
  {
    step: "03",
    title: "Tokenize",
    desc: "Each PII span is swapped with a deterministic, reversible token — [NAME_01], [EMAIL_01], etc. The original-to-token mapping is sealed in an AES-256 encrypted vault per session.",
  },
  {
    step: "04",
    title: "Forward",
    desc: "Only the redacted document reaches the AI model. Zero real identifiers are transmitted to any third-party endpoint.",
  },
  {
    step: "05",
    title: "Re-hydrate",
    desc: "The AI response is scanned for tokens. Each token is substituted back with the original value from the vault before returning to the caller.",
  },
  {
    step: "06",
    title: "Audit",
    desc: "Every scan, redaction, and de-tokenization is logged — PII category counts, risk level, and session ID — for GDPR, HIPAA, and SOC 2 audit trails.",
  },
];

const PII_CATEGORIES = [
  { entity: "Full name", token: "[NAME_01]" },
  { entity: "Email address", token: "[EMAIL_01]" },
  { entity: "Phone number", token: "[PHONE_01]" },
  { entity: "SSN / NIN", token: "[SSN_01]" },
  { entity: "AHV / AVS (Swiss)", token: "[AHV_01]" },
  { entity: "IBAN / Credit card", token: "[IBAN_01]" },
  { entity: "Street address", token: "[ADDRESS_01]" },
  { entity: "IP address", token: "[IP_01]" },
  { entity: "Date of birth", token: "[DOB_01]" },
  { entity: "Tax ID / EIN", token: "[TAX_ID_01]" },
  { entity: "Passport / ID", token: "[PASSPORT_01]" },
  { entity: "Patient / Insurance ID", token: "[ID_01]" },
];

const COMPLIANCE = ["GDPR", "HIPAA", "CCPA", "SOC 2 Type II", "ISO 27001", "PCI-DSS"];

const CODE_EXAMPLE = `import { wrapLanguageModel } from "ai";
import { privacyLayer } from "privacylayer";

// Before — PII goes straight to the model
streamText({ model, messages });

// After — one line. Zero PII leaves your server.
streamText({
  model: wrapLanguageModel(model, privacyLayer()),
  messages,
});`;

export default function Home() {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(CODE_EXAMPLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <span className="font-bold text-sm">PrivacyLayer</span>
            <span className="text-xs text-[var(--text-muted)] ml-1">/ PII compliance for AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#architecture" className="text-xs text-[var(--text-muted)] hover:text-white transition-colors px-3 py-1.5 border border-[var(--border)] rounded-md">
              Architecture
            </Link>
            <Link href="/playground" className="text-xs bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-gray-200 transition-colors">
              Playground
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-6">
            Compliance infrastructure
          </p>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] mb-6">
            PII never reaches<br />
            <span className="gradient-text">your AI model.</span>
          </h1>
          <p className="text-lg text-[var(--text-muted)] max-w-xl mb-10 leading-relaxed">
            A client-side middleware that detects, tokenizes, and vaults personally identifiable
            information from any document — before it reaches Claude, Gemini, or GPT.
            All processing happens in your browser. Zero data leaves your device.
          </p>
          <div className="flex gap-4">
            <Link
              href="/playground"
              className="bg-white text-black px-6 py-3 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Try the playground
            </Link>
            <Link
              href="#architecture"
              className="border border-[var(--border)] px-6 py-3 rounded-lg text-sm hover:border-[var(--border-accent)] transition-colors"
            >
              See architecture
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
              <p className="text-2xl font-bold mb-1">{s.value}</p>
              <p className="mono text-xs text-[var(--text-muted)] tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data Flow */}
      <section id="architecture" className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-8">
            Data flow
          </p>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 overflow-x-auto">
            <div className="flex items-center gap-3 min-w-max">
              {FLOW_STEPS.map((step, i) => (
                <div key={step.title} className="flex items-center gap-3">
                  <div
                    className={`px-4 py-3 rounded-lg border min-w-[130px] ${
                      step.muted
                        ? "border-[var(--border)] bg-[var(--bg)] opacity-50"
                        : "border-[var(--border-accent)] bg-[var(--bg)]"
                    }`}
                  >
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{step.sub}</p>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3">
            The AI model (greyed) receives only anonymized text — it operates inside the same pipeline as any other vendor.
          </p>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-10">
            How it works
          </p>
          <div className="space-y-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-8">
                <span className="text-2xl font-bold text-[var(--accent)] mt-1 shrink-0 w-10">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PII Categories */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-8">
            PII categories detected
          </p>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 px-6 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold tracking-wider">ENTITY TYPE</span>
              <span className="text-xs font-semibold tracking-wider text-right">TOKEN FORMAT</span>
            </div>
            {PII_CATEGORIES.map((cat) => (
              <div key={cat.entity} className="grid grid-cols-2 px-6 py-4 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                <span className="text-sm font-medium">{cat.entity}</span>
                <span className="mono text-sm text-[var(--text-muted)] text-right">{cat.token}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-8">
            Compliance coverage
          </p>
          <div className="flex flex-wrap gap-3">
            {COMPLIANCE.map((c) => (
              <span key={c} className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-md">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* SDK Integration */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-8">
            SDK integration
          </p>
          <div className="code-block relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <span className="mono text-xs text-[var(--text-muted)]">one-line integration</span>
              <button
                onClick={copyCode}
                className="text-xs text-[var(--text-muted)] hover:text-white transition-colors px-2 py-1 rounded border border-[var(--border)]"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto">
              <code className="mono text-sm leading-relaxed">
                {CODE_EXAMPLE.split("\n").map((line, i) => {
                  const isComment = line.trimStart().startsWith("//");
                  const isHighlight = line.includes("wrapLanguageModel") || line.includes("privacyLayer()");
                  return (
                    <div
                      key={i}
                      className={`${isComment ? "text-[var(--text-muted)]" : ""} ${
                        isHighlight ? "text-[var(--accent)] font-semibold bg-[var(--accent)]/5 -mx-4 px-4" : ""
                      }`}
                    >
                      {line || "\u00A0"}
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[var(--accent)]" />
            <span className="text-sm font-semibold">PrivacyLayer</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            All PII processing happens client-side. Zero data leaves your browser.
          </p>
        </div>
      </footer>
    </div>
  );
}
