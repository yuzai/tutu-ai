"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSim } from "@/lib/simulation";
import { useConfig } from "@/lib/config";
import { getScenarioById } from "@/lib/scenarios";
import type { AgentRuntime, CharacterPersona } from "@/lib/types";

const CELL = 28;
const MIN_ZOOM_W_RATIO = 0.2;
const MAX_ZOOM_W_RATIO = 3;

type ViewBox = { x: number; y: number; w: number; h: number };

export function WorldView() {
  const agents = useSim((s) => s.agents);
  const selectedId = useSim((s) => s.selectedAgentId);
  const selectAgent = useSim((s) => s.selectAgent);
  const scenarioId = useSim((s) => s.scenarioId);
  const speed = useSim((s) => s.speed);
  const tickIntervalMs = useConfig((s) => s.config.tickIntervalMs);

  const scenario = useMemo(() => getScenarioById(scenarioId), [scenarioId]);
  const PLACES = scenario.places;
  const CHARACTERS = scenario.characters;

  const W = scenario.world.width * CELL;
  const H = scenario.world.height * CELL;

  // 走路过渡时长 = 当前真实 tick 间隔（linear），让多个 tick 之间首尾相接 → 看起来连续行走。
  // 配合 simulation 每 tick 走 3 格，1× 速也不会"挪一下停半秒"。
  const realTickMs = Math.max(120, Math.floor(tickIntervalMs / speed));
  const moveStyle: React.CSSProperties = useMemo(
    () => ({ transition: `transform ${realTickMs}ms linear` }),
    [realTickMs]
  );

  // viewBox state（pan + zoom）
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: W, h: H });
  const svgRef = useRef<SVGSVGElement>(null);

  // 切场景时重置视图
  useEffect(() => {
    setViewBox({ x: 0, y: 0, w: W, h: H });
  }, [W, H, scenarioId]);

  // 鼠标滚轮缩放（注册 native event 以便 preventDefault）
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      setViewBox((vb) => {
        const mx = ((e.clientX - rect.left) / rect.width) * vb.w + vb.x;
        const my = ((e.clientY - rect.top) / rect.height) * vb.h + vb.y;
        const scale = e.deltaY > 0 ? 1.15 : 1 / 1.15;
        const newW = Math.max(W * MIN_ZOOM_W_RATIO, Math.min(W * MAX_ZOOM_W_RATIO, vb.w * scale));
        const ratio = newW / vb.w;
        const newH = vb.h * ratio;
        return {
          x: mx - (mx - vb.x) * ratio,
          y: my - (my - vb.y) * ratio,
          w: newW,
          h: newH,
        };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [W]);

  // 拖动平移
  const dragRef = useRef<{ startClientX: number; startClientY: number; startX: number; startY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    // 右键不触发
    if (e.button !== 0) return;
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: viewBox.x,
      startY: viewBox.y,
    };
  }
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - drag.startClientX) / rect.width) * viewBox.w;
    const dy = ((e.clientY - drag.startClientY) / rect.height) * viewBox.h;
    if (!isDragging && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) setIsDragging(true);
    // 注意：把 startX/startY 提到外层变量，避免 functional updater 异步执行时 dragRef 已被清空报 null。
    const startX = drag.startX;
    const startY = drag.startY;
    setViewBox((vb) => ({ ...vb, x: startX - dx, y: startY - dy }));
  }
  function endDrag() {
    dragRef.current = null;
    // 微延迟让 click 事件先到 — 但因为 React click 会在 mouseup 时根据 mousedown/up 位置判断，drag 过会自动屏蔽 click。
    setTimeout(() => setIsDragging(false), 0);
  }

  return (
    <div className="panel p-3 relative">
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-auto max-h-full rounded-lg select-none"
        preserveAspectRatio="xMidYMid meet"
        style={{
          background: "#f4ecd8",
          cursor: dragRef.current ? "grabbing" : "grab",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        <defs>
          <pattern id="grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={0.5} />
          </pattern>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.2" />
          </filter>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill="url(#grid)" />

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

        {/* Pass 1: 角色本体 */}
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
              onClick={(e) => {
                // 拖动过就不算 click
                if (isDragging) {
                  e.stopPropagation();
                  return;
                }
                selectAgent(isSelected ? null : c.id);
              }}
              style={{ cursor: "pointer", ...moveStyle }}
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
              <ActivityTag agent={a} invScale={viewBox.w / W} />
              {a.isDeciding && (
                <circle r={CELL * 0.65} fill="none" stroke="#ffa500" strokeWidth={1.5} opacity={0.6}>
                  <animate attributeName="r" values={`${CELL * 0.55};${CELL * 0.85};${CELL * 0.55}`} dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.4s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Pass 2: 头顶气泡 — 总在所有角色之上，避免被其他人挡住。
            invScale 让气泡视觉大小不随 zoom 改变，文字始终清晰可读。 */}
        {CHARACTERS.map((c) => renderOverlay(c, agents[c.id], moveStyle, viewBox.w / W))}
      </svg>

      {/* 视图重置 + 缩放比例提示 */}
      <button
        onClick={() => setViewBox({ x: 0, y: 0, w: W, h: H })}
        className="absolute top-5 right-5 text-[11px] px-2 py-1 rounded bg-white/85 border border-black/10 hover:bg-white shadow-sm"
        title="重置视图（双击地图也可）"
      >
        🎯 重置视图
      </button>
      <div className="absolute bottom-5 right-5 text-[10px] text-stone-500 bg-white/70 px-1.5 py-0.5 rounded pointer-events-none">
        滚轮缩放 · 拖动平移 · {Math.round((W / viewBox.w) * 100)}%
      </div>
    </div>
  );
}

function renderOverlay(
  c: CharacterPersona,
  a: AgentRuntime | undefined,
  moveStyle: React.CSSProperties,
  invScale: number
) {
  if (!a) return null;
  // 说话压制想法：同时有时只显示 speech
  const showThought = !!a.thoughtBubble && !a.speech;
  if (!showThought && !a.speech) return null;
  const cx = a.pos.x * CELL + CELL / 2;
  const cy = a.pos.y * CELL + CELL / 2;
  return (
    <g
      key={`overlay-${c.id}`}
      transform={`translate(${cx}, ${cy})`}
      style={{ pointerEvents: "none", ...moveStyle }}
    >
      {/* scale(invScale) 让气泡视觉大小不随 zoom 变化 */}
      <g transform={`scale(${invScale})`}>
        {showThought && a.thoughtBubble && (
          <ThoughtBubble key={`tb-${a.thoughtBubble.createdTick}`} text={a.thoughtBubble.text} />
        )}
        {a.speech && <SpeechBubble text={a.speech.text} />}
      </g>
    </g>
  );
}

function ActivityTag({ agent, invScale }: { agent: AgentRuntime; invScale: number }) {
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
  const maxWidth = 110;
  const foreignHeight = 38;
  // scale(invScale) 让标签视觉大小不随 zoom 变化，文字始终清晰。
  return (
    <g transform={`translate(0, ${CELL * 1.0}) scale(${invScale})`}>
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
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: "8px",
              padding: "2px 8px",
              fontSize: "10px",
              lineHeight: "1.25",
              color: "#555",
              maxWidth: `${maxWidth - 8}px`,
              wordBreak: "break-word",
              textAlign: "center",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {emoji} {label}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

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
            animation: "thoughtFadeIn 0.3s ease-out forwards",
            opacity: 0,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              border: "1px dashed rgba(0,0,0,0.22)",
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
