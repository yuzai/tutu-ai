"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSim } from "@/lib/simulation";
import { SCENARIO_LIST } from "@/lib/scenarios";

export function ScenarioSelector() {
  const scenarioId = useSim((s) => s.scenarioId);
  const switchScenario = useSim((s) => s.switchScenario);
  const paused = useSim((s) => s.paused);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-1.5 text-[11px] text-stone-500">
      <span>场景</span>
      <select
        value={scenarioId}
        onChange={(e) => {
          const id = e.target.value;
          if (!paused && !confirm("切换场景会重置当前世界，确定吗？")) return;
          switchScenario(id);
          if (pathname === "/sim") {
            router.replace(`/sim?scenario=${id}`, { scroll: false });
          }
        }}
        className="text-[12px] px-2 py-1 rounded border border-black/10 bg-white hover:bg-black/5 focus:outline-none"
        title="切换场景会重置仿真状态"
      >
        {SCENARIO_LIST.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
