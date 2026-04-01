# PrivacyLayer

**The privacy layer between your people and every AI on earth.**

Live: [privacylayer-main.vercel.app](https://privacylayer-main.vercel.app)

---

## The problem

Every 10 days, a new AI model launches. Procurement approval takes 6 months.

So people test new tools with real documents. Patient records into ChatGPT. Client IBANs into Gemini. Salary data into Claude. This is Shadow AI — and it happens in every company, every day.

Once that data reaches a US server, you have no control over it. Under Swiss nDSG, GDPR, and EU AI Act Article 10, this is not a grey area. It is a violation.

There was no middle ground. Either you skip the AI tool, or you leak the data.

**PrivacyLayer is the third option.**

---

## How it works

1. Personal data is detected and replaced with safe tokens — `[NAME_01]`, `[IBAN_01]`, `[AHV_01]`
2. The tokenized text is sent to any AI model
3. The AI responds using tokens — never seeing real data
4. PrivacyLayer restores real values locally, so you read a natural response

**The AI model never sees a single real name, number, or address.**

---

## Two ways to use it

### Chrome Extension (primary — works inside ChatGPT, Claude, Gemini, Perplexity)

Install → open any supported AI → paste your document → click **Protect** → send.

That's it. Zero workflow change. The extension intercepts the text before it reaches the AI.

```
extension/
  inject.ts        — content script, injects Protect button into AI chat UIs
  sites.ts         — per-site DOM selectors (ChatGPT, Claude, Gemini, Perplexity)
  pii-engine.ts    — detection engine (ported from web app)
  manifest.json    — Chrome Manifest V3
```

### Web Playground (full feature set — PDF, OCR, batch, vault)

Upload PDFs, paste text, or photograph a physical letter. Download a redacted PDF. Export an encrypted vault key. Import it later to restore all original values.

---

## Detection engine

Two-pass hybrid pipeline:

**Pass 1 — Regex (instant, deterministic)**
50+ patterns: AHV/AVS numbers, Swiss IBANs, phone numbers (+41 format), emails, dates of birth, credit cards, passports, tax IDs, addresses, patient IDs, IP addresses.

**Pass 2 — BERT NER (AI, opt-in)**
`Xenova/bert-base-multilingual-cased-ner-hrl` runs in your browser via WebAssembly.
Catches names regex misses — plain names without titles, multilingual (DE/FR/IT/EN/TR/PL).
500+ first-name dictionary for additional coverage. Zero server calls.

**Generative risk summary**
`LaMini-Flan-T5-77M` generates a human-readable risk assessment after scanning.
Runs locally. Output: *"This document exposes 2 names and 1 AHV number — sufficient for identity theft and fraudulent tax filing."*

```
src/lib/
  pii-engine.ts    — core detection, tokenization, vault, AES-256-GCM encryption
  ner-engine.ts    — BERT NER wrapper (transformers.js, lazy-loaded, IndexedDB cached)
  risk-summary.ts  — LaMini-Flan-T5 generative risk narrative
```

---

## Architecture

```
User document
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Browser (your device)                              │
│                                                     │
│  Regex engine  ──┐                                  │
│                  ├──► Token vault (AES-256-GCM)    │
│  BERT NER      ──┘         │                        │
│                            ▼                        │
│              Anonymized text ──► AI model           │
│                                      │              │
│              AI response ◄───────────┘              │
│                    │                                │
│              Restore real values                    │
└─────────────────────────────────────────────────────┘
         │
         ▼
  Zero personal data transmitted. Ever.
  Open DevTools → Network tab → verify yourself.
```

---

## Why it matters

- **Compliance today:** nDSG (Switzerland), GDPR (EU), EU AI Act Article 10
- **Deployable today:** Install the Chrome extension. Any employee can use any AI tool — compliantly — without waiting for procurement
- **No backend required:** Architecturally enforced. There is no server endpoint that receives personal data
- **Multilingual:** German, French, Italian, English, Turkish, Polish, Scandinavian names detected out of the box

---

## Tech stack

- Next.js + TypeScript + Tailwind CSS
- Chrome Extension: Manifest V3, TypeScript, Vite
- `@xenova/transformers` — BERT NER + Flan-T5 in browser (WebAssembly)
- Web Crypto API — AES-256-GCM, PBKDF2 key derivation
- `pdfjs-dist` — client-side PDF extraction
- `tesseract.js` — browser-based OCR
- Vercel (static + edge)

---

## Built at GenAI Zurich Hackathon 2026

By Terence La — Head of AI, Zurich Airport
