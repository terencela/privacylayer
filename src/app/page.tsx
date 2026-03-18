"use client";

import { useState } from "react";
import Link from "next/link";

const STATS = [
  { value: "50+", label: "DATA TYPES DETECTED" },
  { value: "AES-256", label: "VAULT ENCRYPTION" },
  { value: "0 bytes", label: "SENT TO ANY SERVER" },
  { value: "6", label: "COMPLIANCE FRAMEWORKS" },
];

const FLOW_STEPS = [
  { title: "Your Document", sub: "PDF, image, or text" },
  { title: "Privacy Scanner", sub: "names, addresses, IDs" },
  { title: "Token Vault", sub: "AES-256 encrypted" },
  { title: "Clean Document", sub: "zero personal data" },
  { title: "AI Model", sub: "Claude / Gemini / GPT", muted: true },
  { title: "Restored Output", sub: "real values back" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Upload",
    desc: "Drop in a PDF, snap a photo of a letter, or paste text. Your document enters the privacy layer right here in your browser -- it never touches any server.",
  },
  {
    step: "02",
    title: "Detect",
    desc: "50+ detection patterns scan your document in parallel. Names, emails, Swiss AHV numbers, IBANs, phone numbers, addresses, dates of birth, insurance IDs -- if it can identify someone, we catch it.",
  },
  {
    step: "03",
    title: "Replace",
    desc: "Every personal detail is swapped with a safe placeholder -- [NAME_01], [EMAIL_01], etc. The mapping between placeholders and real values is locked in an AES-256 encrypted vault that only you hold the key to.",
  },
  {
    step: "04",
    title: "Share safely",
    desc: "The cleaned document is safe to send to any AI model, any colleague, any service. Nobody sees real names, real numbers, real addresses. Zero personal data leaves your device.",
  },
  {
    step: "05",
    title: "Restore",
    desc: "When the AI responds using placeholders, we swap the real values back in. You read a natural response with real names and real details. The AI never knew them.",
  },
  {
    step: "06",
    title: "Audit trail",
    desc: "Every scan and redaction is logged locally -- what was found, what category, what risk level. Ready for GDPR, HIPAA, and SOC 2 compliance reviews.",
  },
];

const PII_CATEGORIES = [
  { entity: "Full name", token: "[NAME_01]", example: "Dr. Maria Bernasconi" },
  { entity: "Email address", token: "[EMAIL_01]", example: "maria@bluewin.ch" },
  { entity: "Phone number", token: "[PHONE_01]", example: "+41 79 345 67 89" },
  { entity: "Social security / AHV", token: "[SSN_01]", example: "756.1234.5678.97" },
  { entity: "Bank account / IBAN", token: "[IBAN_01]", example: "CH93 0076 2011 ..." },
  { entity: "Home address", token: "[ADDRESS_01]", example: "Bahnhofstrasse 42" },
  { entity: "Date of birth", token: "[DOB_01]", example: "15.03.1987" },
  { entity: "Credit card", token: "[CREDIT_CARD_01]", example: "4532 1234 ****" },
  { entity: "Passport / ID number", token: "[PASSPORT_01]", example: "X12345678" },
  { entity: "Insurance / Patient ID", token: "[ID_01]", example: "SWICA-2024-88421" },
  { entity: "IP address", token: "[IP_01]", example: "192.168.1.42" },
  { entity: "Tax ID / EIN", token: "[TAX_ID_01]", example: "ZH-2025-449812" },
];

const COMPLIANCE = ["GDPR", "HIPAA", "CCPA", "SOC 2 Type II", "ISO 27001", "PCI-DSS"];

