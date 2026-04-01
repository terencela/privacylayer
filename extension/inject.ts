import { getSiteConfig } from "./sites";
import type { SiteConfig } from "../shared/types";

const BADGE_ID = "pl-shield-badge";
const BUTTON_ID = "pl-shield-btn";
const PICKER_BAR_ID = "pl-picker-bar";
const PICKER_MODAL_ID = "pl-picker-modal";
// Non-global regex for existence checks (global /g shifts lastIndex on .test())
const HAS_TOKEN = /\[[A-Z_]+_\d{2}\]/;
const TOKEN_RE_G = () => /\[([A-Z_]+_\d{2})\]/g;

let settings = { enabled: true, autoScan: true, autoReplace: false, autoClean: false, autoRehydrate: true };
let siteConfig: SiteConfig | null = null;
let scanTimeout: ReturnType<typeof setTimeout> | null = null;
let rehydrateTimer: ReturnType<typeof setTimeout> | null = null;
let lastInputEl: HTMLElement | null = null;
let isAutoReplacing = false;
let pickerMode = false;
let pickerHighlighted: HTMLElement | null = null;

// Module-level scan state — survives button recreation
let isAnonymized = false;
let isScanning = false;
let lastUrl = location.href;

// Load settings from background
chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (res) => {
  if (res?.settings) settings = res.settings;
  if (settings.enabled) init();
});

// Listen for messages from popup / background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SET_SETTINGS") {
    settings = msg.payload;
    if (!settings.enabled) removeBadge();
  }
  if (msg.type === "CLEAR_VAULT") {
    updateBadge(0);
  }
  if (msg.type === "ENTER_PICK_MODE") {
    enterPickerMode();
  }
});

function init() {
  siteConfig = getSiteConfig();
  if (!siteConfig) return;

  observeInputs();
  observeResponses();
  observeUrlChanges();
}

// Detect SPA navigation (new chat opened) → reset badge + state
function observeUrlChanges() {
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      isAnonymized = false;
      isScanning = false;
      updateBadgeEl("Scan");
    }
  }, 500);
}

// ─── Input observation ────────────────────────────────────────────────────────

function observeInputs() {
  const tryAttach = () => {
    if (!siteConfig) return;
    for (const sel of siteConfig.inputSelectors) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el && el !== lastInputEl) {
        attachToInput(el);
        break;
      }
    }
  };

  tryAttach();

  const obs = new MutationObserver(() => tryAttach());
  obs.observe(document.body, { childList: true, subtree: true });
}

function attachToInput(el: HTMLElement) {
  lastInputEl = el;
  el.addEventListener("input", onInput);
  el.addEventListener("keydown", onKeydown);
  injectShieldButton(el);
}

function onInput() {
  if (isAutoReplacing) return;
  const text = getInputText();
  // Reset state when input is cleared
  if (!text.trim()) {
    isAnonymized = false;
    updateBadgeEl("Scan");
    if (scanTimeout) clearTimeout(scanTimeout);
    return;
  }
  // Input changed while anonymized — mark as not anonymized anymore
  if (isAnonymized) {
    isAnonymized = false;
    updateBadgeEl("Scan");
  }
  if (!settings.autoScan && !settings.autoReplace) return;
  if (scanTimeout) clearTimeout(scanTimeout);
  scanTimeout = setTimeout(
    settings.autoReplace ? autoReplaceCurrentInput : scanCurrentInput,
    600
  );
}

function onKeydown(e: Event) {
  const ke = e as KeyboardEvent;
  if (ke.key === "Enter" && !ke.shiftKey && settings.autoClean) {
    ke.preventDefault();
    ke.stopImmediatePropagation();
    cleanAndSend();
  }
}

function getInputText(): string {
  if (!lastInputEl) return "";
  if (lastInputEl.tagName === "TEXTAREA") return (lastInputEl as HTMLTextAreaElement).value;
  // ContentEditable: each <p> is a line. innerText adds \n\n between <p> tags,
  // so we walk them manually to get single \n separation.
  const paras = lastInputEl.querySelectorAll("p");
  if (paras.length > 0) {
    return Array.from(paras).map(p => {
      // <p><br></p> = intentional blank line
      if (!p.textContent?.trim() && p.querySelector("br")) return "";
      return p.innerText || p.textContent || "";
    }).join("\n");
  }
  return lastInputEl.innerText || lastInputEl.textContent || "";
}

