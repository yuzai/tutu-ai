"use client";

import { clockOf, requestDecisionFor, useSim, type SimSpeed } from "@/lib/simulation";
import { ScenarioSelector } from "./ScenarioSelector";

const SPEEDS: SimSpeed[] = [0.25, 0.5, 1, 2, 4];

export function Controls() {
  const paused = useSim((s) => s.paused);
  const speed = useSim((s) => s.speed);
  const tick = useSim((s) => s.tick);
  const inflight = useSim((s) => s.decisionsInFlight.size);
  const lastError = useSim((s) => s.lastError);
  const setPaused = useSim((s) => s.setPaused);
  const setSpeed = useSim((s) => s.setSpeed);
  const reset = useSim((s) => s.reset);

  return (
    <div className="panel p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="pill" style={{ background: "#222" }}>
          🕒 {clockOf(tick)}
        </span>
        <span className="text-[11px] text-stone-500">tick {tick}</span>
      </div>

      <div className="flex items-center gap-2">
        {paused ? (
          <button className="btn-primary" onClick={() => setPaused(false)}>
            ▶ 开始
          </button>
        ) : (
          <button className="btn" onClick={() => setPaused(true)}>
            ⏸ 暂停
          </button>
        )}
        <button
          className="btn"
          onClick={() => {
            useSim.getState().tickOnce();
            const tick = useSim.getState().tick;
            const diag = useSim.getState().diagnoseTick();
            const sent = diag.filter((d) => d.dispatch);
            const sentStr =
              sent.length === 0
                ? "—"
                : sent.map((d) => `${d.name}(${d.dispatch ? d.reason : ""})`).join(", ");
            console.log(`%c[tick ${tick}] 派 ${sentStr}`, "color:#0a7");
            for (const d of sent) {
              void requestDecisionFor(d.id);
            }
          }}
          title="单步推进一个 tick（暂停状态最有用）"
        >
          ⏭ 单步
        </button>
        <button className="btn" onClick={() => reset()}>
          ↺ 重置
        </button>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[11px] text-stone-500 mr-1">速度</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-1 text-[11px] rounded ${
              speed === s ? "bg-stone-800 text-white" : "bg-white border border-black/10"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <ScenarioSelector />
        <div className="flex items-center gap-2 text-[11px] text-stone-500">
          <span className={`inline-block w-2 h-2 rounded-full ${inflight > 0 ? "bg-amber-400 animate-pulse" : "bg-stone-300"}`} />
          LLM 决策中：{inflight}
        </div>
      </div>

      {lastError && (
        <div className="w-full text-[11px] text-red-600 border border-red-200 bg-red-50 rounded px-2 py-1">
          {lastError}
        </div>
      )}
    </div>
  );
}
