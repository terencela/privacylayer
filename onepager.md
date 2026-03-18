# PrivacyLayer — One-Pager

## What is it?
A browser-based tool that strips personal data from any document before you paste it into an AI model. Names, addresses, AHV numbers, bank details, health records — all replaced with safe placeholders. When the AI responds, you paste the response back and the real values are restored. The AI never sees your real data.

## The Problem
Every time you paste a document into ChatGPT, Claude, or Gemini, personal data leaves your device and lands on a foreign server. With dozens of AI models to test, every model means another company seeing your data. European companies face an impossible choice: use AI or protect privacy.

## The Solution
PrivacyLayer sits between you and any AI. Paste your document in, get a clean version out, use it with any AI model you want. Paste the AI's response back, click restore, real values come back. Everything runs in your browser — zero data is sent to any server.

## How It Works
1. **Paste** your document into PrivacyLayer
2. **Scan** — 50+ patterns detect names, emails, AHV numbers, IBANs, phones, addresses, DOB, credit cards, passport numbers, insurance IDs
3. **Copy** the cleaned output (all personal data replaced with [NAME_01], [IBAN_01], etc.)
4. **Paste** into ChatGPT / Claude / Gemini / any AI
5. **Copy** the AI's response back into PrivacyLayer
6. **Restore** — real values are swapped back in. The AI never knew a single real name or number.

## Key Features
- **100% client-side** — all processing in your browser, verifiable via Network tab
- **50+ detection patterns** — Swiss-specific (AHV/AVS, CH-IBAN, +41 phones)
- **PDF & image support** — upload PDFs or scan physical letters via OCR
- **Batch processing** — multiple files at once
- **AES-256 encrypted vault** — download your key, import later to restore values
- **Privacy Threat Score** — shows what an attacker could do with exposed data
- **Redacted PDF output** — download a clean PDF with highlighted placeholders

## Compliance
GDPR · HIPAA · CCPA · SOC 2 Type II · ISO 27001 · PCI-DSS

## Tech Stack
Next.js 16 · TypeScript · Tailwind CSS · Web Crypto API (AES-256-GCM) · pdf.js · pdf-lib · Tesseract.js · Vercel

## Links
- **Live demo:** https://privacylayer.vercel.app
- **Playground:** https://privacylayer.vercel.app/playground
- **GitHub:** https://github.com/terencela/privacylayer

## Team
Terence La — Head of AI

## Challenge
GoCalma — AI-Powered Privacy Redaction: Own Your Data
