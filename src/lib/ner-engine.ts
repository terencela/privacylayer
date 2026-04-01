"use client";

// NER runs in browser via WebAssembly — no server, no data leaves the device.
// Model: distilbert-base-multilingual-cased NER (lighter than full BERT)
// Catches: PER (persons), ORG, LOC — merges B-/I- tokens into full entities
// First load: ~100MB download, cached in IndexedDB permanently after that.

export interface NEREntity {
  text: string;
  label: "PER" | "ORG" | "LOC" | "MISC";
  score: number;
  start: number;
  end: number;
}

export type NERStatus =
  | { state: "idle" }
  | { state: "loading"; progress: number; message: string }
  | { state: "ready" }
  | { state: "error"; message: string };

type ProgressCallback = (status: NERStatus) => void;

// Singleton pipeline — load once, reuse forever
let pipelineInstance: ((text: string) => Promise<NERRawToken[]>) | null = null;
let loadPromise: Promise<void> | null = null;

interface NERRawToken {
  entity: string;
  score: number;
  index: number;
  word: string;
  start: number;
  end: number;
}

export async function loadNERModel(onProgress?: ProgressCallback): Promise<void> {
  if (pipelineInstance) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      onProgress?.({ state: "loading", progress: 0, message: "Loading AI model..." });

      // Dynamic import keeps this out of the initial bundle
      const { pipeline, env } = await import("@xenova/transformers");

      // Use local cache (IndexedDB) aggressively
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      onProgress?.({ state: "loading", progress: 10, message: "Downloading NER model (~100MB, cached after first use)..." });

      const pipe = await pipeline(
        "token-classification",
        "Xenova/bert-base-multilingual-cased-ner-hrl",
        {
          progress_callback: (p: { status: string; progress?: number; file?: string }) => {
            if (p.status === "downloading" || p.status === "progress") {
              const pct = Math.round((p.progress ?? 0) * 0.8 + 10);
              onProgress?.({ state: "loading", progress: pct, message: `Downloading model... ${Math.round(p.progress ?? 0)}%` });
            }
            if (p.status === "loading") {
              onProgress?.({ state: "loading", progress: 90, message: "Initializing model..." });
            }
          },
        }
      );

      pipelineInstance = pipe as unknown as (text: string) => Promise<NERRawToken[]>;
      onProgress?.({ state: "ready" });
    } catch (err) {
      loadPromise = null;
      onProgress?.({ state: "error", message: err instanceof Error ? err.message : "Failed to load NER model" });
      throw err;
    }
  })();

  return loadPromise;
}

export function isNERReady(): boolean {
  return pipelineInstance !== null;
}

export async function runNER(text: string): Promise<NEREntity[]> {
  if (!pipelineInstance) throw new Error("NER model not loaded yet");

  // Process in chunks to avoid token limit (BERT max = 512 tokens)
  const CHUNK_SIZE = 400;
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(" "));
  }

  const allEntities: NEREntity[] = [];
  let charOffset = 0;

  for (const chunk of chunks) {
    const raw = await pipelineInstance(chunk);
    const entities = mergeTokens(raw, chunk, charOffset);
    allEntities.push(...entities.filter(e => e.label === "PER")); // Only persons for now
    charOffset += chunk.length + 1;
  }

  // Deduplicate by text value
  const seen = new Set<string>();
  return allEntities.filter(e => {
    const key = e.text.toLowerCase().trim();
    if (seen.has(key) || key.length < 3) return false;
    seen.add(key);
    return true;
  });
}

// Merge B- (beginning) and I- (inside) tokens into full entity spans
function mergeTokens(tokens: NERRawToken[], text: string, charOffset: number): NEREntity[] {
  const entities: NEREntity[] = [];
  let current: { label: string; words: string[]; scores: number[]; start: number; end: number } | null = null;

  for (const token of tokens) {
    const isBegin = token.entity.startsWith("B-");
    const isInside = token.entity.startsWith("I-");
    const label = token.entity.replace(/^[BI]-/, "");

    if (isBegin) {
      if (current) entities.push(finalize(current, text, charOffset));
      current = {
        label,
        words: [token.word.replace(/^##/, "")],
        scores: [token.score],
        start: token.start ?? 0,
        end: token.end ?? 0,
      };
    } else if (isInside && current && current.label === label) {
      const word = token.word.replace(/^##/, "");
      // If word starts with ## it's a subword — append without space
      if (token.word.startsWith("##")) {
        current.words[current.words.length - 1] += word;
      } else {
        current.words.push(word);
      }
      current.scores.push(token.score);
      current.end = token.end ?? current.end;
    } else {
      if (current) entities.push(finalize(current, text, charOffset));
      current = null;
    }
  }

  if (current) entities.push(finalize(current, text, charOffset));
  return entities;
}

function finalize(
  current: { label: string; words: string[]; scores: number[]; start: number; end: number },
  _text: string,
  charOffset: number
): NEREntity {
  const avgScore = current.scores.reduce((a, b) => a + b, 0) / current.scores.length;
  const entityText = current.words.join(" ");
  return {
    text: entityText,
    label: current.label as NEREntity["label"],
    score: avgScore,
    start: current.start + charOffset,
    end: current.end + charOffset,
  };
}
