# PrivacyLayer -- Devpost Submission

## Project Name
PrivacyLayer

## Elevator Pitch (300 chars)
Strip personal data from any document before it reaches AI -- names, addresses, bank details, health records -- all in your browser. The AI works on clean placeholders. Real values are restored in the response. Zero data leaves your device. Ever.

---

## Inspiration

I work in airport operations where sensitive passenger and safety data flows through dozens of systems daily. One day a colleague pasted a passenger complaint -- full name, passport number, booking reference -- straight into ChatGPT to draft a response. That data is now on OpenAI's servers. Forever.

Then I looked at the bigger picture. Europe is rushing to adopt AI, but every major model is hosted in the US. With shifting geopolitical dynamics and growing concerns about data sovereignty, European companies face a dilemma: we need AI to stay competitive, but we cannot guarantee where our data ends up.

The problem is not that AI models are bad. The problem is that we have too many models we want to test -- Claude, GPT, Gemini, Mistral, Llama, and new ones every week -- and we cannot fully explore them because we do not trust that our personal data will stay private.

PrivacyLayer was born from a simple idea: what if the AI never saw your real data in the first place?

## What it does

PrivacyLayer is a browser-based tool that detects and replaces personal information in any document before it reaches an AI model.

**How it works:**
1. You upload a PDF, snap a photo of a physical letter, or paste text
2. 50+ detection patterns identify names, addresses, AHV/AVS numbers, IBANs, phone numbers, emails, insurance IDs, dates of birth, credit cards, passport numbers, and more
3. Each piece of personal data is replaced with a safe placeholder: `[NAME_01]`, `[IBAN_01]`, etc.
4. The mapping is sealed in an AES-256 encrypted vault -- only you hold the key
5. The cleaned document can be safely shared with any AI model
6. When the AI responds using placeholders, PrivacyLayer swaps the real values back in

**Key differentiators:**
- **100% client-side**: All processing happens in JavaScript in your browser. Open the Network tab -- zero personal data is transmitted anywhere.
- **Privacy Threat Score**: Before redacting, we show you exactly what an attacker could do with the exposed data (identity theft, fraudulent tax returns, etc.)
- **Batch processing**: Upload 10, 20, 50 PDFs at once
- **Image/scan support**: OCR via Tesseract.js handles scanned documents and photos of physical letters
- **Swiss-aware**: Detects AHV/AVS numbers (756.XXXX.XXXX.XX), Swiss IBANs (CH prefix), +41 phone formats
- **Reversible**: Download an encrypted vault key file. Import it later to restore all original values
- **Redacted PDF output**: Download a properly formatted PDF with highlighted placeholders

## How we built it

- **Next.js 16** with TypeScript and Tailwind CSS
- **Custom regex engine**: 50+ patterns organized by data type with risk classification (critical/high/medium/low)
- **Web Crypto API**: AES-256-GCM encryption with PBKDF2 key derivation -- all running natively in the browser
- **pdf.js**: Client-side PDF text extraction, no server needed
- **pdf-lib**: Generating redacted PDF output with highlighted token overlays
- **Tesseract.js**: Browser-based OCR for scanned documents and images (English, German, French)
- **Server-Sent Events**: Streaming simulated AI chat demo for realistic interaction feel
- **Vercel**: Deployed as a static + serverless app

## Challenges we ran into

- **TypeScript strictness with pdf.js**: The TextItem union types from pdfjs-dist required careful casting to avoid type errors in the text extraction pipeline
- **Blob construction with pdf-lib**: Uint8Array buffer types clashed with the Blob constructor in strict TypeScript -- required explicit ArrayBuffer casting
- **Balancing detection recall vs. false positives**: Aggressive regex patterns (especially for names and addresses) can flag normal text. We tuned patterns to require contextual signals (titles like "Herr/Frau", field labels like "Patient:", etc.)
- **Making encryption accessible**: AES-256 is the right choice for security, but explaining key management to non-technical users required careful UX design (downloadable .key file, clear messaging)

## Accomplishments that we're proud of

