"use client";

import { useState } from "react";
import Link from "next/link";

const STATS = [
  { value: "50+", label: "Data types detected" },
  { value: "AES-256", label: "Vault encryption" },
  { value: "0 bytes", label: "Sent to any server" },
  { value: "6", label: "Compliance frameworks" },
];

const PIPELINE = [
  { label: "Your Document", sub: "PDF, image, or text", dim: false },
  { label: "Privacy Scanner", sub: "names, addresses, IDs", dim: false },
  { label: "Token Vault", sub: "AES-256 encrypted", dim: false },
  { label: "Clean Document", sub: "zero personal data", dim: false },
  { label: "AI Model", sub: "Claude / Gemini / GPT", dim: true },
  { label: "Restored Output", sub: "real values back", dim: false },
];

const STEPS = [
  {
    num: "01", title: "Upload",
    desc: "Drop in a PDF, snap a photo of a letter, or paste text. Your document enters the privacy layer right here in your browser — it never touches any server.",
  },
  {
    num: "02", title: "Detect",
    desc: "50+ detection patterns scan your document in parallel. Names, emails, Swiss AHV numbers, IBANs, phone numbers, addresses, dates of birth, insurance IDs — if it can identify someone, we catch it.",
  },
  {
    num: "03", title: "Replace",
    desc: "Every personal detail is swapped with a safe placeholder — [NAME_01], [EMAIL_01], etc. The mapping is locked in an AES-256 encrypted vault that only you hold the key to.",
  },
  {
    num: "04", title: "Share safely",
    desc: "The cleaned document is safe to send to any AI model, any colleague, any service. Nobody sees real names, real numbers, real addresses. Zero personal data leaves your device.",
  },
  {
    num: "05", title: "Restore",
    desc: "When the AI responds using placeholders, we swap the real values back in. You read a natural response with real names and real details. The AI never knew them.",
  },
  {
    num: "06", title: "Audit trail",
    desc: "Every scan and redaction is logged locally — what was found, what category, what risk level. Ready for GDPR, HIPAA, and SOC 2 compliance reviews.",
  },
];

const CATEGORIES = [
  ["Full name", "[NAME_01]", "Dr. Maria Bernasconi"],
  ["Email address", "[EMAIL_01]", "maria@bluewin.ch"],
  ["Phone number", "[PHONE_01]", "+41 79 345 67 89"],
  ["Social security / AHV", "[SSN_01]", "756.1234.5678.97"],
  ["Bank account / IBAN", "[IBAN_01]", "CH93 0076 2011 ..."],
  ["Home address", "[ADDRESS_01]", "Bahnhofstrasse 42"],
  ["Date of birth", "[DOB_01]", "15.03.1987"],
  ["Credit card", "[CREDIT_CARD_01]", "4532 1234 ****"],
  ["Passport / ID number", "[PASSPORT_01]", "X12345678"],
  ["Insurance / Patient ID", "[ID_01]", "SWICA-2024-88421"],
  ["IP address", "[IP_01]", "192.168.1.42"],
  ["Tax ID / EIN", "[TAX_ID_01]", "ZH-2025-449812"],
];