function normalizeText(text: string): string {
  // Collapse 3+ consecutive newlines to 2 (one blank line max), trim trailing whitespace per line
  return text
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function setInputText(text: string) {
  if (!lastInputEl) return;
  const normalized = normalizeText(text);
  if (lastInputEl.tagName === "TEXTAREA") {
    const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    nativeInputSetter?.call(lastInputEl, normalized);
    lastInputEl.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    // Contenteditable (ChatGPT, Claude, Gemini) — must use execCommand to trigger React state
    lastInputEl.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(lastInputEl);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand("insertText", false, normalized);
    // Fallback if execCommand didn't take
    if ((lastInputEl.innerText || "").trim() !== normalized.trim()) {
      lastInputEl.innerText = normalized;
      lastInputEl.dispatchEvent(new InputEvent("input", { bubbles: true, data: normalized }));
    }
  }
}

// ─── Scan + clean ─────────────────────────────────────────────────────────────

async function scanCurrentInput() {
  const text = getInputText();
  if (!text.trim()) return;

  const res = await chrome.runtime.sendMessage({ type: "SCAN_TEXT", payload: text });
  const count = res?.result?.matches?.length || 0;
  updateBadge(count);
}

async function autoReplaceCurrentInput() {
  const text = getInputText();
  if (!text.trim()) return;

  const res = await chrome.runtime.sendMessage({ type: "SCAN_TEXT", payload: text });
  if (!res?.result) return;

  const { anonymized, matches } = res.result;
  updateBadge(matches.length);

  if (matches.length === 0) return;

  isAutoReplacing = true;
  setInputText(anonymized);
  showToast(`${matches.length} item${matches.length > 1 ? "s" : ""} auto-replaced`);
  setTimeout(() => { isAutoReplacing = false; }, 100);
}

async function cleanAndSend() {
  const text = getInputText();
  if (!text.trim()) return;

  const res = await chrome.runtime.sendMessage({ type: "SCAN_TEXT", payload: text });
  if (!res?.result) return;

  const { anonymized, matches } = res.result;
  if (matches.length === 0) {
    triggerSend();
    return;
  }

  setInputText(anonymized);
  updateBadge(matches.length);
  setTimeout(() => triggerSend(), 50);
}

async function deAnonymizeInput() {
  const text = getInputText();
  if (!text.trim()) return;
  const res = await chrome.runtime.sendMessage({ type: "GET_VAULT" });
  const vault = (res?.vault ?? {}) as Record<string, string>;
  if (Object.keys(vault).length === 0) { showToast("Vault is empty"); return; }
  let result = text;
  let count = 0;
  for (const [token, value] of Object.entries(vault)) {
    const escaped = token.replace(/[[\]]/g, "\\$&");
    const before = result;
    result = result.replace(new RegExp(escaped, "g"), value);
    if (result !== before) count++;
  }
  if (count > 0) {
    setInputText(result);
    showToast(`${count} item${count > 1 ? "s" : ""} restored`);
  } else {
    showToast("No tokens found in input");
  }
}

function triggerSend() {
  if (!siteConfig) return;
  for (const sel of siteConfig.sendButtonSelectors) {
    const btn = document.querySelector(sel) as HTMLButtonElement | null;
    if (btn && !btn.disabled) {
      btn.click();
      return;
    }
  }
}

// ─── Shield button injection ──────────────────────────────────────────────────

function injectShieldButton(inputEl: HTMLElement) {
  if (document.getElementById(BUTTON_ID)) return;

  const container = inputEl.closest("form") || inputEl.parentElement;
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.id = BUTTON_ID;
  wrapper.style.cssText = `
    position: fixed;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 6px;
    pointer-events: all;
  `;

  const btnStyle = (border: string, color: string) => `
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: #000;
    border: 1.5px solid ${border};
    color: ${color};
    font-size: 11px;
    font-weight: 600;
    font-family: ui-monospace, monospace;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.15s;
    white-space: nowrap;
  `;

  // ── Scan button
  const scanBtn = document.createElement("button");
  scanBtn.type = "button";
  scanBtn.title = "Scan & anonymize personal data";
  scanBtn.style.cssText = btnStyle("#22c55e", "#22c55e");
  scanBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
    <span id="${BADGE_ID}">Scan</span>
  `;
  scanBtn.addEventListener("mouseenter", () => { if (!isScanning) scanBtn.style.background = "#22c55e20"; });
  scanBtn.addEventListener("mouseleave", () => { scanBtn.style.background = "#000"; });

  scanBtn.addEventListener("click", async () => {
    if (isScanning) return; // prevent double-click

    const text = getInputText();
    if (!text.trim()) return;

    // Toggle: if already anonymized, undo it
    if (isAnonymized) {
      await deAnonymizeInput();
      isAnonymized = false;
      updateBadgeEl("Scan");
      scanBtn.style.borderColor = "#22c55e";
      scanBtn.style.color = "#22c55e";
      return;
    }

    // Show scanning state immediately so user knows it's working
    isScanning = true;
    updateBadgeEl("⟳ Scanning...");
    scanBtn.style.opacity = "0.8";
    scanBtn.style.cursor = "wait";

    const res = await chrome.runtime.sendMessage({ type: "SCAN_TEXT", payload: text });
    const { anonymized, matches } = res?.result || {};

    isScanning = false;
    scanBtn.style.opacity = "1";
    scanBtn.style.cursor = "pointer";

    if (!matches || matches.length === 0) {
      updateBadgeEl("✓ Clean");
      return;
    }

    setInputText(anonymized);
    isAnonymized = true;
    updateBadgeEl(`🛡 ${matches.length} hidden`);
    scanBtn.style.borderColor = "#f59e0b";
    scanBtn.style.color = "#f59e0b";
    showToast(`${matches.length} item${matches.length > 1 ? "s" : ""} hidden — safe to send`);
  });

  // ── Restore responses button (always visible — manual trigger for rehydration)
  const restoreBtn = document.createElement("button");
  restoreBtn.type = "button";
  restoreBtn.title = "Restore real values in AI responses";
  restoreBtn.style.cssText = btnStyle("#6366f1", "#6366f1");
  restoreBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/>
    </svg>
    <span>Restore</span>
  `;
  restoreBtn.addEventListener("mouseenter", () => { restoreBtn.style.background = "#6366f120"; });
  restoreBtn.addEventListener("mouseleave", () => { restoreBtn.style.background = "#000"; });
  restoreBtn.addEventListener("click", async () => {
    restoreBtn.style.opacity = "0.6";
    // Force re-hydration by clearing hydrated flags first
    document.querySelectorAll("[data-pl-hydrated]").forEach(el => el.removeAttribute("data-pl-hydrated"));
    await rehydrateResponses();
    restoreBtn.style.opacity = "1";
    showToast("Responses restored");
  });

  wrapper.appendChild(scanBtn);
  wrapper.appendChild(restoreBtn);

  document.body.appendChild(wrapper);

  // Continuous repositioning via rAF — handles SPA layout shifts, scroll, resize, new chats
  let rafId: number;
  function reposition() {
    if (!document.getElementById(BUTTON_ID)) { cancelAnimationFrame(rafId); return; }
    positionShieldButton(wrapper, inputEl);
    rafId = requestAnimationFrame(reposition);
  }
  rafId = requestAnimationFrame(reposition);
}

function positionShieldButton(wrapper: HTMLElement, inputEl: HTMLElement) {
  if (!siteConfig) return;
  // Try send button anchor first, fall back to input element
  let anchor: Element | null = null;
  for (const sel of siteConfig.sendButtonSelectors) {
    anchor = document.querySelector(sel);
    if (anchor) break;
  }
  const rect = anchor ? anchor.getBoundingClientRect() : inputEl.getBoundingClientRect();
  // Only update if position actually changed (avoids thrashing)
  const newTop = `${rect.top - 40}px`;
  const newLeft = `${rect.left}px`;
  if (wrapper.style.top !== newTop) wrapper.style.top = newTop;
  if (wrapper.style.left !== newLeft) wrapper.style.left = newLeft;
}

function updateBadge(count: number) {
  const span = document.getElementById(BADGE_ID);
  if (!span) return;
  span.textContent = count === 0 ? "Scan" : `🛡 ${count} found`;
}

function updateBadgeEl(text: string) {
  const span = document.getElementById(BADGE_ID);
  if (span) span.textContent = text;
}

function removeBadge() {
  document.getElementById(BUTTON_ID)?.remove();
}

// ─── Response re-hydration ────────────────────────────────────────────────────

function observeResponses() {
  const obs = new MutationObserver(() => {
    if (!settings.autoRehydrate) return;
    if (rehydrateTimer) clearTimeout(rehydrateTimer);
    rehydrateTimer = setTimeout(rehydrateResponses, 350);
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}

async function rehydrateResponses() {
  if (!siteConfig) return;
  const res = await chrome.runtime.sendMessage({ type: "GET_VAULT" });
  if (!res?.vault || Object.keys(res.vault).length === 0) return;

  for (const sel of siteConfig.responseSelectors) {
    document.querySelectorAll(sel).forEach((el) => {
      if (el.getAttribute("data-pl-hydrated") === "true") return;
      const html = el.innerHTML;
      if (!HAS_TOKEN.test(html)) return;  // non-global regex, no lastIndex issue

      let newHtml = html;
      for (const [token, value] of Object.entries(res.vault as Record<string, string>)) {
        const escaped = token.replace(/[[\]]/g, "\\$&");
        newHtml = newHtml.replace(
          new RegExp(escaped, "g"),
          `<span class="pl-restored" title="Restored by PrivacyLayer">${escapeHtml(value)}</span>`
        );
      }
      if (newHtml !== html) {
        el.innerHTML = newHtml;
        el.setAttribute("data-pl-hydrated", "true");
      }
    });
  }
}

// ─── Picker / de-anonymize mode ───────────────────────────────────────────────

function enterPickerMode() {
  if (pickerMode) return;
  pickerMode = true;
  document.addEventListener("mouseover", onPickerHover, true);
  document.addEventListener("mouseout", onPickerOut, true);
  document.addEventListener("click", onPickerClick, true);
  document.addEventListener("keydown", onPickerEsc, true);
  showPickerBar();
}

function exitPickerMode() {
  pickerMode = false;
  clearPickerHighlight();
  document.removeEventListener("mouseover", onPickerHover, true);
  document.removeEventListener("mouseout", onPickerOut, true);
  document.removeEventListener("click", onPickerClick, true);
  document.removeEventListener("keydown", onPickerEsc, true);
  document.getElementById(PICKER_BAR_ID)?.remove();
}

function clearPickerHighlight() {
  if (pickerHighlighted) {
    pickerHighlighted.style.removeProperty("outline");
    pickerHighlighted.style.removeProperty("outline-offset");
    pickerHighlighted = null;
  }
}

function onPickerHover(e: MouseEvent) {
  const el = e.target as HTMLElement;
  // Don't highlight our own injected UI
  if (el.closest(`#${PICKER_BAR_ID}, #${PICKER_MODAL_ID}, #${BUTTON_ID}`)) return;
  clearPickerHighlight();
  pickerHighlighted = el;
  el.style.outline = "2px solid #22c55e";
  el.style.outlineOffset = "2px";
}

function onPickerOut(e: MouseEvent) {
  if (pickerHighlighted === e.target) clearPickerHighlight();
}

function onPickerEsc(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopImmediatePropagation();
    exitPickerMode();
  }
}

async function onPickerClick(e: MouseEvent) {
  const el = e.target as HTMLElement;
  if (el.closest(`#${PICKER_BAR_ID}`)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  exitPickerMode();
  await pickElement(el);
}

async function pickElement(el: HTMLElement) {
  const res = await chrome.runtime.sendMessage({ type: "GET_VAULT" });
  const vault = (res?.vault ?? {}) as Record<string, string>;
  if (Object.keys(vault).length === 0) {
    showToast("Vault is empty — nothing to restore");
    return;
  }

  const text = el.innerText || el.textContent || "";
  const found: Record<string, string> = {};
  let m;
  const re = TOKEN_RE_G();
  while ((m = re.exec(text)) !== null) {
    if (vault[m[0]]) found[m[0]] = vault[m[0]];
  }

  if (Object.keys(found).length === 0) {
    showToast("No tokens found in this element");
    return;
  }

  showPickerConfirm(el, found);
}

function showPickerBar() {
  const bar = document.createElement("div");
  bar.id = PICKER_BAR_ID;
  bar.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0;
    z-index: 2147483647;
    background: #0a0a0a;
    border-bottom: 1.5px solid #22c55e;
    color: #22c55e;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    font-weight: 600;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  bar.innerHTML = `
    <span style="display:flex;align-items:center;gap:8px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Click any element to de-anonymize it
    </span>
    <span style="color:#555;font-size:11px">Esc to cancel</span>
  `;
  document.body.appendChild(bar);
}

function showPickerConfirm(el: HTMLElement, found: Record<string, string>) {
  const entries = Object.entries(found);

  const overlay = document.createElement("div");
  overlay.id = PICKER_MODAL_ID;
  overlay.style.cssText = `
    position: fixed; inset: 0;
    z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.65);
    font-family: ui-monospace, 'SF Mono', monospace;
  `;

  const rows = entries.map(([token, value]) => `
    <div style="display:flex;align-items:baseline;gap:10px;padding:6px 0;border-bottom:1px solid #1a1a1a;">
      <span style="color:#22c55e;font-size:11px;min-width:110px;flex-shrink:0">${token}</span>
      <span style="color:#444;font-size:11px">→</span>
      <span style="color:#e5e5e5;font-size:11px;word-break:break-all">${escapeHtml(value)}</span>
    </div>
  `).join("");

  overlay.innerHTML = `
    <div style="background:#0f0f0f;border:1.5px solid #22c55e33;border-radius:6px;padding:20px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px">De-anonymize element?</div>
      <div style="font-size:11px;color:#555;margin-bottom:14px">${entries.length} token${entries.length > 1 ? "s" : ""} will be restored</div>
      <div style="margin-bottom:16px">${rows}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="pl-confirm-cancel" style="padding:6px 14px;background:transparent;border:1px solid #2a2a2a;color:#666;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;border-radius:3px">Cancel</button>
        <button id="pl-confirm-ok" style="padding:6px 14px;background:#22c55e15;border:1px solid #22c55e;color:#22c55e;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;border-radius:3px">Restore</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector("#pl-confirm-cancel")!.addEventListener("click", () => overlay.remove());
  overlay.querySelector("#pl-confirm-ok")!.addEventListener("click", () => {
    overlay.remove();
    restoreElement(el, found);
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}

function restoreElement(el: HTMLElement, found: Record<string, string>) {
  let html = el.innerHTML;
  for (const [token, value] of Object.entries(found)) {
    const escaped = token.replace(/[[\]]/g, "\\$&");
    html = html.replace(
      new RegExp(escaped, "g"),
      `<span class="pl-restored" title="Restored by PrivacyLayer">${escapeHtml(value)}</span>`
    );
  }
  el.innerHTML = html;
  const n = Object.keys(found).length;
  showToast(`${n} item${n > 1 ? "s" : ""} restored`);
}

// ─── Toast notification ───────────────────────────────────────────────────────

function showToast(msg: string) {
  document.getElementById("pl-toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "pl-toast";
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px; right: 24px;
    z-index: 99999;
    background: #000;
    border: 1.5px solid #22c55e;
    color: #22c55e;
    font-size: 12px; font-weight: 600;
    font-family: ui-monospace, monospace;
    padding: 8px 14px;
    border-radius: 4px;
    pointer-events: none;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
