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

// Representative subset of patterns. Full pattern set covers 13+ PII types
// with locale-specific variants (CH, DE, FR, US) and multi-format support.
const PII_PATTERNS: PatternDef[] = [
  {
    type: "AHV",
    label: "AHV/AVS Number (Switzerland)",
    patterns: [
      /\b756[\.\s-]?\d{4}[\.\s-]?\d{4}[\.\s-]?\d{2}\b/g,
    ],
  },
  {
    type: "IBAN",
    label: "IBAN / Bank Account",
    patterns: [
      /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{0,4}\b/g,
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
      /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}\b/g,
    ],
  },
  {
    type: "IP",
    label: "IP Address",
    patterns: [
      /\b(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}\b/g,
    ],
  },
  // Additional types: SSN, CREDIT_CARD, DOB, PASSPORT, TAX_ID, ADDRESS, ID, NAME
  // Each with locale-specific variants for CH, DE, FR, US formats.
];

import { FIRST_NAMES, NAME_PARTICLES } from "./names-list";

function detectNamesByList(text: string, existingVault?: Record<string, string>): PIIMatch[] {
  const results: PIIMatch[] = [];
  const tokenRegex = /[A-ZÄÖÜa-zäöüéèêàâîïùûçæœşğıçÄÖÜ'-]+/g;
  const tokens: { word: string; start: number; end: number }[] = [];
  let m;
  while ((m = tokenRegex.exec(text)) !== null) {
    tokens.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }

  let counter = 0;
  if (existingVault) {
    for (const token of Object.keys(existingVault)) {
      const mx = token.match(/^\[NAME_(\d+)\]$/);
      if (mx) { const n = parseInt(mx[1], 10); if (n > counter) counter = n; }
    }
  }

  let i = 0;
  while (i < tokens.length) {
    const { word, start } = tokens[i];
    if (FIRST_NAMES.has(word.toLowerCase())) {
      let end = tokens[i].end;
      let j = i + 1;
      while (j < tokens.length) {
        const next = tokens[j];
        if (next.start - end > 2) break;
        const lower = next.word.toLowerCase();
        if (NAME_PARTICLES.has(lower) || /^[A-ZÄÖÜŞĞ]/.test(next.word)) {
          end = next.end;
          j++;
        } else {
          break;
        }
      }
      const value = text.slice(start, end);
      const existingTok = existingVault ? Object.entries(existingVault).find(([, v]) => v === value)?.[0] : undefined;
      let token: string;
      if (existingTok) {
        token = existingTok;
      } else {
        counter++;
        token = `[NAME_${String(counter).padStart(2, "0")}]`;
      }
      results.push({ type: "NAME", value, token, start, end, risk: "high" });
      i = j;
    } else {
      i++;
    }
  }
  return results;
}

export function detectPII(text: string, existingVault?: Record<string, string>): PIIResult {
  const matches: PIIMatch[] = [];
  const vault: Record<string, string> = {};
  const counters: Record<string, number> = {};
  const usedRanges: [number, number][] = [];

  // Build reverse lookup: raw value → existing token (so same value reuses same token)
  const valueToToken: Record<string, string> = {};
  if (existingVault) {
    for (const [token, value] of Object.entries(existingVault)) {
      valueToToken[value] = token;
      // Seed counters so new tokens don't collide with existing ones
      const m = token.match(/^\[([A-Z_]+)_(\d+)\]$/);
      if (m) {
        const type = m[1];
        const num = parseInt(m[2], 10);
        if (!counters[type] || num > counters[type]) counters[type] = num;
      }
    }
  }

  function overlaps(start: number, end: number): boolean {
    return usedRanges.some(([s, e]) => start < e && end > s);
  }

  // Dictionary-based name detection (handles plain names without titles, multilingual)
  for (const nm of detectNamesByList(text, existingVault)) {
    if (overlaps(nm.start, nm.end)) continue;
    counters["NAME"] = (counters["NAME"] || 0) + 1;
    const token = `[NAME_${String(counters["NAME"]).padStart(2, "0")}]`;
    vault[token] = nm.value;
    usedRanges.push([nm.start, nm.end]);
    matches.push({ ...nm, token });
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

        // Reuse existing token if same value was already seen
        const existingToken = valueToToken[value];
        let token: string;
        if (existingToken) {
          token = existingToken;
        } else {
          counters[patternDef.type] = (counters[patternDef.type] || 0) + 1;
          token = `[${patternDef.type}_${String(counters[patternDef.type]).padStart(2, "0")}]`;
        }

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

  // Also catch standalone surnames/firstnames already in vault
  if (existingVault) {
    for (const [token, fullName] of Object.entries(existingVault)) {
      try {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length < 2) continue;
        for (const part of parts) {
          if (part.length < 3) continue;
          // Escape special regex characters to avoid crashes
          const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const re = new RegExp(`\\b${escaped}\\b`, "g");
          let m;
          while ((m = re.exec(text)) !== null) {
            if (!overlaps(m.index, m.index + part.length) && text.slice(m.index, m.index + part.length) === part) {
              vault[token] = fullName;
              usedRanges.push([m.index, m.index + part.length]);
              matches.push({ type: "NAME", value: part, token, start: m.index, end: m.index + part.length, risk: "high" });
            }
          }
        }
      } catch {
        // Skip malformed entries silently
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
