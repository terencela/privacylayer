# PrivacyLayer

**Strip personal data from any document before it reaches AI.**

Names, addresses, bank details, health records -- detected and replaced with safe placeholders, right in your browser. The AI works on clean tokens. Real values are restored in the response. Zero data leaves your device. Ever.

[Live Demo](https://privacylayer.vercel.app) · [Playground](https://privacylayer.vercel.app/playground) · [AI Chat Demo](https://privacylayer.vercel.app/playground/chat)

---

## The Problem

You paste a hospital invoice into ChatGPT. Your name, diagnosis, AHV number, and bank account land on a US server. Gone. Now multiply that across every AI model you want to test -- Claude, Gemini, Mistral, Llama. Every model = another company with your data.

PrivacyLayer fixes this. The AI never sees your real data.

---

## How It Works

```
  Your document
       |
       v
  ┌─ DETECT ──────────────────────────┐
  │  50+ patterns scan in parallel    │
  │  Names, AHV, IBAN, emails,        │
  │  phones, addresses, DOB...        │
  └────────────────────────────────────┘
       |
       v
  ┌─ REPLACE ─────────────────────────┐
  │  "Dr. Maria Bernasconi"           │
  │       → [NAME_01]                 │
  │  "CH93 0076 2011 6238 5295 7"     │
  │       → [IBAN_01]                 │
  └────────────────────────────────────┘
       |
       v
  ┌─ VAULT ───────────────────────────┐
  │  { NAME_01: "Dr. Maria..." }      │
  │  AES-256 encrypted, browser only  │
  └────────────────────────────────────┘
       |
       v
  AI sees: "Patient [NAME_01], IBAN [IBAN_01]"
  AI responds: "I recommend [NAME_01]..."
       |
       v
  ┌─ RESTORE ─────────────────────────┐
  │  [NAME_01] → "Dr. Maria..."      │
  │  Find-and-replace from vault      │
  └────────────────────────────────────┘
       |
       v
  You read: "I recommend Dr. Maria Bernasconi..."
  The AI never knew her name.
```

Everything runs in JavaScript in your browser. Open your Network tab to verify -- zero personal data leaves your device.

---

## Architecture

```
              ┌──────────────────────────────────────────┐
              │            YOUR BROWSER                  │
              │                                          │
  Document ──>│  pii-engine.ts                           │
              │  ├─ 50+ regex patterns (detect)          │
              │  ├─ tokenizer (replace)                  │
              │  ├─ AES-256 vault (encrypt)              │
              │  └─ re-hydrator (restore)                │
              │                                          │
              │  pdf.js ─── PDF text extraction           │
              │  Tesseract.js ─── image OCR              │
              │  pdf-lib ─── redacted PDF output          │
              │  Web Crypto API ─── AES-256-GCM          │
              │                                          │
              └──────────┬───────────────────────────────┘
                         │ only [TOKEN_XX] placeholders
                         v
              ┌──────────────────────┐
              │  Any AI model        │
              │  Claude / GPT /      │
              │  Gemini / Mistral    │
              │  (sees zero real     │
              │   personal data)     │
              └──────────────────────┘
```

**Key design decision:** There is no server component that touches documents. The API routes (`/api/anonymize`, `/api/simulate-chat`) exist for the demo interface -- actual document processing is client-side JavaScript.

---

## What We Detect

| Type | Token | Example |
|------|-------|---------|
| Full name | `[NAME_01]` | Dr. Maria Bernasconi |
| Email | `[EMAIL_01]` | maria@bluewin.ch |
| Phone | `[PHONE_01]` | +41 79 345 67 89 |
| AHV/AVS | `[AHV_01]` | 756.1234.5678.97 |
| SSN | `[SSN_01]` | 123-45-6789 |
| IBAN | `[IBAN_01]` | CH93 0076 2011 6238 5295 7 |
| Credit card | `[CREDIT_CARD_01]` | 4532 1234 5678 9012 |
| Address | `[ADDRESS_01]` | Bahnhofstrasse 42, 8001 Zurich |
| Date of birth | `[DOB_01]` | 15.03.1987 |
| Passport | `[PASSPORT_01]` | X12345678 |
| Tax ID | `[TAX_ID_01]` | ZH-2025-449812 |
| Patient ID | `[ID_01]` | SWICA-2024-88421 |
| IP address | `[IP_01]` | 192.168.1.42 |

Swiss-specific: AHV/AVS numbers, CH-prefix IBANs, +41 phone formats, German/French name patterns.

---

## Getting Started

```bash
git clone https://github.com/terencela/privacylayer.git
cd privacylayer
npm install
npm run dev
```

---

## Tech Stack

Next.js 16 · TypeScript · Tailwind CSS · Web Crypto API (AES-256-GCM) · pdf.js · pdf-lib · Tesseract.js · Vercel

---

## License

MIT
