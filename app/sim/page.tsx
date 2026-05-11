"use client";

import Link from "next/link";
import { useEffect } from "react";
import { WorldView } from "@/components/WorldView";
import { EventLog } from "@/components/EventLog";
import { AgentInspector, AgentRoster } from "@/components/AgentPanel";
import { Controls } from "@/components/Controls";
import { requestDecisionFor, useSim } from "@/lib/simulation";
import { getScenarioById } from "@/lib/scenarios";
import { useConfig } from "@/lib/config";

export default function SimPage() {
  const paused = useSim((s) => s.paused);
  const speed = useSim((s) => s.speed);
  const scenarioId = useSim((s) => s.scenarioId);
  const scenario = getScenarioById(scenarioId);
  const baseTickMs = useConfig((s) => s.config.tickIntervalMs);

  // 刷新或直接访问 /sim?scenario=xxx 时，从 URL 同步到 store；同时从 localStorage 加载 LLM 配置。
  useEffect(() => {
    if (typeof window === "undefined") return;
    useConfig.getState().hydrate();
    const params = new URLSearchParams(window.location.search);
    const urlScenario = params.get("scenario");
    if (urlScenario && urlScenario !== useSim.getState().scenarioId) {
      useSim.getState().switchScenario(urlScenario);
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    const interval = Math.max(120, Math.floor(baseTickMs / speed));
    const id = window.setInterval(() => {
      useSim.getState().tickOnce();
      const tick = useSim.getState().tick;
      const diag = useSim.getState().diagnoseTick();
      const dispatched = diag.filter((d) => d.dispatch);
      const skipped = diag.filter((d) => !d.dispatch);
      const sentStr =
        dispatched.length === 0
          ? "—"
          : dispatched.map((d) => `${d.name}(${d.dispatch ? d.reason : ""})`).join(", ");
      const skipStr = skipped
        .map((d) => {
          const r = !d.dispatch ? d.skip : "";
          const label =
            typeof r === "string" ? r : `busy${(r as { remaining: number }).remaining}`;
          return `${d.name}=${label}`;
        })
        .join(" ");
      console.log(`%c[tick ${tick}] 派 ${sentStr} %c| 跳过 ${skipStr}`, "color:#0a7", "color:#999");
      for (const d of dispatched) {
        void requestDecisionFor(d.id);
      }
    }, interval);
    return () => window.clearInterval(id);
  }, [paused, speed, baseTickMs]);

  return (
    <main className="max-w-[1500px] mx-auto p-4 space-y-3">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <Link
            href="/"
            className="text-[12px] text-stone-500 hover:text-stone-800 underline underline-offset-2 shrink-0"
          >
            ← 返回首页
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              <span className="text-tutu-accent">赛博</span>
              {scenario.name}
              <span className="text-[11px] sm:text-[12px] font-normal text-stone-500 ml-2">
                · 多智能体仿真
              </span>
            </h1>
            <p className="text-[11px] sm:text-[12px] text-stone-500 mt-0.5">
              {scenario.description}
            </p>
          </div>
        </div>
      </header>

      <Controls />

      <div className="grid grid-cols-12 gap-3 items-stretch xl:h-[calc(100vh-11rem)] xl:[grid-template-rows:minmax(0,1fr)]">
        <section className="col-span-12 xl:col-span-7 min-h-0">
          <WorldView />
        </section>
        <aside className="col-span-12 sm:col-span-6 xl:col-span-3 flex flex-col gap-3 min-h-0">
          <AgentRoster />
          <div className="flex-1 min-h-0">
            <AgentInspector />
          </div>
        </aside>
        <section className="col-span-12 sm:col-span-6 xl:col-span-2 min-h-0 h-[420px] xl:h-auto">
          <EventLog />
        </section>
      </div>
    </main>
  );
}
