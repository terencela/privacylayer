"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { detectPII, rehydrate, encryptVault, decryptVault, THREAT_DESCRIPTIONS } from "@/lib/pii-engine";
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
  const [processingStatus, setProcessingStatus] = useState("");
  const [showThreat, setShowThreat] = useState(false);
  const [vaultKey, setVaultKey] = useState<string | null>(null);
  const [vaultPassword, setVaultPassword] = useState<string | null>(null);
  const [rehydratedText, setRehydratedText] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [aiResponseInput, setAiResponseInput] = useState("");
  const [showAiInput, setShowAiInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setProcessing(true);
    setRehydratedText(null);
    setVaultKey(null);
    setVaultPassword(null);
    setShowThreat(false);

    await new Promise((r) => setTimeout(r, 300));
    const piiResult = detectPII(text);
    setResult(piiResult);

    await new Promise((r) => setTimeout(r, 200));
    setShowThreat(true);

    if (Object.keys(piiResult.vault).length > 0) {
      const sessionPassword = crypto.randomUUID();
      setVaultPassword(sessionPassword);
      const encrypted = await encryptVault(piiResult.vault, sessionPassword);
      setVaultKey(encrypted);
    }

    setProcessing(false);
    setProcessingStatus("");
  }, []);

  const handleRehydrate = useCallback(() => {
    if (!result) return;
    const restored = rehydrate(result.anonymized, result.vault);
    setRehydratedText(restored);
  }, [result]);

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProcessing(true);
    setUploadedFiles([]);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      let allText = "";
      const fileNames: string[] = [];

      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        fileNames.push(file.name);
        setProcessingStatus(`Processing ${f + 1}/${files.length}: ${file.name}`);

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fileText = `--- ${file.name} ---\n`;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: unknown) => {
            const t = item as Record<string, unknown>;
            return typeof t.str === "string" ? t.str : "";
          }).join(" ");
          fileText += strings + "\n";
        }
        allText += fileText + "\n\n";
      }

      setUploadedFiles(fileNames);
      setInputText(allText);
      await handleScan(allText);
    } catch {
      setInputText("Error reading PDF(s). Please try text-based PDFs.");
      setProcessing(false);
      setProcessingStatus("");
    }
  }, [handleScan]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProcessing(true);
    setUploadedFiles([]);

    try {
      const Tesseract = await import("tesseract.js");
      let allText = "";
      const fileNames: string[] = [];

      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        fileNames.push(file.name);
        setProcessingStatus(`OCR ${f + 1}/${files.length}: ${file.name}`);
        const { data: { text } } = await Tesseract.recognize(file, "eng+deu+fra", {});
        allText += `--- ${file.name} ---\n${text}\n\n`;
      }

      setUploadedFiles(fileNames);
      setInputText(allText);
      await handleScan(allText);
    } catch {
      setInputText("Error processing image(s). Please try again.");
      setProcessing(false);
      setProcessingStatus("");
    }
  }, [handleScan]);

  const downloadRedactedPdf = useCallback(async () => {
    if (!result) return;
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Courier);
      const fontSize = 10;
      const margin = 50;
      const lineHeight = 14;

      const lines = result.anonymized.split("\n");
      let page = pdfDoc.addPage();
      let y = page.getHeight() - margin;

      for (const line of lines) {
        if (y < margin) {
          page = pdfDoc.addPage();
          y = page.getHeight() - margin;
        }

        const tokenRegex = /\[[A-Z_]+_\d{2}\]/g;
        let lastIndex = 0;
        let x = margin;
        let match;

        while ((match = tokenRegex.exec(line)) !== null) {
          const before = line.slice(lastIndex, match.index);
          if (before) {
            page.drawText(before, { x, y, size: fontSize, font, color: rgb(0.8, 0.8, 0.8) });
            x += font.widthOfTextAtSize(before, fontSize);
          }
          const token = match[0];
          page.drawRectangle({ x: x - 1, y: y - 3, width: font.widthOfTextAtSize(token, fontSize) + 2, height: lineHeight, color: rgb(0.13, 0.77, 0.37) });
          page.drawText(token, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
          x += font.widthOfTextAtSize(token, fontSize);
          lastIndex = match.index + token.length;
        }

        const remaining = line.slice(lastIndex);
        if (remaining) {
          page.drawText(remaining, { x, y, size: fontSize, font, color: rgb(0.8, 0.8, 0.8) });
        }

        y -= lineHeight;
      }

      page.drawText("Redacted by PrivacyLayer — all PII tokenized with AES-256 vault", {
        x: margin, y: margin - 20, size: 8, font, color: rgb(0.4, 0.4, 0.4),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "redacted-document.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
    }
  }, [result]);

  const downloadVaultKey = useCallback(() => {
    if (!vaultKey || !vaultPassword) return;
    const payload = JSON.stringify({ encrypted: vaultKey, hint: "Use PrivacyLayer to decrypt" }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privacylayer-vault.key";
    a.click();
    URL.revokeObjectURL(url);
  }, [vaultKey, vaultPassword]);

  const handleKeyImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !result) return;
    try {
      const text = await file.text();
      const { encrypted } = JSON.parse(text);
      if (!encrypted || !vaultPassword) return;
      const vault = await decryptVault(encrypted, vaultPassword);
      const restored = rehydrate(result.anonymized, vault);
      setRehydratedText(restored);
    } catch {
      alert("Invalid or mismatched vault key file.");
    }
  }, [result, vaultPassword]);

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
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-5 h-12 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-semibold text-sm tracking-tight">PrivacyLayer</span>
          </Link>
          <nav className="flex items-center gap-0 border border-border">
            <Link href="/" className="hidden sm:flex px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[36px] items-center tracking-wide border-r border-border">
              Architecture
            </Link>
            <Link href="/playground/chat" className="hidden sm:flex px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[36px] items-center tracking-wide border-r border-border">
              AI Chat Demo
            </Link>
            <span className="px-4 py-2 text-xs font-medium bg-foreground text-background min-h-[36px] flex items-center tracking-wide">
              Playground
            </span>
          </nav>
        </div>
      </header>

      <div className="pt-10 px-4 sm:px-5 pb-20">
        <div className="w-full max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Privacy Playground</h1>
            <p className="text-sm text-muted-foreground">
              Upload PDFs, scan images, or paste text. All processing happens locally in your browser.
            </p>
          </div>

          <div className="flex gap-0 mb-6 border border-border w-full sm:w-fit">
            {([["text", "Paste Text"], ["pdf", "Upload PDF"], ["image", "Scan Image"]] as [TabKey, string][]).map(
              ([key, label], i) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 sm:flex-none px-4 py-2 text-xs font-medium transition-colors min-h-[36px] tracking-wide ${
                    i < 2 ? "border-r border-border" : ""
                  } ${
                    activeTab === key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    {activeTab === "text" ? "INPUT DOCUMENT" : activeTab === "pdf" ? "PDF UPLOAD (MULTI-FILE)" : "IMAGE / SCAN (MULTI-FILE)"}
                  </span>
                </div>
                {activeTab === "text" && (
                  <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--accent)]/5">
                    <span className="text-[11px] font-mono text-[var(--accent)] uppercase tracking-wider shrink-0">Try a sample →</span>
                    <div className="flex gap-2">
                      {Object.keys(SAMPLE_TEXTS).map((key) => (
                        <button
                          key={key}
                          onClick={() => setInputText(SAMPLE_TEXTS[key as keyof typeof SAMPLE_TEXTS])}
                          className="text-xs font-semibold px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-colors capitalize"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "text" && (
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste a document containing personal information...&#10;&#10;Or click one of the sample documents above."
                    className="w-full h-80 bg-transparent p-4 text-sm mono leading-relaxed resize-none focus:outline-none placeholder:text-[var(--text-muted)]/50"
                  />
                )}
                {activeTab === "pdf" && (
                  <div
                    className={`h-80 flex items-center justify-center border-2 border-dashed transition-colors ${
                      dragging ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-transparent"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        const fakeEvent = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
                        handlePdfUpload(fakeEvent);
                      }
                    }}
                  >
                    <div className="text-center">
                      {processing ? (
                        <div>
                          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-sm text-[var(--text-muted)]">{processingStatus}</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-3xl mb-4">📄</p>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-white text-black rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                          >
                            Choose PDF Files
                          </button>
                          <p className="text-xs text-[var(--text-muted)] mt-3">
                            or drag and drop here
                          </p>
                          {uploadedFiles.length > 0 && (
                            <div className="mt-4 text-left">
                              {uploadedFiles.map((f) => (
                                <p key={f} className="text-xs text-[var(--accent)] mono">{f}</p>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handlePdfUpload} />
                    </div>
                  </div>
                )}
                {activeTab === "image" && (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      {processing ? (
                        <div>
                          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-sm text-[var(--text-muted)]">{processingStatus}</p>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => imgInputRef.current?.click()}
                            className="px-6 py-3 bg-white text-black rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                          >
                            Choose Images / Scans
                          </button>
                          <p className="text-xs text-[var(--text-muted)] mt-3">
                            OCR via Tesseract.js — select multiple files. Runs in your browser.
                          </p>
                          {uploadedFiles.length > 0 && (
                            <div className="mt-4 text-left">
                              {uploadedFiles.map((f) => (
                                <p key={f} className="text-xs text-[var(--accent)] mono">{f}</p>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                    </div>
                  </div>
                )}
              </div>

              {activeTab === "text" && (
                <button
                  onClick={() => handleScan(inputText)}
                  disabled={processing || !inputText.trim()}
                  className="mt-4 w-full py-3 bg-[var(--accent)] text-black font-semibold rounded-lg text-sm hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {processing ? "Scanning..." : "Scan for personal data"}
                </button>
              )}
            </div>

            <div className="space-y-6">
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

              {result && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      {rehydratedText ? "RE-HYDRATED OUTPUT" : "ANONYMIZED OUTPUT"}
                    </span>
                    <div className="flex gap-2 items-center">
                      {!rehydratedText && (
                        <button onClick={handleRehydrate} className="text-xs text-[var(--accent)] hover:underline">
                          Re-hydrate
                        </button>
                      )}
                      {rehydratedText && (
                        <button onClick={() => setRehydratedText(null)} className="text-xs text-[var(--text-muted)] hover:underline">
                          Show redacted
                        </button>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(rehydratedText || result.anonymized);
                          setCopiedOutput(true);
                          setTimeout(() => setCopiedOutput(false), 2000);
                        }}
                        className="text-xs bg-[var(--accent)] text-black font-semibold px-3 py-1 rounded hover:opacity-90 transition-opacity"
                      >
                        {copiedOutput ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([rehydratedText || result.anonymized], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "redacted-document.txt";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-xs text-[var(--text-muted)] hover:text-white border border-[var(--border)] px-2 py-1 rounded transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                  <div className="p-4 min-h-48 overflow-y-auto">
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

              {result && !rehydratedText && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold">PASTE AI RESPONSE HERE</span>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Copy the clean text → paste into ChatGPT → copy response → paste below → restore real values</p>
                    </div>
                  </div>
                  <textarea
                    value={aiResponseInput}
                    onChange={(e) => setAiResponseInput(e.target.value)}
                    placeholder={"Paste ChatGPT / Claude response here...\n\nExample: \"I recommend [NAME_01] should follow up with [PHONE_01]...\""}
                    className="w-full h-36 bg-transparent p-4 text-sm mono leading-relaxed resize-none focus:outline-none placeholder:text-[var(--text-muted)]/40"
                  />
                  <div className="px-4 py-3 border-t border-[var(--border)]">
                    <button
                      onClick={() => {
                        if (!aiResponseInput.trim()) return;
                        const restored = rehydrate(aiResponseInput, result.vault);
                        setRehydratedText(restored);
                        setAiResponseInput("");
                      }}
                      disabled={!aiResponseInput.trim()}
                      className="w-full py-2 bg-[var(--accent)] text-black font-semibold text-sm rounded hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Restore real values
                    </button>
                  </div>
                </div>
              )}

              {vaultKey && (
                <div className="bg-[var(--bg-card)] border border-[var(--accent)]/30 rounded-lg p-4 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[var(--accent)]">ENCRYPTED VAULT KEY</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => keyInputRef.current?.click()}
                        className="text-xs border border-[var(--accent)] text-[var(--accent)] px-3 py-1 rounded font-medium hover:bg-[var(--accent)]/10 transition-colors"
                      >
                        Import Key
                      </button>
                      <button
                        onClick={downloadVaultKey}
                        className="text-xs bg-[var(--accent)] text-black px-3 py-1 rounded font-medium hover:bg-[var(--accent-muted)] transition-colors"
                      >
                        Download Key
                      </button>
                      <input ref={keyInputRef} type="file" accept=".key" className="hidden" onChange={handleKeyImport} />
                    </div>
                  </div>
                  <p className="mono text-xs text-[var(--text-muted)] break-all line-clamp-2">
                    {vaultKey.slice(0, 120)}...
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    This key restores all redacted values. Store it securely — it never leaves your browser.
                  </p>
                </div>
              )}

              {result && result.matches.length > 0 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">TOKEN MAPPING ({result.matches.length} items)</span>
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
