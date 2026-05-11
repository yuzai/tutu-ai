"use client";

import { create } from "zustand";
import { CHARACTERS, CHARACTER_BY_ID } from "./characters";
import { PLACE_BY_ID, placeAt, stepToward, randomCellInPlace, stableCellInPlace } from "./world";
import type {
  AgentDecision,
  AgentRuntime,
  Observation,
  WorldEvent,
} from "./types";

export type SimSpeed = 0.25 | 0.5 | 1 | 2 | 4;

const NEAR_RADIUS = 5;
const SPEECH_TTL_TICKS = 4;
const MEMORY_CAP = 24;
const RE_DECIDE_TICKS = 12;
const MAX_CONCURRENT_DECISIONS = 4;
const EVENT_LOG_CAP = 200;
const TICK_MINUTES = 5;
const START_HOUR = 7;

function clockFromTick(tick: number): string {
  const totalMin = START_HOUR * 60 + tick * TICK_MINUTES;
  const wrapped = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const period = h < 6 ? "凌晨" : h < 11 ? "上午" : h < 13 ? "中午" : h < 18 ? "下午" : "晚上";
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${period} ${hh}:${mm}`;
}

function placeName(pos: { x: number; y: number }): string {
  return placeAt(pos)?.name ?? "街道上";
}

function makeInitialAgent(persona: (typeof CHARACTERS)[number]): AgentRuntime {
  const home = PLACE_BY_ID[persona.homeId];
  // 用 id 哈希确定首次位置 — 服务端/客户端一致，避免 hydration mismatch。
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

function initialAgents(): Record<string, AgentRuntime> {
  return Object.fromEntries(CHARACTERS.map((c) => [c.id, makeInitialAgent(c)]));
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

export const useSim = create<SimState>((set, get) => ({
  tick: 0,
  paused: true,
  speed: 1,
  agents: initialAgents(),
  events: [
    {
      tick: 0,
      kind: "start",
      actor: "system",
      text: "翻斗大杂院的一天开始了。",
    },
  ],
  pendingHeard: {},
  decisionsInFlight: new Set(),
  selectedAgentId: null,
  lastError: null,

  setPaused: (p) => set({ paused: p }),
  setSpeed: (s) => set({ speed: s }),
  selectAgent: (id) => set({ selectedAgentId: id }),

  reset: () =>
    set({
      tick: 0,
      paused: true,
      agents: initialAgents(),
      events: [
        { tick: 0, kind: "start", actor: "system", text: "重置：翻斗大杂院的一天重新开始。" },
      ],
      pendingHeard: {},
      decisionsInFlight: new Set(),
      selectedAgentId: null,
      lastError: null,
    }),

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
            const arrivedAt = placeName(a.pos);
            pushEvent(events, {
              tick: nextTick,
              kind: "arrive",
              actor: CHARACTER_BY_ID[id].name,
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
      const persona = CHARACTER_BY_ID[agentId];
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
      addMemory(a, now, `（我想）${decision.thought}`);

      const act = decision.action;
      if (act.type === "go_to" && act.placeId) {
        const place = PLACE_BY_ID[act.placeId];
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
          const targetName = act.target ? CHARACTER_BY_ID[act.target]?.name ?? act.target : null;
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
            const targeted = act.target === otherId || act.target === CHARACTER_BY_ID[otherId].name;
            if (dist <= NEAR_RADIUS || targeted) {
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
    const out: AgentDiag[] = [];
    let slotsLeft = MAX_CONCURRENT_DECISIONS - s.decisionsInFlight.size;
    for (const id of Object.keys(s.agents)) {
      const a = s.agents[id];
      const name = CHARACTER_BY_ID[id].name;
      if (a.isDeciding) {
        out.push({ id, name, dispatch: false, skip: "决策中" });
        continue;
      }
      if (a.targetPos) {
        out.push({ id, name, dispatch: false, skip: "走路中" });
        continue;
      }
      const idle = a.busyUntilTick <= s.tick;
      const stale = s.tick - a.lastDecisionTick >= RE_DECIDE_TICKS;
      const hasHeard = (s.pendingHeard[id]?.length ?? 0) > 0;
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
    const a = s.agents[agentId];
    const persona = CHARACTER_BY_ID[agentId];
    const nearby = [];
    for (const id of Object.keys(s.agents)) {
      if (id === agentId) continue;
      const other = s.agents[id];
      const dist = Math.abs(other.pos.x - a.pos.x) + Math.abs(other.pos.y - a.pos.y);
      if (dist <= NEAR_RADIUS) {
        const op = CHARACTER_BY_ID[id];
        nearby.push({
          name: op.name,
          placeName: placeName(other.pos),
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
      timeOfDay: clockFromTick(s.tick),
      tick: s.tick,
      currentPlace: placeName(a.pos),
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
  return clockFromTick(tick);
}

export async function requestDecisionFor(agentId: string): Promise<AgentDecision | null> {
  const obs = useSim.getState().buildObservation(agentId);
  useSim.getState().markDecisionStart(agentId);
  try {
    const resp = await fetch("/api/agent/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId, observation: obs }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      useSim.getState().markDecisionEnd(agentId, `decide failed: ${txt.slice(0, 200)}`);
      return null;
    }
    const data = (await resp.json()) as { decision: AgentDecision };
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
