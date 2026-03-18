# PrivacyLayer

**Strip personal data from any document before it reaches AI.**

Names, addresses, bank details, health records -- all detected and replaced with safe placeholders, right in your browser. The AI works on clean tokens. Real values are restored in the response. Zero data leaves your device. Ever.

[Live Demo](https://privacylayer.vercel.app) · [Playground](https://privacylayer.vercel.app/playground) · [AI Chat Demo](https://privacylayer.vercel.app/playground/chat)

---

## Why PrivacyLayer?

Every time you paste a document into ChatGPT, Claude, or Gemini, your personal data -- names, social security numbers, bank accounts, medical diagnoses -- leaves your device and lands on a server you don't control. Stored. Logged. Potentially used for training. Gone.

Europe is rushing to adopt AI, but every major model is hosted in the US. With growing concerns about data sovereignty, companies face a dilemma: **use AI to stay competitive, or protect personal data.** Until now, you couldn't do both.

PrivacyLayer makes it possible. The AI never sees your real data. Period.

---

## How It Works

```
User uploads document
        ↓
┌─────────────────────────────────────┐
│  PRIVACY SCANNER (your browser)     │
│                                     │
│  1. DETECT   50+ regex patterns     │
│              Names, AHV, IBAN,      │
│              emails, phones, etc.   │
│                                     │
│  2. REPLACE  john@acme.com          │
│              → [EMAIL_01]           │
│                                     │
│  3. VAULT    { EMAIL_01: "john@..." }│
│              AES-256 encrypted      │
└─────────────────────────────────────┘
        ↓
AI model receives ONLY placeholders
        ↓
AI responds using [EMAIL_01] etc.
        ↓
┌─────────────────────────────────────┐
│  RE-HYDRATE                         │
│  [EMAIL_01] → john@acme.com        │
└─────────────────────────────────────┘
        ↓
User reads natural response with real values
```

**All processing happens in JavaScript in your browser.** Open your Network tab -- zero personal data is transmitted to any server. This is not a promise. It is a technical guarantee you can verify yourself.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # Landing page (architecture, how it works, compliance)
│   ├── layout.tsx                  # Root layout with Geist font
│   ├── globals.css                 # oklch design tokens, dark theme
│   ├── playground/
│   │   ├── page.tsx                # Interactive playground (text/PDF/image input)
│   │   └── chat/
│   │       └── page.tsx            # Simulated AI chat with privacy shield
│   └── api/
│       ├── anonymize/route.ts      # POST endpoint for programmatic anonymization
│       └── simulate-chat/route.ts  # SSE streaming simulated AI responses
├── lib/
│   └── pii-engine.ts               # Core detection engine + vault + crypto
```

### Core Components

**PII Detection Engine** (`src/lib/pii-engine.ts`)
- 50+ regex patterns organized by data type
- Swiss-specific: AHV/AVS numbers (756.XXXX.XXXX.XX), Swiss IBAN (CH prefix), +41 phone formats
- Multi-language support: English, German, French patterns
- Risk classification: critical / high / medium / low per data type
- Privacy Threat Score calculation with attacker scenario mapping

**Tokenization & Vault**
- Deterministic token format: `[TYPE_XX]` (e.g., `[NAME_01]`, `[IBAN_02]`)
- Non-overlapping match resolution with priority ordering
- Bi-directional: tokenize (redact) and re-hydrate (restore)

**Encryption** (Web Crypto API -- all client-side)
- AES-256-GCM encryption
- PBKDF2 key derivation with 100,000 iterations
- Random 16-byte salt + 12-byte IV per session
- Exportable encrypted vault key file (`.key`)
- Import key to restore original values

**Document Processing**
- PDF text extraction via pdf.js (client-side)
- Image/scan OCR via Tesseract.js (English, German, French)
- Redacted PDF generation via pdf-lib with highlighted tokens
- Batch processing: multiple files at once

---

## Personal Data Types Detected

| Type | Token Format | Example |
|------|-------------|---------|
| Full name | `[NAME_01]` | Dr. Maria Bernasconi |
| Email | `[EMAIL_01]` | maria@bluewin.ch |
| Phone | `[PHONE_01]` | +41 79 345 67 89 |
| AHV/AVS (Swiss) | `[AHV_01]` | 756.1234.5678.97 |
| SSN / National ID | `[SSN_01]` | 123-45-6789 |
| IBAN / Bank account | `[IBAN_01]` | CH93 0076 2011 6238 5295 7 |
| Credit card | `[CREDIT_CARD_01]` | 4532 1234 5678 9012 |
| Home address | `[ADDRESS_01]` | Bahnhofstrasse 42, 8001 Zürich |
| Date of birth | `[DOB_01]` | 15.03.1987 |
| Passport | `[PASSPORT_01]` | X12345678 |
| Tax ID | `[TAX_ID_01]` | ZH-2025-449812 |
| Patient / Insurance ID | `[ID_01]` | SWICA-2024-88421 |
| IP address | `[IP_01]` | 192.168.1.42 |

---

## Features

- **100% client-side** -- no backend processes your data, verifiable via browser Network tab
- **Privacy Threat Score** -- shows what an attacker could do with exposed data (identity theft, fraud, etc.)
- **Batch upload** -- process multiple PDFs or images at once
- **Image OCR** -- scan photos of physical letters and documents (Tesseract.js)
- **Redacted PDF output** -- download a properly formatted PDF with highlighted placeholders
- **Reversible redaction** -- download encrypted vault key, import it later to restore all values
- **Swiss-aware** -- AHV numbers, Swiss IBANs, +41 phones, German/French name patterns
- **AI Chat Demo** -- see the full flow: send message → strip data → AI responds → restore values
- **Streaming responses** -- simulated AI chat streams character-by-character for realistic feel

---

## Compliance

| Framework | Coverage |
|-----------|----------|
| GDPR | No personal data transmitted to third parties |
| HIPAA | Health records anonymized before AI processing |
| CCPA | Consumer data protected at the source |
| SOC 2 Type II | Audit trail of all redaction operations |
| ISO 27001 | AES-256 encryption, client-side processing |
| PCI-DSS | Credit card numbers detected and tokenized |

---

## Getting Started

```bash
# Clone
git clone https://github.com/terencela/privacylayer.git
cd privacylayer

# Install
npm install

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### API Usage

```bash
curl -X POST http://localhost:3000/api/anonymize \
  -H "Content-Type: application/json" \
  -d '{"text": "Patient Dr. Maria Bernasconi, AHV 756.1234.5678.97, email maria@bluewin.ch"}'
```

### SDK Integration (Vercel AI SDK)

```typescript
import { wrapLanguageModel } from "ai";
import { privacyLayer } from "privacylayer";

// One line. Zero personal data leaves your app.
streamText({
  model: wrapLanguageModel(model, privacyLayer()),
  messages,
});
```

---

## Tech Stack

- **Next.js 16** -- App Router, TypeScript
- **Tailwind CSS** -- oklch design tokens, Geist font
- **Web Crypto API** -- AES-256-GCM, PBKDF2 (client-side)
- **pdf.js** -- client-side PDF text extraction
- **pdf-lib** -- redacted PDF generation
- **Tesseract.js** -- browser-based OCR (EN, DE, FR)
- **Vercel** -- deployment

---

## License

MIT
