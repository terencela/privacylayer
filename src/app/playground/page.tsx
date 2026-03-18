"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { detectPII, rehydrate, encryptVault, THREAT_DESCRIPTIONS } from "@/lib/pii-engine";
import type { PIIResult } from "@/lib/pii-engine";

const SAMPLE_TEXTS = {
  medical: `Patient: Dr. Maria Bernasconi
Date of Birth: 15.03.1987
AHV-Nr: 756.1234.5678.97
Address: Bahnhofstrasse 42, 8001 Zürich

Diagnosis: Type 2 Diabetes Mellitus
Insurance ID: SWICA-2024-88421
Email: maria.bernasconi@bluewin.ch
Phone: +41 79 345 67 89

Treatment plan includes Metformin 500mg twice daily.
Follow-up appointment scheduled for 22.04.2026.
Invoice sent to IBAN CH93 0076 2011 6238 5295 7.`,
  financial: `Tax Return — 2025
Name: Herr Stefan Keller
SSN: 756.9876.5432.10
Address: Langstrasse 15, 8004 Zürich

Gross Income: CHF 142,000
Tax ID: ZH-2025-449812
Email: s.keller@gmail.com
Phone: 044 567 89 01
Credit Card: 4532 1234 5678 9012

Bank: UBS AG
IBAN: CH56 0483 5012 3456 7800 9
IP Address: 192.168.1.42`,
  insurance: `Versicherungspolice Nr. VP-2026-33810
Versicherte: Frau Anna Müller-Weber
Geburtsdatum: 28.11.1965
AHV: 756.4455.6677.88
Adresse: Bundesplatz 3, 3011 Bern

Passport No: X12345678
Email: anna.mueller@sunrise.ch
Telefon: +41 31 456 78 90
Patient-ID: KSPB-2026-00142

Deckungssumme: CHF 500,000
IBAN: CH12 0900 0000 1234 5678 9`,
};

type TabKey = "text" | "pdf" | "image";

