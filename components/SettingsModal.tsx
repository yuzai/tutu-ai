"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PRESETS, useConfig, type LLMConfig } from "@/lib/config";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModal({ open, onClose }: Props) {
  const config = useConfig((s) => s.config);
  const hydrated = useConfig((s) => s.hydrated);
  const setConfig = useConfig((s) => s.setConfig);
  const resetConfig = useConfig((s) => s.resetConfig);
  const [draft, setDraft] = useState<LLMConfig>(config);
  const [showKey, setShowKey] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (open) setDraft(config);
  }, [open, config]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // 弹窗打开时禁止页面滚动
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !portalReady) return null;

  function applyPreset(patch: Partial<LLMConfig>) {
    // 应用预设但保留用户已填的 apiKey（除非预设里明确指定）
    setDraft((d) => ({
      ...d,
      ...patch,
      apiKey: patch.apiKey !== undefined ? patch.apiKey : d.apiKey,
    }));
  }

  function save() {
    setConfig(draft);
    onClose();
  }

  function reset() {
    if (!confirm("重置为默认 Ollama 本地配置？localStorage 中保存的配置会被清除。")) return;
    resetConfig();
    onClose();
  }

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">LLM 配置</h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              修改后保存到本地浏览器，下次访问还在。所有调用都用你填的 key，不会用服务端默认。
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-xl leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!hydrated && (
            <div className="text-[11px] text-stone-400">从本地加载中…</div>
          )}

          {/* 预设 */}
          <div>
            <div className="text-[11px] font-semibold text-stone-500 mb-1.5">快速预设</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.patch)}
                  className="text-[11px] px-2 py-1 rounded border border-black/10 bg-white hover:bg-stone-50"
                  title={p.hint}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 本地模型遵从度提醒 */}
          {/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(draft.baseURL) && (
            <div className="text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
              💡 <b>本地小模型遵从度有限</b>。3B-7B 的模型可能：JSON 格式不严谨、漏字段、把不在身边的人喊作 target、忽略时间提示不睡觉、动作选错。**适合本地体验/调试**；想看流畅的角色互动建议用 DeepSeek 等远端 API。
            </div>
          )}

          {/* baseURL */}
          <Field label="Base URL" hint="OpenAI 兼容端点，结尾通常带 /v1">
            <input
              type="text"
              value={draft.baseURL}
              onChange={(e) => setDraft({ ...draft, baseURL: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-black/10 rounded text-[13px] font-mono focus:outline-none focus:border-stone-500"
              placeholder="https://api.deepseek.com/v1"
            />
          </Field>

          {/* apiKey */}
          <Field label="API Key" hint="本地 Ollama 任意填；远端服务必须真实 key">
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                className="flex-1 px-2.5 py-1.5 border border-black/10 rounded text-[13px] font-mono focus:outline-none focus:border-stone-500"
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="text-[11px] px-2 rounded border border-black/10 hover:bg-stone-50"
              >
                {showKey ? "隐藏" : "显示"}
              </button>
            </div>
          </Field>

          {/* model */}
          <Field label="模型名" hint="例如 qwen2.5:3b-instruct / deepseek-chat / gpt-4o-mini">
            <input
              type="text"
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-black/10 rounded text-[13px] font-mono focus:outline-none focus:border-stone-500"
              placeholder="deepseek-chat"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Max Tokens" hint="单次输出上限">
              <input
                type="number"
                min={100}
                max={8000}
                step={100}
                value={draft.maxTokens}
                onChange={(e) => setDraft({ ...draft, maxTokens: Number(e.target.value) || 600 })}
                className="w-full px-2.5 py-1.5 border border-black/10 rounded text-[13px] font-mono focus:outline-none focus:border-stone-500"
              />
            </Field>

            <Field label="并发上限" hint="本地 2-5 / 远端 10-20">
              <input
                type="number"
                min={1}
                max={64}
                step={1}
                value={draft.maxConcurrent}
                onChange={(e) => setDraft({ ...draft, maxConcurrent: Number(e.target.value) || 4 })}
                className="w-full px-2.5 py-1.5 border border-black/10 rounded text-[13px] font-mono focus:outline-none focus:border-stone-500"
              />
            </Field>

            <Field label="Tick 间隔(ms)" hint="每 tick 真实毫秒">
              <input
                type="number"
                min={200}
                max={20000}
                step={100}
                value={draft.tickIntervalMs}
                onChange={(e) => setDraft({ ...draft, tickIntervalMs: Number(e.target.value) || 2500 })}
                className="w-full px-2.5 py-1.5 border border-black/10 rounded text-[13px] font-mono focus:outline-none focus:border-stone-500"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <Toggle
              label="JSON 模式"
              hint="远端 API 建议开；本地 Qwen3 思考模型关"
              checked={draft.jsonMode}
              onChange={(v) => setDraft({ ...draft, jsonMode: v })}
            />
            <Toggle
              label="禁用思考"
              hint="Qwen3 加 /no_think；DeepSeek V4 设 thinking.disabled"
              checked={draft.disableThinking}
              onChange={(v) => setDraft({ ...draft, disableThinking: v })}
            />
            <Toggle
              label="终端调试日志"
              hint="Next 终端打印每次 LLM 请求摘要"
              checked={draft.debug}
              onChange={(v) => setDraft({ ...draft, debug: v })}
            />
            <Toggle
              label="详细日志（含 prompt）"
              hint="只在调 prompt 时开，平时太啰嗦"
              checked={draft.verbose}
              onChange={(v) => setDraft({ ...draft, verbose: v })}
            />
          </div>

          {/* DeepSeek V4 专属：思考深度。其他模型忽略此项。 */}
          {/deepseek[-_/]v4/i.test(draft.model) && !draft.disableThinking && (
            <Field label="思考深度（仅 DeepSeek V4）" hint="high = 普通 / max = 极致推理（贵）">
              <select
                value={draft.reasoningEffort}
                onChange={(e) => setDraft({ ...draft, reasoningEffort: e.target.value as "high" | "max" })}
                className="w-full px-2.5 py-1.5 border border-black/10 rounded text-[13px] focus:outline-none focus:border-stone-500"
              >
                <option value="high">high — 平衡（推荐）</option>
                <option value="max">max — 极致推理</option>
              </select>
            </Field>
          )}
        </div>

        <div className="p-5 border-t border-black/5 flex items-center justify-between gap-2">
          <button
            onClick={reset}
            className="text-[12px] text-stone-500 hover:text-stone-800 underline underline-offset-2"
          >
            重置为默认
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn">
              取消
            </button>
            <button onClick={save} className="btn-primary">
              保存
            </button>
          </div>
        </div>
      </div>

    </div>
  );

  return createPortal(modal, document.body);
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-stone-600 mb-1 flex items-baseline gap-2">
        <span>{label}</span>
        {hint && <span className="text-stone-400 font-normal">— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
      <span className="text-[12px] font-medium">{label}</span>
      {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
    </label>
  );
}