const CODE_EXAMPLE = `import { wrapLanguageModel } from "ai";
import { privacyLayer } from "privacylayer";

// Before — personal data goes straight to the model
streamText({ model, messages });

// After — one line. Zero personal data leaves your app.
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
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-5 h-12 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-semibold text-sm tracking-tight">PrivacyLayer</span>
            <span className="hidden sm:inline text-[11px] text-muted-foreground font-mono">
              / your data stays yours
            </span>
          </div>
          <nav className="flex items-center gap-0 border border-border">
            <Link href="#architecture" className="hidden sm:flex px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[36px] items-center tracking-wide border-r border-border">
              Architecture
            </Link>
            <Link href="/playground/chat" className="hidden sm:flex px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[36px] items-center tracking-wide border-r border-border">
              AI Chat Demo
            </Link>
            <Link href="/playground" className="px-4 py-2 text-xs font-medium bg-foreground text-background min-h-[36px] flex items-center tracking-wide">
              Playground
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-5">
        {/* Hero */}
        <div className="py-16 md:py-24 border-b border-border">
          <div className="space-y-5 max-w-3xl">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
              Privacy infrastructure for the AI era
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-balance">
              Your AI doesn&apos;t need<br />
              to know your name.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
              Every time you paste a document into an AI, your personal data — names, addresses, bank details,
              health records — leaves your device forever.
            </p>
            <p className="text-base text-foreground leading-relaxed max-w-xl font-medium">
              PrivacyLayer strips all personal information before it reaches any AI model.
              Everything runs in your browser. Nothing is sent to our servers. Nothing.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0 sm:border sm:border-border w-full sm:w-fit mt-6">
              <Link href="/playground" className="px-5 py-3 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-opacity min-h-[44px] flex items-center justify-center border border-border sm:border-0">
                Try the playground
              </Link>
              <Link href="/playground/chat" className="px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center justify-center border border-border sm:border-0 sm:border-l">
                AI chat demo
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-b border-border grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
          {STATS.map((s) => (
            <div key={s.label} className="px-6 py-5">
              <p className="text-xl font-bold tabular-nums">{s.value}</p>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5 uppercase tracking-wider">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Trust Banner */}
        <div className="py-10 border-b border-border">
          <div className="border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5 text-accent">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold mb-1">How can you be sure your data stays private?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All scanning, redaction, and encryption happens in JavaScript running in your browser tab.
                  Open your browser&apos;s Network tab — you will see zero outgoing requests with personal data.
                  There is no backend that processes your documents. The source code is fully open on GitHub.
                  This is not a promise — it is a technical guarantee you can verify yourself.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Before / After */}
        <div className="py-14 border-b border-border">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-8">
            The problem
          </p>
          <div className="grid md:grid-cols-2 gap-0 border border-border">
            <div className="p-6 border-b md:border-b-0 md:border-r border-border">
              <p className="text-xs font-semibold text-destructive mb-3">Without PrivacyLayer</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                You paste a hospital invoice into ChatGPT. Your name, your diagnosis, your insurance number,
                your home address — all of it travels to a server in the US. Stored. Logged. Gone.
              </p>
              <div className="font-mono text-xs text-muted-foreground bg-background p-3 border border-border">
                <span className="text-destructive">Patient: Dr. Maria Bernasconi</span><br />
                <span className="text-destructive">AHV: 756.1234.5678.97</span><br />
                <span className="text-destructive">IBAN: CH93 0076 2011 6238 5295 7</span><br />
                <span className="opacity-40">→ sent to AI provider servers</span>
              </div>
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold text-accent mb-3">With PrivacyLayer</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                The same invoice. But the AI only sees placeholders. It still gives you a useful answer --
                and we swap the real values back in afterward. The AI never knew your name.
              </p>
              <div className="font-mono text-xs text-muted-foreground bg-background p-3 border border-border">
                <span className="text-accent">Patient: [NAME_01]</span><br />
                <span className="text-accent">AHV: [AHV_01]</span><br />
                <span className="text-accent">IBAN: [IBAN_01]</span><br />
                <span className="text-accent">→ AI responds → real values restored</span>
              </div>
            </div>
          </div>
        </div>

        {/* Why This Matters */}
        <div className="py-14 border-b border-border">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-8">
            Why this matters now
          </p>
          <div className="grid md:grid-cols-3 gap-0 border border-border">
            <div className="p-6 border-b md:border-b-0 md:border-r border-border">
              <h3 className="text-sm font-semibold mb-2">Too many AI models</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Claude, GPT, Gemini, Mistral, Llama — new models launch every week. You want to test them all.
                But every model means another company seeing your data. PrivacyLayer lets you try any model safely.
              </p>
            </div>
            <div className="p-6 border-b md:border-b-0 md:border-r border-border">
              <h3 className="text-sm font-semibold mb-2">Data sovereignty matters</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                European companies and citizens need to use AI — but can we trust US-based providers with our
                health records, financial data, and personal information? PrivacyLayer means you don&apos;t have to trust anyone.
              </p>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-semibold mb-2">Layers of privacy risk</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Some data is obvious — names and SSNs. But what about &quot;my brother lives in Zurich&quot; or
                &quot;I take insulin daily&quot;? We detect both explicit identifiers and contextual personal information
                that can identify someone indirectly.
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div id="architecture" className="py-14 border-b border-border">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-6">
            Data flow
          </p>
          <div className="overflow-x-auto">
            <div className="flex items-stretch gap-0 min-w-max border border-border">
              {PIPELINE.map((node) => (
                <div
                  key={node.label}
                  className={`flex flex-col justify-center px-5 py-4 border-r border-border last:border-r-0 min-w-[130px] ${
                    node.dim ? "bg-muted/30" : "bg-card"
                  }`}
                >
                  <span className={`text-xs font-semibold leading-snug ${node.dim ? "text-muted-foreground" : ""}`}>
                    {node.label}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground mt-0.5">{node.sub}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 font-mono">
            The AI model (greyed) receives only anonymized text — it operates inside the same pipeline as any other vendor.
          </p>
        </div>

        {/* How it works */}
        <div className="py-14 border-b border-border">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-8">
            How it works
          </p>
          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`grid grid-cols-[3rem_1fr] gap-6 py-5 border-t border-border ${
                  i === STEPS.length - 1 ? "border-b" : ""
                }`}
              >
                <span className="font-mono text-[11px] text-muted-foreground pt-0.5">{step.num}</span>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="py-14 border-b border-border">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-6">
            What we detect and protect
          </p>
          <div className="border border-border">
            <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Personal data type</span>
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider text-right sm:w-36 sm:text-center">Token</span>
              <span className="hidden sm:block text-[11px] font-mono text-muted-foreground uppercase tracking-wider w-40 text-right">Example</span>
            </div>
            {CATEGORIES.map(([label, token, example], i) => (
              <div
                key={label}
                className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] px-4 py-3 ${
                  i < CATEGORIES.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="text-sm">{label}</span>
                <span className="font-mono text-xs text-muted-foreground text-right sm:w-36 sm:text-center">{token}</span>
                <span className="hidden sm:block font-mono text-xs text-muted-foreground w-40 text-right">{example}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance */}
        <div className="py-14 border-b border-border">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
            Compliance
          </p>
          <h2 className="text-2xl font-bold mb-4">Use any AI without violating HIPAA.</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-8">
            HIPAA&apos;s Safe Harbor method defines 18 specific identifiers that must be removed for health data to be legally de-identified.
            PrivacyLayer detects and strips all 18 — names, dates, phone numbers, emails, account numbers, IP addresses, and more —
            before your text reaches any AI model. What the AI sees is not Protected Health Information.
            You stay compliant. The AI stays useful.
          </p>
          <div className="grid sm:grid-cols-3 gap-0 border border-border mb-8">
            <div className="p-5 border-b sm:border-b-0 sm:border-r border-border">
              <p className="text-xs font-mono text-accent mb-2">HIPAA Safe Harbor</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All 18 HIPAA identifiers detected and replaced. De-identified output is not PHI and can be sent to any AI provider without violating HIPAA.
              </p>
            </div>
            <div className="p-5 border-b sm:border-b-0 sm:border-r border-border">
              <p className="text-xs font-mono text-accent mb-2">GDPR Article 4</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No personal data leaves your device. GDPR only governs personal data — anonymized data is out of scope. PrivacyLayer anonymizes before transmission.
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-mono text-accent mb-2">Swiss DSG / nDSG</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Built with Swiss data standards in mind. AHV numbers, CH-IBANs, and Swiss address formats are detected by default.
              </p>
            </div>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground">
            Also relevant for teams working under CCPA, SOC 2, ISO 27001, and PCI-DSS requirements.
          </p>
        </div>

        {/* SDK */}
        <div className="py-14 border-b border-border">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
            For developers
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            If you build AI-powered apps, PrivacyLayer drops into your existing code in one line.
          </p>
          <div className="border border-border bg-card overflow-x-auto">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
              <span className="text-[11px] font-mono text-muted-foreground">one-line integration</span>
              <button onClick={copyCode} className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="text-xs font-mono text-muted-foreground p-5 leading-relaxed overflow-x-auto">
              {CODE_EXAMPLE.split("\n").map((line, i) => {
                const isComment = line.trimStart().startsWith("//");
                const isHighlight = line.includes("wrapLanguageModel") || line.includes("privacyLayer()");
                return (
                  <div key={i} className={`${isHighlight ? "text-accent font-semibold" : ""} ${isComment ? "opacity-60" : ""}`}>
                    {line || "\u00A0"}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-5 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-muted-foreground">
            PrivacyLayer — open source
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            100% client-side. Your data never leaves your browser.
          </span>
        </div>
      </footer>
    </div>
  );
}
