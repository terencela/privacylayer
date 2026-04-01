import type { SiteConfig } from "../shared/types";

const SITES: Record<string, SiteConfig> = {
  "chatgpt.com": {
    name: "ChatGPT",
    inputSelectors: ["#prompt-textarea", "textarea[data-id]", "[contenteditable][id*='prompt']"],
    sendButtonSelectors: ["[data-testid='send-button']", "button[aria-label='Send prompt']", "button[aria-label='Send message']"],
    responseSelectors: ["[data-message-author-role='assistant'] .markdown", "[data-message-author-role='assistant']", ".markdown.prose"],
  },
  "chat.openai.com": {
    name: "ChatGPT",
    inputSelectors: ["#prompt-textarea", "textarea[data-id]"],
    sendButtonSelectors: ["[data-testid='send-button']", "button[aria-label='Send prompt']"],
    responseSelectors: ["[data-message-author-role='assistant'] .markdown"],
  },
  "claude.ai": {
    name: "Claude",
    inputSelectors: ["[contenteditable='true'][data-placeholder]", "div[contenteditable='true'].ProseMirror"],
    sendButtonSelectors: ["button[aria-label='Send Message']", "button[aria-label='Send message']", "button.send-button"],
    responseSelectors: [".font-claude-message", "[data-is-streaming]", ".claude-message-content"],
  },
  "gemini.google.com": {
    name: "Gemini",
    inputSelectors: ["rich-textarea .ql-editor", "rich-textarea [contenteditable]", ".input-area-container [contenteditable]"],
    sendButtonSelectors: ["button.send-button", "button[aria-label='Send message']", "mat-icon[data-mat-icon-name='send']"],
    responseSelectors: [".model-response-text", ".response-content", "message-content .markdown"],
  },
  "perplexity.ai": {
    name: "Perplexity",
    inputSelectors: [
      "textarea[placeholder*='Ask']",
      "textarea[placeholder*='Search']",
      "textarea[placeholder*='Follow']",
      "textarea",
      "[contenteditable='true'][data-lexical-editor]",
    ],
    sendButtonSelectors: [
      "button[aria-label='Submit']",
      "button[aria-label='Ask']",
      "button[data-testid='submit-button']",
      "button[type='submit']",
      "button.bg-super",
      "button svg[data-icon='arrow-right']",
    ],
    responseSelectors: [
      ".prose",
      "[data-testid='answer-text']",
      "[class*='prose']",
      ".answer",
      "[data-testid='answer'] p",
    ],
  },
  "labs.perplexity.ai": {
    name: "Perplexity Labs",
    inputSelectors: ["textarea", "[contenteditable='true']"],
    sendButtonSelectors: ["button[type='submit']", "button[aria-label='Submit']"],
    responseSelectors: [".prose", "[class*='prose']", ".message-content"],
  },
};

export function getSiteConfig(): SiteConfig | null {
  const host = location.hostname;
  for (const [domain, config] of Object.entries(SITES)) {
    if (host.includes(domain)) return config;
  }
  // Generic fallback
  return {
    name: "Unknown",
    inputSelectors: ["textarea", "[contenteditable='true']"],
    sendButtonSelectors: ["button[type='submit']", "button[aria-label*='send' i]", "button[aria-label*='Send' i]"],
    responseSelectors: [".response", ".answer", ".message", "[data-role='assistant']"],
  };
}
