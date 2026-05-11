"use client";

import { useEffect } from "react";
import { WorldView } from "@/components/WorldView";
import { EventLog } from "@/components/EventLog";
import { AgentInspector, AgentRoster } from "@/components/AgentPanel";
import { Controls } from "@/components/Controls";
import { requestDecisionFor, useSim } from "@/lib/simulation";

const BASE_TICK_MS = Number(process.env.NEXT_PUBLIC_TICK_INTERVAL_MS) || 2500;

export default function HomePage() {
  const paused = useSim((s) => s.paused);
  const speed = useSim((s) => s.speed);

  useEffect(() => {
    if (paused) return;
    const interval = Math.max(120, Math.floor(BASE_TICK_MS / speed));
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
  }, [paused, speed]);

  return (
    <main className="max-w-[1500px] mx-auto p-4 space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-tutu-accent">赛博</span>
            图图小镇{" "}
            <span className="text-[12px] font-normal text-stone-500 ml-1">
              · 多智能体仿真
            </span>
          </h1>
          <p className="text-[12px] text-stone-500 mt-0.5">
            每个角色由 LLM 驱动，按自己的人设在翻斗大杂院里生活。
          </p>
        </div>
        <a
          className="text-[12px] text-stone-500 hover:text-stone-800 underline underline-offset-2"
          href="https://github.com/joonspk-research/generative_agents"
          target="_blank"
          rel="noreferrer"
        >
          灵感来源：Generative Agents
        </a>
      </header>

      <Controls />

      <div className="grid grid-cols-12 gap-3">
        <section className="col-span-12 xl:col-span-9">
          <WorldView />
        </section>
        <aside className="col-span-12 xl:col-span-3 space-y-3">
          <AgentRoster />
          <AgentInspector />
        </aside>
      </div>

      <section className="h-[260px]">
        <EventLog />
      </section>
    </main>
  );
}
