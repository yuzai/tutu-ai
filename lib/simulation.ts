"use client";

import { create } from "zustand";
import { stepToward, randomCellInPlace, stableCellInPlace } from "./world";
import { getScenarioById, DEFAULT_SCENARIO_ID } from "./scenarios";
import type { Scenario } from "./scenarios";
import type {
  AgentDecision,
  AgentRuntime,
  CharacterPersona,
  Observation,
  Place,
  Position,
  WorldEvent,
} from "./types";

export type SimSpeed = 0.25 | 0.5 | 1 | 2 | 4;

const NEAR_RADIUS = 5;
const SPEECH_TTL_TICKS = 4;
const MEMORY_CAP = 24;
const RE_DECIDE_TICKS = 12;
const MAX_CONCURRENT_DECISIONS =
  Number(process.env.NEXT_PUBLIC_MAX_CONCURRENT) > 0
    ? Number(process.env.NEXT_PUBLIC_MAX_CONCURRENT)
    : 4;
const EVENT_LOG_CAP = 200;

function clockFromTick(tick: number, scenario: Scenario): string {
  const totalMin = scenario.world.startHour * 60 + tick * scenario.world.tickMinutes;
  const wrapped = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const period = h < 6 ? "凌晨" : h < 11 ? "上午" : h < 13 ? "中午" : h < 18 ? "下午" : "晚上";
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${period} ${hh}:${mm}`;
}

function placeAtIn(places: Place[], pos: Position): Place | null {
  for (const p of places) {
    if (
      pos.x >= p.rect.x &&
      pos.x < p.rect.x + p.rect.w &&
      pos.y >= p.rect.y &&
      pos.y < p.rect.y + p.rect.h
    ) {
      return p;
    }
  }
  return null;
}

function placeNameAt(scenario: Scenario, pos: Position): string {
  return placeAtIn(scenario.places, pos)?.name ?? "街道上";
}

function charById(scenario: Scenario, id: string): CharacterPersona | undefined {
  return scenario.characters.find((c) => c.id === id);
}

function placeById(scenario: Scenario, id: string): Place | undefined {
  return scenario.places.find((p) => p.id === id);
}

function makeInitialAgent(persona: CharacterPersona, scenario: Scenario): AgentRuntime {
  const home = placeById(scenario, persona.homeId);
  const pos = home ? stableCellInPlace(home, persona.id) : { x: 0, y: 0 };
  return {
    id: persona.id,
    pos,
    targetPos: null,
    intention: "刚刚出场，还没想好做什么",
    currentAction: null,
    busyUntilTick: 0,
    lastDecisionTick: -RE_DECIDE_TICKS,
    thought: "",
    speech: null,
    memory: [],
    isDeciding: false,
  };
}

function initialAgentsFor(scenario: Scenario): Record<string, AgentRuntime> {
  return Object.fromEntries(
    scenario.characters.map((c) => [c.id, makeInitialAgent(c, scenario)])
  );
}

type PendingHeard = { from: string; text: string };

export type DecisionReason = "idle" | "stale" | "hasHeard";
export type SkipReason =
  | "决策中"
  | "走路中"
  | { kind: "busy"; remaining: number }
  | "无触发";
export type AgentDiag =
  | { id: string; name: string; dispatch: true; reason: DecisionReason }
  | { id: string; name: string; dispatch: false; skip: SkipReason };

type SimState = {
  scenarioId: string;
  tick: number;
  paused: boolean;
  speed: SimSpeed;
  agents: Record<string, AgentRuntime>;
  events: WorldEvent[];
  pendingHeard: Record<string, PendingHeard[]>;
  decisionsInFlight: Set<string>;
  selectedAgentId: string | null;
  lastError: string | null;

  setPaused: (p: boolean) => void;
  setSpeed: (s: SimSpeed) => void;
  selectAgent: (id: string | null) => void;
  tickOnce: () => void;
  applyDecision: (agentId: string, decision: AgentDecision) => void;
  markDecisionStart: (agentId: string) => void;
  markDecisionEnd: (agentId: string, error?: string) => void;
  reset: () => void;
  switchScenario: (scenarioId: string) => void;
  diagnoseTick: () => AgentDiag[];
  buildObservation: (agentId: string) => Observation;
};

function pushEvent(events: WorldEvent[], ev: WorldEvent) {
  events.push(ev);
  if (events.length > EVENT_LOG_CAP) {
    events.splice(0, events.length - EVENT_LOG_CAP);
  }
}

function addMemory(agent: AgentRuntime, tick: number, text: string, importance = 1) {
  agent.memory.push({ tick, text, importance });
  if (agent.memory.length > MEMORY_CAP) {
    agent.memory.splice(0, agent.memory.length - MEMORY_CAP);
  }
}

function freshStateFor(scenarioId: string, label: "start" | "reset") {
  const scenario = getScenarioById(scenarioId);
  const text =
    label === "start"
      ? `${scenario.name}的一天开始了。`
      : `切换到 ${scenario.name}。`;
  return {
    scenarioId: scenario.id,
    tick: 0,
    paused: true,
    agents: initialAgentsFor(scenario),
    events: [{ tick: 0, kind: "start" as const, actor: "system", text }],
    pendingHeard: {},
    decisionsInFlight: new Set<string>(),
    selectedAgentId: null,
    lastError: null,
  };
}

export const useSim = create<SimState>((set, get) => ({
  ...freshStateFor(DEFAULT_SCENARIO_ID, "start"),
  speed: 1,

  setPaused: (p) => set({ paused: p }),
  setSpeed: (s) => set({ speed: s }),
  selectAgent: (id) => set({ selectedAgentId: id }),

  reset: () =>
    set((s) => ({
      ...freshStateFor(s.scenarioId, "reset"),
      speed: s.speed,
    })),

  switchScenario: (scenarioId) =>
    set((s) => ({
      ...freshStateFor(scenarioId, "reset"),
      speed: s.speed,
    })),

  markDecisionStart: (agentId) =>
    set((s) => {
      const next = new Set(s.decisionsInFlight);
      next.add(agentId);
      const agents = { ...s.agents, [agentId]: { ...s.agents[agentId], isDeciding: true } };
      return { decisionsInFlight: next, agents };
    }),

  markDecisionEnd: (agentId, error) =>
    set((s) => {
      const next = new Set(s.decisionsInFlight);
      next.delete(agentId);
      const agents = {
        ...s.agents,
        [agentId]: { ...s.agents[agentId], isDeciding: false },
      };
      return {
        decisionsInFlight: next,
        agents,
        lastError: error ?? s.lastError,
      };
    }),

  tickOnce: () =>
    set((s) => {
      const scenario = getScenarioById(s.scenarioId);
      const nextTick = s.tick + 1;
      const agents: Record<string, AgentRuntime> = { ...s.agents };
      const events = [...s.events];
      const pendingHeard = { ...s.pendingHeard };

      for (const id of Object.keys(agents)) {
        const a = { ...agents[id] };

        if (a.speech && a.speech.expiresTick <= nextTick) {
          a.speech = null;
        }

        if (a.targetPos) {
          if (a.pos.x === a.targetPos.x && a.pos.y === a.targetPos.y) {
            const arrivedAt = placeNameAt(scenario, a.pos);
            const persona = charById(scenario, id);
            pushEvent(events, {
              tick: nextTick,
              kind: "arrive",
              actor: persona?.name ?? id,
              text: `走到了 ${arrivedAt}`,
            });
            addMemory(a, nextTick, `我到了 ${arrivedAt}`);
            a.targetPos = null;
            a.busyUntilTick = nextTick;
          } else {
            a.pos = stepToward(a.pos, a.targetPos);
          }
        }

        agents[id] = a;
      }

      return { tick: nextTick, agents, events, pendingHeard };
    }),

  applyDecision: (agentId, decision) =>
    set((s) => {
      const scenario = getScenarioById(s.scenarioId);
      const persona = charById(scenario, agentId);
      if (!persona) return s;
      const a = { ...s.agents[agentId] };
      const agents = { ...s.agents };
      const events = [...s.events];
      const pendingHeard = { ...s.pendingHeard };
      const now = s.tick;

      a.thought = decision.thought;
      a.intention = decision.thought;
      a.lastDecisionTick = now;
      a.currentAction = decision.action;
      if (decision.thought.trim()) {
        addMemory(a, now, `（我想）${decision.thought}`);
      }

      const act = decision.action;
      if (act.type !== "go_to") {
        a.targetPos = null;
      }
      if (act.type === "go_to" && act.placeId) {
        const place = placeById(scenario, act.placeId);
        if (place) {
          a.targetPos = randomCellInPlace(place);
          a.busyUntilTick = now + 60;
          addMemory(a, now, `我决定去 ${place.name}`);
        } else {
          a.busyUntilTick = now + 2;
        }
      } else if (act.type === "say") {
        const utter = (act.utterance || "").slice(0, 80);
        if (utter) {
          a.speech = { text: utter, expiresTick: now + SPEECH_TTL_TICKS };
          const targetName = act.target ? charById(scenario, act.target)?.name ?? act.target : null;
          const display = targetName && targetName !== "everyone" ? `对 ${targetName} 说` : "说";
          pushEvent(events, {
            tick: now,
            kind: "say",
            actor: persona.name,
            text: `${display}：「${utter}」`,
          });
          addMemory(a, now, `我${display}：「${utter}」`);

          for (const otherId of Object.keys(agents)) {
            if (otherId === agentId) continue;
            const other = agents[otherId];
            const dist = Math.abs(other.pos.x - a.pos.x) + Math.abs(other.pos.y - a.pos.y);
            if (dist <= NEAR_RADIUS) {
              const arr = pendingHeard[otherId] ? [...pendingHeard[otherId]] : [];
              arr.push({ from: persona.name, text: utter });
              pendingHeard[otherId] = arr.slice(-4);
              const otherCopy = { ...agents[otherId] };
              addMemory(otherCopy, now, `${persona.name}${display}：「${utter}」`);
              agents[otherId] = otherCopy;
            }
          }
        }
        a.busyUntilTick = now + (act.durationTicks ?? 2);
      } else if (act.type === "do") {
        const desc = act.activity || "在发呆";
        pushEvent(events, { tick: now, kind: "thought", actor: persona.name, text: `开始 ${desc}` });
        addMemory(a, now, `我开始 ${desc}`);
        a.busyUntilTick = now + (act.durationTicks ?? 4);
      } else if (act.type === "wait") {
        a.busyUntilTick = now + (act.durationTicks ?? 3);
      }

      agents[agentId] = a;
      return { agents, events, pendingHeard };
    }),

  diagnoseTick: () => {
    const s = get();
    const scenario = getScenarioById(s.scenarioId);
    const out: AgentDiag[] = [];
    let slotsLeft = MAX_CONCURRENT_DECISIONS - s.decisionsInFlight.size;
    for (const id of Object.keys(s.agents)) {
      const a = s.agents[id];
      const name = charById(scenario, id)?.name ?? id;
      if (a.isDeciding) {
        out.push({ id, name, dispatch: false, skip: "决策中" });
        continue;
      }
      const hasHeard = (s.pendingHeard[id]?.length ?? 0) > 0;
      if (a.targetPos && !hasHeard) {
        out.push({ id, name, dispatch: false, skip: "走路中" });
        continue;
      }
      const idle = a.busyUntilTick <= s.tick;
      const stale = s.tick - a.lastDecisionTick >= RE_DECIDE_TICKS;
      const reason: DecisionReason | null = hasHeard
        ? "hasHeard"
        : idle
        ? "idle"
        : stale
        ? "stale"
        : null;
      if (reason && slotsLeft > 0) {
        out.push({ id, name, dispatch: true, reason });
        slotsLeft -= 1;
      } else if (reason && slotsLeft <= 0) {
        out.push({ id, name, dispatch: false, skip: "决策中" });
      } else {
        const remaining = Math.max(0, a.busyUntilTick - s.tick);
        out.push({
          id,
          name,
          dispatch: false,
          skip: remaining > 0 ? { kind: "busy", remaining } : "无触发",
        });
      }
    }
    return out;
  },

  buildObservation: (agentId) => {
    const s = get();
    const scenario = getScenarioById(s.scenarioId);
    const a = s.agents[agentId];
    const persona = charById(scenario, agentId);
    if (!a || !persona) {
      return {
        selfName: agentId,
        timeOfDay: clockFromTick(s.tick, scenario),
        tick: s.tick,
        currentPlace: "未知",
        nearby: [],
        recentEvents: [],
        relationshipsContext: "",
        pendingSpeechFrom: [],
      };
    }
    const nearby = [];
    for (const id of Object.keys(s.agents)) {
      if (id === agentId) continue;
      const other = s.agents[id];
      const dist = Math.abs(other.pos.x - a.pos.x) + Math.abs(other.pos.y - a.pos.y);
      if (dist <= NEAR_RADIUS) {
        const op = charById(scenario, id);
        if (!op) continue;
        nearby.push({
          name: op.name,
          placeName: placeNameAt(scenario, other.pos),
          activity:
            other.currentAction?.activity ||
            (other.currentAction?.type === "go_to"
              ? "正在走路"
              : other.speech
              ? `刚说了「${other.speech.text}」`
              : "在附近"),
        });
      }
    }
    const recentEvents = a.memory.slice(-8).map((m) => `[t=${m.tick}] ${m.text}`);
    const pendingSpeechFrom = s.pendingHeard[agentId] || [];
    const relCtx = Object.entries(persona.relationships)
      .map(([k, v]) => `${k}: ${v}`)
      .join("；");
    return {
      selfName: persona.name,
      timeOfDay: clockFromTick(s.tick, scenario),
      tick: s.tick,
      currentPlace: placeNameAt(scenario, a.pos),
      nearby,
      recentEvents,
      relationshipsContext: relCtx,
      pendingSpeechFrom,
    };
  },
}));

export function consumePendingHeard(agentId: string) {
  useSim.setState((s) => {
    if (!s.pendingHeard[agentId]?.length) return s;
    const next = { ...s.pendingHeard };
    delete next[agentId];
    return { pendingHeard: next };
  });
}

export function clockOf(tick: number): string {
  const s = useSim.getState();
  return clockFromTick(tick, getScenarioById(s.scenarioId));
}

export async function requestDecisionFor(agentId: string): Promise<AgentDecision | null> {
  const s = useSim.getState();
  const scenarioId = s.scenarioId;
  const obs = s.buildObservation(agentId);
  useSim.getState().markDecisionStart(agentId);
  try {
    const resp = await fetch("/api/agent/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId, scenarioId, observation: obs }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      useSim.getState().markDecisionEnd(agentId, `decide failed: ${txt.slice(0, 200)}`);
      return null;
    }
    const data = (await resp.json()) as { decision: AgentDecision };
    // 如果在等模型期间用户已切换场景，直接丢弃这次结果。
    if (useSim.getState().scenarioId !== scenarioId) {
      useSim.getState().markDecisionEnd(agentId);
      return null;
    }
    consumePendingHeard(agentId);
    useSim.getState().applyDecision(agentId, data.decision);
    useSim.getState().markDecisionEnd(agentId);
    return data.decision;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    useSim.getState().markDecisionEnd(agentId, msg);
    return null;
  }
}
