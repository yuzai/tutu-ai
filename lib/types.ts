export type Position = { x: number; y: number };

export type PlaceKind = "home" | "kindergarten" | "park" | "shop" | "restaurant" | "plaza";

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  rect: { x: number; y: number; w: number; h: number };
  anchor: Position;
  color: string;
  emoji: string;
};

export type CharacterPersona = {
  id: string;
  name: string;
  age: number;
  emoji: string;
  homeId: string;
  color: string;
  persona: string;
  voice: string;
  relationships: Record<string, string>;
  schedule: string;
};

export type ActionType = "go_to" | "say" | "wait" | "do" | "sleep";

export type AgentAction = {
  type: ActionType;
  placeId?: string;
  target?: string;
  utterance?: string;
  activity?: string;
  durationTicks?: number;
};

export type AgentDecision = {
  thought: string;
  action: AgentAction;
};

export type MemoryEntry = {
  tick: number;
  text: string;
  importance: number;
};

export type AgentRuntime = {
  id: string;
  pos: Position;
  targetPos: Position | null;
  intention: string;
  currentAction: AgentAction | null;
  busyUntilTick: number;
  lastDecisionTick: number;
  thought: string;
  speech: { text: string; expiresTick: number } | null;
  // 想法冒泡：决策刚回来时短暂显示在头顶，自动浮起并淡出。
  thoughtBubble: { text: string; createdTick: number; expiresTick: number } | null;
  memory: MemoryEntry[];
  isDeciding: boolean;
};

export type Observation = {
  selfName: string;
  timeOfDay: string;
  tick: number;
  currentPlace: string;
  nearby: Array<{ name: string; placeName: string; activity: string }>;
  recentEvents: string[];
  relationshipsContext: string;
  pendingSpeechFrom: Array<{ from: string; text: string }>;
};

export type WorldEvent = {
  tick: number;
  kind: "say" | "arrive" | "start" | "thought";
  actor: string;
  text: string;
};
