"use client";

import { useEffect, useRef } from "react";
import { clockOf, useSim } from "@/lib/simulation";

const KIND_LABEL: Record<string, string> = {
  say: "💬",
  arrive: "📍",
  start: "✨",
  thought: "💭",
};

export function EventLog() {
  const events = useSim((s) => s.events);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events.length]);

  return (
    <div className="panel p-3 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-stone-700">事件日志</h3>
        <span className="text-[11px] text-stone-500">{events.length} 条</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto pr-1 space-y-1 text-[12px] leading-snug">
        {events.map((e, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-stone-400 shrink-0 tabular-nums">{clockOf(e.tick)}</span>
            <span className="shrink-0">{KIND_LABEL[e.kind] ?? "·"}</span>
            <span className="text-stone-700">
              <b className="font-semibold">{e.actor}</b> {e.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