const CODE_EXAMPLE = `import { wrapLanguageModel } from "ai";
import { privacyLayer } from "privacylayer";

// Before -- personal data goes straight to the model
streamText({ model, messages });

// After -- one line. Zero personal data leaves your app.
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
            <span className="text-xs text-[var(--text-muted)] ml-1">/ your data stays yours</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#architecture" className="text-xs text-[var(--text-muted)] hover:text-white transition-colors px-3 py-1.5 border border-[var(--border)] rounded-md">
              Architecture
            </Link>
            <Link href="/playground/chat" className="text-xs text-[var(--text-muted)] hover:text-white transition-colors px-3 py-1.5 border border-[var(--border)] rounded-md">
              AI Chat Demo
            </Link>
            <Link href="/playground" className="text-xs bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-gray-200 transition-colors">
              Try It Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-6">
            Privacy infrastructure for the AI era
          </p>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] mb-6">
            Your AI doesn&apos;t need<br />
            to know your name.
          </h1>
          <p className="text-lg text-[var(--text-muted)] max-w-xl mb-4 leading-relaxed">
            Every time you paste a document into an AI, your personal data -- names, addresses, bank details, health records -- leaves your device forever.
          </p>
          <p className="text-lg text-white max-w-xl mb-10 leading-relaxed font-medium">
            PrivacyLayer strips all personal information before it reaches any AI model. Everything runs in your browser. Nothing is sent to our servers. Nothing.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/playground"
              className="bg-white text-black px-6 py-3 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Try the playground
            </Link>
            <Link
              href="/playground/chat"
              className="border border-white/20 px-6 py-3 rounded-lg text-sm hover:border-white/40 transition-colors"
            >
              See AI chat demo
            </Link>
            <Link
              href="#architecture"
              className="border border-[var(--border)] px-6 py-3 rounded-lg text-sm hover:border-[var(--border-accent)] transition-colors text-[var(--text-muted)]"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[var(--bg-card)] border border-[var(--accent)]/20 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">How can you be sure your data stays private?</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  All scanning, redaction, and encryption happens in JavaScript running in your browser tab. Open your browser&apos;s Network tab -- you will see zero outgoing requests with personal data. There is no backend that processes your documents. The source code is fully open on GitHub. This is not a promise -- it is a technical guarantee you can verify yourself.
                </p>
              </div>
            </div>
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

      {/* The Problem */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-8">
            The problem
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[var(--bg-card)] border border-[var(--danger)]/20 rounded-lg p-6">
              <p className="text-sm font-semibold text-[var(--danger)] mb-3">Without PrivacyLayer</p>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
                You paste a hospital invoice into ChatGPT. Your name, your diagnosis, your insurance number, your home address -- all of it travels to a server in the US. Stored. Logged. Potentially used for training. Gone.
              </p>
              <div className="mono text-xs text-[var(--text-muted)] bg-[var(--bg)] p-3 rounded border border-[var(--border)]">
                <span className="text-[var(--danger)]">Patient: Dr. Maria Bernasconi</span><br />
                <span className="text-[var(--danger)]">AHV: 756.1234.5678.97</span><br />
                <span className="text-[var(--danger)]">IBAN: CH93 0076 2011 6238 5295 7</span><br />
                <span className="text-[var(--text-muted)] opacity-50">→ sent to AI provider servers</span>
              </div>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--accent)]/20 rounded-lg p-6">
              <p className="text-sm font-semibold text-[var(--accent)] mb-3">With PrivacyLayer</p>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
                The same invoice. But the AI only sees placeholders. It still gives you a useful answer -- and we swap the real values back in afterward. The AI never knew your name.
              </p>
              <div className="mono text-xs text-[var(--text-muted)] bg-[var(--bg)] p-3 rounded border border-[var(--border)]">
                <span className="text-[var(--accent)]">Patient: [NAME_01]</span><br />
                <span className="text-[var(--accent)]">AHV: [AHV_01]</span><br />
                <span className="text-[var(--accent)]">IBAN: [IBAN_01]</span><br />
                <span className="text-[var(--accent)]">→ AI responds → real values restored</span>
              </div>
            </div>
          </div>
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
            The AI model (greyed out) only ever sees anonymized text. It works inside the same pipeline as any other tool -- but it never touches real personal data.
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

      {/* What We Detect */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-8">
            What we detect and protect
          </p>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 px-6 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-semibold tracking-wider">PERSONAL DATA TYPE</span>
              <span className="text-xs font-semibold tracking-wider">REPLACED WITH</span>
              <span className="text-xs font-semibold tracking-wider text-right">EXAMPLE</span>
            </div>
            {PII_CATEGORIES.map((cat) => (
              <div key={cat.entity} className="grid grid-cols-3 px-6 py-4 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                <span className="text-sm font-medium">{cat.entity}</span>
                <span className="mono text-sm text-[var(--accent)]">{cat.token}</span>
                <span className="mono text-sm text-[var(--text-muted)] text-right">{cat.example}</span>
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
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-4">
            For developers
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            If you build AI-powered apps, PrivacyLayer drops into your existing code in one line. No refactoring. No new APIs to learn.
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
                        isHighlight ? "text-[var(--accent)] font-semibold" : ""
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

      {/* Why This Matters */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <p className="mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-8">
            Why this matters now
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-sm">Too many AI models</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Claude, GPT, Gemini, Mistral, Llama -- new models launch every week. You want to test them all. But every model means another company seeing your data. PrivacyLayer lets you try any model safely.
              </p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-sm">Data sovereignty matters</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                European companies and citizens need to use AI -- but can we trust US-based providers with our health records, financial data, and personal information? PrivacyLayer means you don&apos;t have to trust anyone.
              </p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-sm">Layers of privacy risk</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Some data is obvious -- names and SSNs. But what about &quot;my brother lives in Zurich&quot; or &quot;I take insulin daily&quot;? We detect both explicit identifiers and contextual personal information that can identify someone indirectly.
              </p>
            </div>
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
            100% client-side. Open source. Your data never leaves your browser.
          </p>
        </div>
      </footer>
    </div>
  );
}
