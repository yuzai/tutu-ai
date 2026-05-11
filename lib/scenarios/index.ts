import type { Scenario } from "./types";
import { tutuScenario } from "./tutu";
import { officeScenario } from "./office";
import { wuxiaScenario } from "./wuxia";
import { xianxiaScenario } from "./xianxia";
import { gymScenario } from "./gym";
import { schoolScenario } from "./school";
import { playgroundScenario } from "./playground";
import { festivalScenario } from "./festival";

export const SCENARIOS: Record<string, Scenario> = {
  [tutuScenario.id]: tutuScenario,
  [officeScenario.id]: officeScenario,
  [schoolScenario.id]: schoolScenario,
  [playgroundScenario.id]: playgroundScenario,
  [gymScenario.id]: gymScenario,
  [festivalScenario.id]: festivalScenario,
  [wuxiaScenario.id]: wuxiaScenario,
  [xianxiaScenario.id]: xianxiaScenario,
};

export const SCENARIO_LIST: Scenario[] = Object.values(SCENARIOS);

export const FALLBACK_SCENARIO = tutuScenario;

export function getScenarioById(id: string | undefined | null): Scenario {
  if (!id) return FALLBACK_SCENARIO;
  return SCENARIOS[id] ?? FALLBACK_SCENARIO;
}

export const DEFAULT_SCENARIO_ID: string = (() => {
  const requested = (process.env.NEXT_PUBLIC_SCENARIO || "").trim();
  if (requested && SCENARIOS[requested]) return requested;
  return tutuScenario.id;
})();

// 静态默认场景（基于环境变量）。运行时切换请用 useSim 的 switchScenario。
export const ACTIVE_SCENARIO: Scenario = getScenarioById(DEFAULT_SCENARIO_ID);

export type { Scenario } from "./types";
