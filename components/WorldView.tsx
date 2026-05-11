"use client";

import { useMemo } from "react";
import { useSim } from "@/lib/simulation";
import { getScenarioById } from "@/lib/scenarios";
import type { AgentRuntime, CharacterPersona } from "@/lib/types";

const CELL = 28;
// 走路过渡时长固定 600ms，与 tick 速度无关 — 1× 和 4× 看起来都"轻快一步"，
// 而不是 1× 时拖很慢、4× 时飞快。
const MOVE_STYLE: React.CSSProperties = {
  transition: "transform 600ms ease-out",
};

export function WorldView() {
  const agents = useSim((s) => s.agents);
  const selectedId = useSim((s) => s.selectedAgentId);
  const selectAgent = useSim((s) => s.selectAgent);
  const scenarioId = useSim((s) => s.scenarioId);

  const scenario = useMemo(() => getScenarioById(scenarioId), [scenarioId]);
  const PLACES = scenario.places;
  const CHARACTERS = scenario.characters;

  const W = scenario.world.width * CELL;
  const H = scenario.world.height * CELL;

  return (
    <div className="panel p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-full rounded-lg"
        preserveAspectRatio="xMidYMid meet"
        style={{ background: "#f4ecd8" }}
      >
        <defs>
          <pattern id="grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={0.5} />
          </pattern>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.2" />
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#grid)" />

        {PLACES.map((p) => (
          <g key={p.id}>
            <rect
              x={p.rect.x * CELL}
              y={p.rect.y * CELL}
              width={p.rect.w * CELL}
              height={p.rect.h * CELL}
              rx={10}
              fill={p.color}
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={1.5}
              opacity={0.85}
            />
            <text
              x={p.rect.x * CELL + (p.rect.w * CELL) / 2}
              y={p.rect.y * CELL + 16}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="rgba(0,0,0,0.65)"
            >
              {p.emoji} {p.name}
            </text>
          </g>
        ))}

        {/* Pass 1: 角色本体（圆 + emoji + 名字 + activity 小标签） */}
        {CHARACTERS.map((c) => {
          const a = agents[c.id];
          if (!a) return null;
          const cx = a.pos.x * CELL + CELL / 2;
          const cy = a.pos.y * CELL + CELL / 2;
          const isSelected = selectedId === c.id;
          return (
            <g
              key={`body-${c.id}`}
              transform={`translate(${cx}, ${cy})`}
              onClick={() => selectAgent(isSelected ? null : c.id)}
              style={{ cursor: "pointer", ...MOVE_STYLE }}
            >
              {a.targetPos && (
                <line
                  x1={0}
                  y1={0}
                  x2={(a.targetPos.x - a.pos.x) * CELL}
                  y2={(a.targetPos.y - a.pos.y) * CELL}
                  stroke={c.color}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
              )}
              <circle
                r={CELL * 0.55}
                fill={c.color}
                stroke={isSelected ? "#222" : "rgba(0,0,0,0.25)"}
                strokeWidth={isSelected ? 2.5 : 1.2}
                filter="url(#softShadow)"
              />
              <text textAnchor="middle" dy={5} fontSize={CELL * 0.7}>
                {c.emoji}
              </text>
              <text
                textAnchor="middle"
                dy={CELL * 0.85}
                fontSize={11}
                fontWeight={600}
                fill="#222"
                style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.85)", strokeWidth: 3 }}
              >
                {c.name}
              </text>
              <ActivityTag agent={a} />
              {a.isDeciding && (
                <circle r={CELL * 0.65} fill="none" stroke="#ffa500" strokeWidth={1.5} opacity={0.6}>
                  <animate attributeName="r" values={`${CELL * 0.55};${CELL * 0.85};${CELL * 0.55}`} dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.4s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Pass 2: 头顶 overlay（thought + speech）— 整体放在所有角色 body 之上，避免被其他人挡住 */}
        {CHARACTERS.map((c) => renderOverlay(c, agents[c.id]))}
      </svg>
    </div>
  );
}

function renderOverlay(c: CharacterPersona, a: AgentRuntime | undefined) {
  if (!a) return null;
  if (!a.thoughtBubble && !a.speech) return null;
  const cx = a.pos.x * CELL + CELL / 2;
  const cy = a.pos.y * CELL + CELL / 2;
  return (
    <g
      key={`overlay-${c.id}`}
      transform={`translate(${cx}, ${cy})`}
      style={{ pointerEvents: "none", ...MOVE_STYLE }}
    >
      {a.thoughtBubble && <ThoughtBubble text={a.thoughtBubble.text} />}
      {a.speech && <SpeechBubble text={a.speech.text} />}
    </g>
  );
}

// 角色头顶下方的小标签：do/sleep 时显示当前活动；有 speech 时隐藏（避免重叠）。
function ActivityTag({ agent }: { agent: AgentRuntime }) {
  if (agent.speech) return null;
  const act = agent.currentAction;
  if (!act) return null;
  let label = "";
  let emoji = "";
  if (act.type === "do" && act.activity) {
    emoji = "🎈";
    label = act.activity;
  } else if (act.type === "sleep") {
    emoji = "💤";
    label = "睡觉";
  } else {
    return null;
  }
  const truncated = label.length > 10 ? label.slice(0, 9) + "…" : label;
  const w = Math.max(40, truncated.length * 10 + 22);
  return (
    <g transform={`translate(${-w / 2}, ${CELL * 1.05})`}>
      <rect
        width={w}
        height={16}
        rx={8}
        fill="rgba(255,255,255,0.92)"
        stroke="rgba(0,0,0,0.12)"
        strokeWidth={0.75}
      />
      <text x={w / 2} y={11.5} textAnchor="middle" fontSize={10} fill="#555">
        {emoji} {truncated}
      </text>
    </g>
  );
}

// 多行对话气泡：用 foreignObject 嵌入 HTML，支持自动换行。
function SpeechBubble({ text }: { text: string }) {
  const maxWidth = 180;
  const foreignHeight = CELL * 3.2;
  return (
    <g transform={`translate(0, ${-CELL * 1.2 - foreignHeight})`}>
      <foreignObject
        x={-maxWidth / 2}
        y={0}
        width={maxWidth}
        height={foreignHeight}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid rgba(0,0,0,0.18)",
              borderRadius: "10px",
              padding: "4px 10px",
              fontSize: "11px",
              lineHeight: "1.35",
              color: "#222",
              maxWidth: `${maxWidth - 12}px`,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            {text}
          </div>
        </div>
      </foreignObject>
      <polygon
        points={`-5,${foreignHeight} 5,${foreignHeight} 0,${foreignHeight + 7}`}
        fill="white"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth={1}
      />
    </g>
  );
}

// 想法冒泡：贴在人物右上方，静态显示（无动画），过期自动消失。
function ThoughtBubble({ text }: { text: string }) {
  const maxWidth = 140;
  const foreignHeight = CELL * 2.2;
  return (
    <g transform={`translate(${CELL * 0.6}, ${-CELL * 1.0 - foreignHeight})`}>
      <foreignObject
        x={0}
        y={0}
        width={maxWidth}
        height={foreignHeight}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              border: "1px dashed rgba(0,0,0,0.25)",
              borderRadius: "12px",
              padding: "3px 9px",
              fontSize: "10.5px",
              fontStyle: "italic",
              lineHeight: "1.3",
              color: "#666",
              maxWidth: `${maxWidth - 12}px`,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            💭 {text}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
