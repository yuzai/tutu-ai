"use client";

import { useMemo, useState } from "react";
import { useSim } from "@/lib/simulation";
import { getScenarioById } from "@/lib/scenarios";

export function UserSayPanel() {
  const scenarioId = useSim((s) => s.scenarioId);
  const injectUserSpeech = useSim((s) => s.injectUserSpeech);
  const scenario = useMemo(() => getScenarioById(scenarioId), [scenarioId]);
  const [target, setTarget] = useState<string>("");
  const [text, setText] = useState("");

  function send() {
    const t = text.trim();
    if (!t) return;
    injectUserSpeech(t, target || null);
    setText("");
  }

  return (
    <div className="panel p-2.5 flex items-center gap-2 text-[12px]">
      <span className="shrink-0 text-stone-600">👤 你（路人）</span>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="text-[12px] px-1.5 py-1 rounded border border-black/10 bg-white max-w-[100px]"
        title="对谁说"
      >
        <option value="">对所有人</option>
        {scenario.characters.map((c) => (
          <option key={c.id} value={c.id}>
            对 {c.name}
          </option>
        ))}
      </select>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="插一句话，看看 AI 角色怎么回应你…"
        className="flex-1 px-2.5 py-1 rounded border border-black/10 focus:outline-none focus:border-stone-500"
      />
      <button
        onClick={send}
        disabled={!text.trim()}
        className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        发送
      </button>
    </div>
  );
}