- **Zero server-side data processing** -- this is not a marketing claim, it is architecturally enforced. There is no backend endpoint that receives personal data.
- **The Privacy Threat Score** -- showing users "an attacker could open bank accounts in your name" makes privacy visceral, not abstract. Judges and users remember it.
- **Swiss-specific detection** -- AHV numbers, Swiss IBANs, and +41 phone formats. Built for the Zurich context.
- **Batch upload** -- most privacy tools handle one file at a time. We process as many as you throw at it.
- **The full reversible flow** -- download encrypted key, import it later, restore everything. True data ownership.

## What we learned

- Privacy is not just about hiding data -- it is about making people feel safe. The Threat Score feature taught us that emotional framing matters more than technical correctness for user adoption.
- Client-side-only architectures are powerful for trust but challenging for performance. OCR on large scanned documents can be slow in the browser.
- There are layers of personal data that go beyond names and numbers. "My brother lives in Zurich" or "I take insulin daily" are personally identifying in context. True privacy requires understanding language, not just pattern matching.

## What's next for PrivacyLayer

- **Local NER models**: Integrate Hugging Face Transformers.js to run named entity recognition models directly in the browser -- catching contextual personal information that regex cannot detect
- **Browser extension**: Intercept document uploads to ChatGPT, Claude, and Gemini automatically -- zero workflow change for users
- **Redacted PDF overlay**: Instead of generating a new PDF, overlay redaction boxes on the original PDF layout preserving formatting
- **Mobile PWA with camera**: Point your phone camera at a physical letter, see personal data highlighted in real-time augmented reality, tap to redact
- **Enterprise SDK**: The `wrapLanguageModel()` middleware for the Vercel AI SDK -- one-line integration for AI-powered applications

## Built With

- Next.js
- TypeScript
- Tailwind CSS
- Web Crypto API (AES-256-GCM)
- pdf.js
- pdf-lib
- Tesseract.js
- Vercel

## Try It

- **Live demo**: https://privacylayer.vercel.app
- **GitHub**: https://github.com/terencela/privacylayer

---

## ChatGPT Logo/Banner Prompt

Use this prompt in ChatGPT/DALL-E to generate a project logo or banner:

```
Create a minimal, dark-themed logo for "PrivacyLayer" -- a privacy tool for AI. The design should feature a shield icon with a subtle lock or eye-slash symbol inside it. Color palette: dark background (#09090b), green accent (#22c55e), white text. Style: clean, geometric, modern SaaS aesthetic. No gradients. No busy details. Think: what Stripe or Linear would design for a privacy product. The text "PrivacyLayer" should use a clean sans-serif font. Include a tagline below in smaller text: "Your data stays yours." Output as a 1280x640 banner suitable for a Devpost hackathon submission.
```

For a square logo (profile picture):
```
Create a minimal square logo icon for "PrivacyLayer". A green (#22c55e) shield shape on a pure black (#09090b) background. Inside the shield, a simple white lock icon or an eye with a slash through it. No text. Clean, geometric, modern. 512x512px.
```

---

## Loom Demo Recording Workflow (1 minute)

### Script:

**[0:00-0:10] The problem**
- Open ChatGPT in a browser tab
- Paste the sample medical record (Dr. Maria Bernasconi)
- Point out: "Every piece of personal data -- name, AHV number, bank account -- just got sent to OpenAI's servers."

**[0:10-0:25] The solution**
- Switch to PrivacyLayer playground tab
- Click "medical" sample to load the same document
- Click "Scan for PII"
- Show the Privacy Threat Score appearing: "CRITICAL -- 11 items detected"
- Point out the attacker scenarios: "With this data, someone could open bank accounts in your name"

**[0:25-0:40] The magic**
- Scroll to anonymized output -- show green highlighted [NAME_01], [AHV_01], [IBAN_01] tokens
- Click "Download PDF" -- show the redacted PDF
- Click "Download Key" -- show the vault key file
- Say: "The AI only ever sees these placeholders. Your real data stayed in your browser."

**[0:40-0:55] The chat demo**
- Navigate to /playground/chat
- Click a demo prompt
- Show the streaming AI response
- Click "Show what the AI saw" -- reveal the anonymized version
- Say: "The AI gave a useful answer -- but it never knew a single real name or number."

**[0:55-1:00] Close**
- Switch back to landing page
- Say: "PrivacyLayer. One tool. Zero personal data exposed. Open source. Try it now."

---
