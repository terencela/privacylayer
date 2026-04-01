export type MessageType =
  | "SCAN_TEXT"
  | "SCAN_RESULT"
  | "GET_VAULT"
  | "VAULT_DATA"
  | "CLEAR_VAULT"
  | "GET_SETTINGS"
  | "SET_SETTINGS"
  | "GET_STATUS"
  | "ENTER_PICK_MODE";

export interface ExtMessage {
  type: MessageType;
  payload?: unknown;
}

export interface Settings {
  enabled: boolean;
  autoScan: boolean;
  autoReplace: boolean;
  autoClean: boolean;
  autoRehydrate: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  autoScan: true,
  autoReplace: true,
  autoClean: false,
  autoRehydrate: true,
};

export interface VaultEntry {
  token: string;
  value: string;
  type: string;
  risk: string;
}

export interface SiteConfig {
  name: string;
  inputSelectors: string[];
  sendButtonSelectors: string[];
  responseSelectors: string[];
}
