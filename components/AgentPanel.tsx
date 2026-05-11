"use client";

import { CHARACTER_BY_ID, CHARACTERS } from "@/lib/characters";
import { placeAt } from "@/lib/world";
import { useSim } from "@/lib/simulation";

function actionLabel(a: ReturnType<typeof useSim.getState>["agents"][string]): string {
  if (a.targetPos) return "🚶 走路中";
  const act = a.currentAction;
  if (!act) return "🤔 还没想好";
  if (act.type === "say") return `💬 说话：「${act.utterance ?? ""}」`;
  if (act.type === "do") return `🎈 ${act.activity ?? "在做事"}`;
  if (act.type === "wait") return "⏳ 等一会儿";
  if (act.type === "go_to") return "🚶 出发";
  return "·";
}

export function AgentRoster() {
  const agents = useSim((s) => s.agents);
  const selectedId = useSim((s) => s.selectedAgentId);
  const selectAgent = useSim((s) => s.selectAgent);

  return (
    <div className="panel p-3">
      <h3 className="text-sm font-bold text-stone-700 mb-2">角色名册</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {CHARACTERS.map((c) => {
          const a = agents[c.id];
          const sel = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => selectAgent(sel ? null : c.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left border transition ${
                sel ? "border-stone-800 bg-stone-100" : "border-black/10 bg-white hover:bg-black/5"
              }`}
            >
              <span
                className="inline-block w-6 h-6 rounded-full text-center leading-6 text-white text-sm shrink-0"
                style={{ background: c.color }}
              >
                {c.emoji}
              </span>
              <span className="min-w-0">
                <div className="text-[12px] font-semibold truncate">{c.name}</div>
                <div className="text-[10px] text-stone-500 truncate">
                  {a?.isDeciding ? "思考中…" : placeAt(a?.pos ?? { x: 0, y: 0 })?.name ?? "街上"}
                </div>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AgentInspector() {
  const selectedId = useSim((s) => s.selectedAgentId);
  const agent = useSim((s) => (selectedId ? s.agents[selectedId] : null));

  if (!selectedId || !agent) {
    return (
      <div className="panel p-3">
        <h3 className="text-sm font-bold text-stone-700 mb-1">角色详情</h3>
        <p className="text-[12px] text-stone-500">点击地图上或名册里的角色查看 TA 的内心戏。</p>
      </div>
    );
  }
  const persona = CHARACTER_BY_ID[selectedId];
  const placeName = placeAt(agent.pos)?.name ?? "街道上";

  return (
    <div className="panel p-3">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block w-8 h-8 rounded-full text-center leading-8 text-white text-lg"
          style={{ background: persona.color }}
        >
          {persona.emoji}
        </span>
        <div>
          <div className="text-sm font-bold">{persona.name}</div>
          <div className="text-[11px] text-stone-500">
            {persona.age} 岁 · 在 {placeName}
          </div>
        </div>
      </div>

      <div className="text-[12px] space-y-2">
        <div>
          <div className="text-stone-500 text-[11px]">当前动作</div>
          <div>{actionLabel(agent)}</div>
        </div>
        {agent.thought?.trim() && (
          <div>
            <div className="text-stone-500 text-[11px]">最近一次想法</div>
            <div className="italic text-stone-700">{agent.thought}</div>
          </div>
        )}
        <div>
          <div className="text-stone-500 text-[11px]">人设</div>
          <div className="text-stone-700 text-[11px] leading-snug">{persona.persona}</div>
        </div>
        <div>
          <div className="text-stone-500 text-[11px]">记忆（最近 8 条）</div>
          <ul className="space-y-0.5 text-[11px] text-stone-700">
            {agent.memory.slice(-8).map((m, i) => (
              <li key={i}>
                <span className="text-stone-400 tabular-nums">t={m.tick}</span> {m.text}
              </li>
            ))}
            {agent.memory.length === 0 && <li className="text-stone-400">（暂无）</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
