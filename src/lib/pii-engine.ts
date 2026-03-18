export interface PIIMatch {
  type: string;
  value: string;
  token: string;
  start: number;
  end: number;
  risk: "critical" | "high" | "medium" | "low";
}

export interface PIIResult {
  anonymized: string;
  matches: PIIMatch[];
  vault: Record<string, string>;
  threatScore: number;
  riskBreakdown: { category: string; count: number; risk: string }[];
}

const RISK_MAP: Record<string, "critical" | "high" | "medium" | "low"> = {
  SSN: "critical",
  AHV: "critical",
  IBAN: "critical",
  CREDIT_CARD: "critical",
  PASSPORT: "critical",
  TAX_ID: "critical",
  ID: "critical",
  NAME: "high",
  EMAIL: "high",
  PHONE: "high",
  ADDRESS: "high",
  DOB: "high",
  IP: "medium",
  DATE: "low",
};

const RISK_WEIGHTS: Record<string, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

interface PatternDef {
  type: string;
  label: string;
  patterns: RegExp[];
}

const PII_PATTERNS: PatternDef[] = [
  {
    type: "AHV",
    label: "AHV/AVS Number",
    patterns: [
      /\b756[\.\s-]?\d{4}[\.\s-]?\d{4}[\.\s-]?\d{2}\b/g,
    ],
  },
  {
    type: "SSN",
    label: "SSN / National ID",
    patterns: [
      /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
      /\b\d{2}[\.\s]\d{3}[\.\s]\d{3}\b/g,
    ],
  },
  {
    type: "IBAN",
    label: "IBAN / Bank Account",
    patterns: [
      /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{0,4}\b/g,
      /\bCH\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{1}\b/g,
    ],
  },
  {
    type: "CREDIT_CARD",
    label: "Credit Card",
    patterns: [
      /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    ],
  },
  {
    type: "EMAIL",
    label: "Email Address",
    patterns: [
      /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    ],
  },
  {
    type: "PHONE",
    label: "Phone Number",
    patterns: [
      /\+41[\s.-]?\(?\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
      /\b0\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
      /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}\b/g,
      /\b\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
    ],
  },
  {
    type: "DOB",
    label: "Date of Birth",
    patterns: [
      /\b(?:0[1-9]|[12]\d|3[01])[\/.\-](?:0[1-9]|1[0-2])[\/.\-](?:19|20)\d{2}\b/g,
      /\b(?:19|20)\d{2}[\/.\-](?:0[1-9]|1[0-2])[\/.\-](?:0[1-9]|[12]\d|3[01])\b/g,
      /\b(?:born|geb(?:oren)?|date of birth|geburtsdatum|né(?:e)?)\s*[:\s]?\s*\d{1,2}[\/.\-\s]\w+[\/.\-\s]\d{4}\b/gi,
    ],
  },
  {
    type: "PASSPORT",
    label: "Passport Number",
    patterns: [
      /\b[A-Z]\d{8}\b/g,
      /\b[A-Z]{2}\d{7}\b/g,
      /\b(?:passport|pass(?:nr|no|nummer))\s*[:#]?\s*[A-Z0-9]{6,12}\b/gi,
    ],
  },
  {
    type: "TAX_ID",
    label: "Tax ID / EIN",
    patterns: [
      /\b\d{2}[-]\d{7}\b/g,
      /\b(?:tax\s*id|steuer(?:nummer|nr)|tin|ein)\s*[:#]?\s*[\dA-Z\-]{6,15}\b/gi,
    ],
  },
  {
    type: "IP",
    label: "IP Address",
    patterns: [
      /\b(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}\b/g,
    ],
  },
  {
    type: "ADDRESS",
    label: "Street Address",
    patterns: [
      /\b\d{1,5}[ \t]+(?:[A-Z][a-zA-Zäöüéèê]+[ \t]){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Strasse|Str|Gasse|Weg|Platz|Allee)\b\.?/gi,
      /\b(?:[A-Z][a-zäöüéèê]+(?:strasse|gasse|weg|platz|allee|quai))[ \t]+\d{1,5}[a-z]?\b/gi,
      /\b\d{4}[ \t]+[A-ZÄÖÜ][a-zäöüéèê]+(?:[ \t]+[A-ZÄÖÜ][a-zäöüéèê]+)?\b/g,
    ],
  },
  {
    type: "ID",
    label: "Patient / Insurance ID",
    patterns: [
      /\b(?:patient|versicherten|kunden|member|policy)\s*[-#:]?\s*(?:id|nr|no|nummer)\s*[:#]?\s*[\dA-Z\-]{4,15}\b/gi,
      /\b(?:insurance|versicherung)\s*(?:id|nr|no|nummer)\s*[:#]?\s*[\dA-Z\-]{4,15}\b/gi,
    ],
  },
  {
    type: "NAME",
    label: "Full Name",
    patterns: [
      /\b(?:Mr|Mrs|Ms|Dr|Prof|Herr|Frau|Monsieur|Madame)\.?[ \t]+[A-ZÄÖÜ][a-zäöüéèê]+(?:[ \t]+[A-ZÄÖÜ][a-zäöüéèê\-]+){1,3}\b/gm,
      /\b(?:name|patient|kunde|client|versicherte[r]?)[ \t]*[:.][ \t]*([A-ZÄÖÜ][a-zäöüéèê]+(?:[ \t]+[A-ZÄÖÜ][a-zäöüéèê\-]+){1,3})\b/gi,
    ],
  },
];

export function detectPII(text: string): PIIResult {
  const matches: PIIMatch[] = [];
  const vault: Record<string, string> = {};
  const counters: Record<string, number> = {};
  const usedRanges: [number, number][] = [];

  function overlaps(start: number, end: number): boolean {
    return usedRanges.some(([s, e]) => start < e && end > s);
  }

  for (const patternDef of PII_PATTERNS) {
    for (const regex of patternDef.patterns) {
      const re = new RegExp(regex.source, regex.flags);
      let match;
      while ((match = re.exec(text)) !== null) {
        const value = match[1] || match[0];
        const start = match[1] ? match.index + match[0].indexOf(match[1]) : match.index;
        const end = start + value.length;

        if (overlaps(start, end)) continue;
        if (value.length < 3) continue;

        counters[patternDef.type] = (counters[patternDef.type] || 0) + 1;
        const token = `[${patternDef.type}_${String(counters[patternDef.type]).padStart(2, "0")}]`;

        vault[token] = value;
        usedRanges.push([start, end]);

        matches.push({
          type: patternDef.type,
          value,
          token,
          start,
          end,
          risk: RISK_MAP[patternDef.type] || "medium",
        });
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);

  let anonymized = "";
  let lastIndex = 0;
  for (const m of matches) {
    anonymized += text.slice(lastIndex, m.start) + m.token;
    lastIndex = m.end;
  }
  anonymized += text.slice(lastIndex);

  let rawScore = 0;
  for (const m of matches) {
    rawScore += RISK_WEIGHTS[m.risk] || 5;
  }
  const threatScore = Math.min(100, rawScore);

  const categoryMap = new Map<string, { count: number; risk: string }>();
  for (const m of matches) {
    const existing = categoryMap.get(m.type);
    if (existing) {
      existing.count++;
    } else {
      categoryMap.set(m.type, { count: 1, risk: m.risk });
    }
  }
  const riskBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));

  return { anonymized, matches, vault, threatScore, riskBreakdown };
}

export function rehydrate(text: string, vault: Record<string, string>): string {
  let result = text;
  for (const [token, value] of Object.entries(vault)) {
    const escaped = token.replace(/[[\]]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), value);
  }
  return result;
}

export async function encryptVault(
  vault: Record<string, string>,
  password: string
): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(vault));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(encrypted).length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptVault(
  encryptedB64: string,
  password: string
): Promise<Record<string, string>> {
  const enc = new TextEncoder();
  const raw = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const data = raw.slice(28);
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

export const THREAT_DESCRIPTIONS: Record<string, string[]> = {
  critical: [
    "Open bank accounts in your name",
    "File fraudulent tax returns",
    "Commit identity theft",
    "Access your medical records",
    "Take out loans under your identity",
  ],
  high: [
    "Send targeted phishing emails",
    "Social-engineer your accounts",
    "Track your physical location",
    "Impersonate you online",
  ],
  medium: [
    "Profile your online activity",
    "Correlate your digital footprint",
  ],
};
