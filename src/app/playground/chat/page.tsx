"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "system";
  content: string;
  meta?: {
    anonymized?: string;
    threatScore?: number;
    matchCount?: number;
    streaming?: boolean;
  };
}

const DEMO_PROMPTS = [
  "Summarize this patient record: Patient Dr. Maria Bernasconi, DOB 15.03.1987, AHV 756.1234.5678.97, diagnosed with Type 2 Diabetes. Contact: maria.bernasconi@bluewin.ch, +41 79 345 67 89. IBAN CH93 0076 2011 6238 5295 7.",
  "Review this tax filing: Herr Stefan Keller, SSN 756.9876.5432.10, Langstrasse 15, 8004 Zürich. Gross Income CHF 142,000. Tax ID ZH-2025-449812. Email s.keller@gmail.com. IBAN CH56 0483 5012 3456 7800 9.",
];

export default function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showAnonymized, setShowAnonymized] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setIsStreaming(true);
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    try {
      const res = await fetch("/api/simulate-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      let aiText = "";
      let anonymizedText = "";
      let threatScore = 0;
      let matchCount = 0;
      let systemMsgAdded = false;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "anonymized") {
              anonymizedText = parsed.text;
              threatScore = parsed.threatScore;
              matchCount = parsed.matches;
            } else if (parsed.type === "token") {
              aiText += parsed.char;
              if (!systemMsgAdded) {
                systemMsgAdded = true;
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "system",
                    content: aiText,
                    meta: { anonymized: anonymizedText, threatScore, matchCount, streaming: true },
                  },
                ]);
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = { ...last, content: aiText };
                  return updated;
                });
              }
              scrollToBottom();
            } else if (parsed.type === "rehydrated") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: parsed.text,
                  meta: { ...last.meta, streaming: false },
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "Error processing request." },
      ]);
    }

    setIsStreaming(false);
    scrollToBottom();
  }, [isStreaming]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <span className="font-bold text-sm">PrivacyLayer</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/playground" className="text-xs text-[var(--text-muted)] hover:text-white px-3 py-1.5 border border-[var(--border)] rounded-md">
              Playground
            </Link>
            <span className="text-xs bg-white text-black px-3 py-1.5 rounded-md font-medium">
              AI Chat Demo
            </span>
          </div>
        </div>
      </nav>

      {/* Chat Body */}
      <div className="flex-1 pt-20 pb-32">
        <div className="max-w-3xl mx-auto px-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">AI Chat with Privacy Shield</h2>
              <p className="text-sm text-[var(--text-muted)] max-w-md mb-8">
                Type or paste a message with personal information. Watch PII get stripped before the AI sees it, then re-hydrated in the response.
              </p>
              <div className="space-y-3 w-full max-w-lg">
                {DEMO_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(p)}
                    className="w-full text-left p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-white transition-colors"
                  >
                    {p.slice(0, 120)}...
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={scrollRef} className="space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "" : ""}`}>
                  {msg.role === "system" && msg.meta && (
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-[var(--text-muted)]">AI Response</span>
                      {msg.meta.matchCount !== undefined && msg.meta.matchCount > 0 && (
                        <span className="mono text-xs px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                          {msg.meta.matchCount} PII items redacted
                        </span>
                      )}
                      {msg.meta.anonymized && (
                        <button
                          onClick={() => setShowAnonymized(showAnonymized === i ? null : i)}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        >
                          {showAnonymized === i ? "Hide" : "Show"} what the AI saw
                        </button>
                      )}
                    </div>
                  )}

                  {showAnonymized === i && msg.meta?.anonymized && (
                    <div className="mb-3 p-3 bg-[var(--danger)]/5 border border-[var(--danger)]/20 rounded-lg">
                      <p className="text-xs text-[var(--danger)] font-semibold mb-2">What the AI model received (anonymized):</p>
                      <pre className="mono text-xs text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed">
                        {msg.meta.anonymized.split(/(\[[A-Z_]+_\d{2}\])/).map((part, j) => {
                          if (/^\[[A-Z_]+_\d{2}\]$/.test(part)) {
                            return <span key={j} className="text-[var(--accent)] font-semibold bg-[var(--accent)]/10 px-0.5 rounded">{part}</span>;
                          }
                          return <span key={j}>{part}</span>;
                        })}
                      </pre>
                    </div>
                  )}

                  <div
                    className={`p-4 rounded-lg text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-white text-black"
                        : "bg-[var(--bg-card)] border border-[var(--border)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.meta?.streaming && (
                      <span className="inline-block w-2 h-4 bg-[var(--accent)] ml-0.5 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 w-full glass border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Type a message with personal data..."
              className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)]/50"
              disabled={isStreaming}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isStreaming || !input.trim()}
              className="px-6 py-3 bg-[var(--accent)] text-black rounded-lg font-semibold text-sm hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-30"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
            PII is stripped before the AI processes your message. No API key needed — this is a simulated demo.
          </p>
        </div>
      </div>
    </div>
  );
}
