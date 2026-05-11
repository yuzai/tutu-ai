"use client";

import { CHARACTERS, CHARACTER_BY_ID } from "@/lib/characters";
import { PLACES, WORLD_H, WORLD_W } from "@/lib/world";
import { useSim } from "@/lib/simulation";

const CELL = 28;

export function WorldView() {
  const agents = useSim((s) => s.agents);
  const selectedId = useSim((s) => s.selectedAgentId);
  const selectAgent = useSim((s) => s.selectAgent);

  const W = WORLD_W * CELL;
  const H = WORLD_H * CELL;

  return (
    <div className="panel p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-lg" style={{ background: "#f4ecd8" }}>
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

        {CHARACTERS.map((c) => {
          const a = agents[c.id];
          if (!a) return null;
          const cx = a.pos.x * CELL + CELL / 2;
          const cy = a.pos.y * CELL + CELL / 2;
          const isSelected = selectedId === c.id;
          return (
            <g
              key={c.id}
              transform={`translate(${cx}, ${cy})`}
              onClick={() => selectAgent(isSelected ? null : c.id)}
              style={{ cursor: "pointer" }}
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
              {a.isDeciding && (
                <circle r={CELL * 0.65} fill="none" stroke="#ffa500" strokeWidth={1.5} opacity={0.6}>
                  <animate attributeName="r" values={`${CELL * 0.55};${CELL * 0.85};${CELL * 0.55}`} dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.4s" repeatCount="indefinite" />
                </circle>
              )}
              {a.speech && <SpeechBubble text={a.speech.text} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SpeechBubble({ text }: { text: string }) {
  const truncated = text.length > 24 ? text.slice(0, 23) + "…" : text;
  const w = Math.max(60, Math.min(220, truncated.length * 11 + 16));
  return (
    <g transform={`translate(${-w / 2}, ${-CELL * 1.35})`}>
      <rect width={w} height={22} rx={10} fill="white" stroke="rgba(0,0,0,0.2)" />
      <polygon points={`${w / 2 - 5},22 ${w / 2 + 5},22 ${w / 2},30`} fill="white" stroke="rgba(0,0,0,0.2)" />
      <text x={w / 2} y={15} textAnchor="middle" fontSize={11} fill="#222">
        {truncated}
      </text>
    </g>
  );
}
