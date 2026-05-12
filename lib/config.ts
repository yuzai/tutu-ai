"use client";

import { create } from "zustand";

const STORAGE_KEY = "tutu-llm-config";

export type LLMConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  jsonMode: boolean;
  disableThinking: boolean;
  reasoningEffort: "high" | "max";
  maxConcurrent: number;
  tickIntervalMs: number;
  debug: boolean;
  verbose: boolean;
};

// 默认指向本地 Ollama，未配置 key 也能在本地跑通。
const DEFAULTS: LLMConfig = {
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
  model: "qwen2.5:3b-instruct",
  maxTokens: 600,
  jsonMode: false,
  disableThinking: false,
  reasoningEffort: "high",
  maxConcurrent: 4,
  tickIntervalMs: 2500,
  debug: true,
  verbose: false,
};

export type LLMPreset = {
  id: string;
  label: string;
  hint: string;
  patch: Partial<LLMConfig>;
};

export const PRESETS: LLMPreset[] = [
  {
    id: "ollama",
    label: "Ollama 本地",
    hint: "免费 · 1-3s/次 · qwen2.5:3b-instruct",
    patch: { baseURL: "http://localhost:11434/v1", apiKey: "ollama", model: "qwen2.5:3b-instruct", jsonMode: false, disableThinking: false, maxConcurrent: 4 },
  },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    hint: "云端 · 快 · 推荐 ⭐",
    patch: { baseURL: "https://api.deepseek.com/v1", model: "deepseek-v4-flash", jsonMode: true, disableThinking: true, maxConcurrent: 16 },
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    hint: "云端 · 强 · 1.6T params",
    patch: { baseURL: "https://api.deepseek.com/v1", model: "deepseek-v4-pro", jsonMode: true, disableThinking: true, maxConcurrent: 16 },
  },
];

// 部署到云端时，localhost Ollama 显然连不上。第一次访问且本地无配置时，
// 自动切到云端预设（key 留空，访客自己填）。本地开发(localhost)继续用 Ollama。
function pickFreshDefaults(): LLMConfig {
  if (typeof window === "undefined") return DEFAULTS;
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  if (isLocal) return DEFAULTS;
  const cloud = PRESETS.find((p) => p.id === "deepseek-v4-flash")?.patch ?? {};
  return { ...DEFAULTS, ...cloud, apiKey: "" };
}

function loadFromStorage(): LLMConfig {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return pickFreshDefaults();
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return pickFreshDefaults();
  }
}

function saveToStorage(config: LLMConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* quota / private mode */
  }
}

type ConfigState = {
  config: LLMConfig;
  hydrated: boolean;
  setConfig: (patch: Partial<LLMConfig>) => void;
  resetConfig: () => void;
  hydrate: () => void;
};

export const useConfig = create<ConfigState>((set, get) => ({
  config: DEFAULTS,
  hydrated: false,
  setConfig: (patch) => {
    const next = { ...get().config, ...patch };
    saveToStorage(next);
    set({ config: next });
  },
  resetConfig: () => {
    const fresh = pickFreshDefaults();
    saveToStorage(fresh);
    set({ config: fresh });
  },
  hydrate: () => {
    if (get().hydrated) return;
    set({ config: loadFromStorage(), hydrated: true });
  },
}));

export function configIsUsable(c: LLMConfig): boolean {
  return Boolean(c.baseURL && c.model);
}

export function maskKey(key: string): string {
  if (!key) return "（空）";
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 4) + "…" + key.slice(-3);
}