export default function Playground() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<PIIResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("text");
  const [processing, setProcessing] = useState(false);
  const [showThreat, setShowThreat] = useState(false);
  const [vaultKey, setVaultKey] = useState<string | null>(null);
  const [rehydratedText, setRehydratedText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setProcessing(true);
    setRehydratedText(null);
    setVaultKey(null);
    setShowThreat(false);

    await new Promise((r) => setTimeout(r, 400));
    const piiResult = detectPII(text);
    setResult(piiResult);

    await new Promise((r) => setTimeout(r, 300));
    setShowThreat(true);

    if (Object.keys(piiResult.vault).length > 0) {
      const sessionPassword = crypto.randomUUID();
      const encrypted = await encryptVault(piiResult.vault, sessionPassword);
      setVaultKey(encrypted);
    }

    setProcessing(false);
  }, []);

  const handleRehydrate = useCallback(() => {
    if (!result) return;
    const restored = rehydrate(result.anonymized, result.vault);
    setRehydratedText(restored);
  }, [result]);

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: unknown) => {
          const t = item as Record<string, unknown>;
          return typeof t.str === "string" ? t.str : "";
        }).join(" ");
        fullText += strings + "\n\n";
      }
      setInputText(fullText);
      await handleScan(fullText);
    } catch {
      setInputText("Error reading PDF. Please try a text-based PDF.");
      setProcessing(false);
    }
  }, [handleScan]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const Tesseract = await import("tesseract.js");
      const { data: { text } } = await Tesseract.recognize(file, "eng+deu+fra", {});
      setInputText(text);
      await handleScan(text);
    } catch {
      setInputText("Error processing image. Please try again.");
      setProcessing(false);
    }
  }, [handleScan]);

  const downloadRedacted = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.anonymized], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redacted-document.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const downloadVaultKey = useCallback(() => {
    if (!vaultKey) return;
    const blob = new Blob([vaultKey], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privacylayer-vault-key.enc";
    a.click();
    URL.revokeObjectURL(url);
  }, [vaultKey]);

  const threatColor =
    !result ? "var(--text-muted)" :
    result.threatScore >= 70 ? "var(--danger)" :
    result.threatScore >= 40 ? "var(--warning)" :
    result.threatScore > 0 ? "var(--info)" :
    "var(--accent)";

  const threatLabel =
    !result ? "" :
    result.threatScore >= 70 ? "CRITICAL" :
    result.threatScore >= 40 ? "HIGH" :
    result.threatScore > 0 ? "MODERATE" :
    "CLEAN";

  const threats: string[] = [];
  if (result) {
    const maxRisk = result.riskBreakdown.reduce((max, r) => {
      const order = ["critical", "high", "medium", "low"];
      return order.indexOf(r.risk) < order.indexOf(max) ? r.risk : max;
    }, "low");
    const descs = THREAT_DESCRIPTIONS[maxRisk] || THREAT_DESCRIPTIONS.medium || [];
    threats.push(...descs.slice(0, 3));
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <span className="font-bold text-sm">PrivacyLayer</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-white transition-colors px-3 py-1.5 border border-[var(--border)] rounded-md">
              Architecture
            </Link>
            <span className="text-xs bg-white text-black px-3 py-1.5 rounded-md font-medium">
              Playground
            </span>
          </div>
        </div>
      </nav>

      <div className="pt-24 px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Privacy Playground</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Upload a PDF, scan an image, or paste text. All processing happens locally in your browser.
            </p>
          </div>

          {/* Input Tabs */}
          <div className="flex gap-2 mb-6">
            {([["text", "Paste Text"], ["pdf", "Upload PDF"], ["image", "Scan Image"]] as [TabKey, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === key
                      ? "bg-white text-black"
                      : "border border-[var(--border)] text-[var(--text-muted)] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input */}
            <div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    {activeTab === "text" ? "INPUT DOCUMENT" : activeTab === "pdf" ? "PDF UPLOAD" : "IMAGE / SCAN"}
                  </span>
                  {activeTab === "text" && (
                    <div className="flex gap-2">
                      {Object.keys(SAMPLE_TEXTS).map((key) => (
                        <button
                          key={key}
                          onClick={() => setInputText(SAMPLE_TEXTS[key as keyof typeof SAMPLE_TEXTS])}
                          className="text-xs text-[var(--accent)] hover:underline capitalize"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {activeTab === "text" && (
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste a document containing personal information..."
                    className="w-full h-80 bg-transparent p-4 text-sm mono leading-relaxed resize-none focus:outline-none placeholder:text-[var(--text-muted)]/50"
                  />
                )}
                {activeTab === "pdf" && (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-white text-black rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                      >
                        Choose PDF File
                      </button>
                      <p className="text-xs text-[var(--text-muted)] mt-3">
                        Text is extracted client-side. Nothing leaves your browser.
                      </p>
                      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                    </div>
                  </div>
                )}
                {activeTab === "image" && (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <button
                        onClick={() => imgInputRef.current?.click()}
                        className="px-6 py-3 bg-white text-black rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                      >
                        Choose Image / Scan
                      </button>
                      <p className="text-xs text-[var(--text-muted)] mt-3">
                        OCR via Tesseract.js — runs entirely in your browser.
                      </p>
                      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>
                  </div>
                )}
              </div>

              {activeTab === "text" && (
                <button
                  onClick={() => handleScan(inputText)}
                  disabled={processing || !inputText.trim()}
                  className="mt-4 w-full py-3 bg-[var(--accent)] text-black font-semibold rounded-lg text-sm hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {processing ? "Scanning..." : "Scan for PII"}
                </button>
              )}
            </div>

            {/* Right: Output */}
            <div className="space-y-6">
              {/* Threat Score */}
              {result && showThreat && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">PRIVACY THREAT SCORE</span>
                    <span className="mono text-sm font-bold" style={{ color: threatColor }}>
                      {threatLabel}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[var(--bg)] rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full threat-gauge"
                      style={{
                        width: `${result.threatScore}%`,
                        background: threatColor,
                        animation: "threat-fill 1s ease-out",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm">
                      <span className="font-bold text-xl">{result.matches.length}</span>{" "}
                      <span className="text-[var(--text-muted)]">PII items detected across</span>{" "}
                      <span className="font-bold">{result.riskBreakdown.length}</span>{" "}
                      <span className="text-[var(--text-muted)]">categories</span>
                    </span>
                  </div>
                  {result.threatScore >= 40 && threats.length > 0 && (
                    <div className="border-t border-[var(--border)] pt-4">
                      <p className="text-xs text-[var(--text-muted)] mb-2">With this data, an attacker could:</p>
                      <ul className="space-y-1">
                        {threats.map((t) => (
                          <li key={t} className="text-sm text-[var(--danger)] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[var(--danger)] rounded-full shrink-0" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Risk Breakdown */}
                  <div className="border-t border-[var(--border)] pt-4 mt-4">
                    <div className="flex flex-wrap gap-2">
                      {result.riskBreakdown.map((r) => (
                        <span
                          key={r.category}
                          className="mono text-xs px-2 py-1 rounded border"
                          style={{
                            borderColor:
                              r.risk === "critical" ? "var(--danger)" :
                              r.risk === "high" ? "var(--warning)" :
                              "var(--border)",
                            color:
                              r.risk === "critical" ? "var(--danger)" :
                              r.risk === "high" ? "var(--warning)" :
                              "var(--text-muted)",
                          }}
                        >
                          {r.category} x{r.count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Anonymized Output */}
              {result && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      {rehydratedText ? "RE-HYDRATED OUTPUT" : "ANONYMIZED OUTPUT"}
                    </span>
                    <div className="flex gap-2">
                      {!rehydratedText && (
                        <button
                          onClick={handleRehydrate}
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          Re-hydrate
                        </button>
                      )}
                      <button onClick={downloadRedacted} className="text-xs text-[var(--text-muted)] hover:text-white">
                        Download
                      </button>
                    </div>
                  </div>
                  <div className="p-4 h-64 overflow-y-auto">
                    <pre className="mono text-sm leading-relaxed whitespace-pre-wrap">
                      {(rehydratedText || result.anonymized).split(/(\[[A-Z_]+_\d{2}\])/).map((part, i) => {
                        if (/^\[[A-Z_]+_\d{2}\]$/.test(part)) {
                          return (
                            <span key={i} className="bg-[var(--accent)]/20 text-[var(--accent)] px-1 rounded font-semibold">
                              {part}
                            </span>
                          );
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </pre>
                  </div>
                </div>
              )}

              {/* Vault Key */}
              {vaultKey && (
                <div className="bg-[var(--bg-card)] border border-[var(--accent)]/30 rounded-lg p-4 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[var(--accent)]">ENCRYPTED VAULT KEY</span>
                    <button
                      onClick={downloadVaultKey}
                      className="text-xs bg-[var(--accent)] text-black px-3 py-1 rounded font-medium hover:bg-[var(--accent-muted)] transition-colors"
                    >
                      Download .enc Key
                    </button>
                  </div>
                  <p className="mono text-xs text-[var(--text-muted)] break-all line-clamp-2">
                    {vaultKey.slice(0, 120)}...
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    This key restores all redacted values. Store it securely — it never leaves your browser.
                  </p>
                </div>
              )}

              {/* Token Mapping Table */}
              {result && result.matches.length > 0 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">TOKEN MAPPING</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {result.matches.map((m, i) => (
                      <div key={i} className="grid grid-cols-3 px-4 py-2 border-b border-[var(--border)] last:border-0 text-xs">
                        <span className="mono text-[var(--accent)]">{m.token}</span>
                        <span className="text-[var(--text-muted)]">{m.type}</span>
                        <span className="mono text-right truncate" title={m.value}>
                          {m.value.slice(0, 2)}{"*".repeat(Math.max(0, m.value.length - 4))}{m.value.slice(-2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
