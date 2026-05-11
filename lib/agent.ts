import type { AgentAction, AgentDecision, CharacterPersona, Observation } from "./types";
import type { Scenario } from "./scenarios";
import { callDecide, type RawDecision, type RuntimeLLMConfig } from "./llm";

function relationshipsBlock(persona: CharacterPersona): string {
  const entries = Object.entries(persona.relationships);
  if (entries.length === 0) return "（暂无）";
  return entries.map(([k, v]) => `- ${k}: ${v}`).join("\n");
}

export function buildSystemPrompt(persona: CharacterPersona, scenario: Scenario): string {
  const placeNames = scenario.places.map((p) => `「${p.name}」`).join("、");
  return `你正在扮演场景「${scenario.name}」里的角色：${persona.name}（${persona.age}岁）。

【角色设定】
${persona.persona}

【说话风格】
${persona.voice}

【你眼中的他人】
${relationshipsBlock(persona)}

【日常作息】
${persona.schedule}

【世界设定】
${scenario.description}
地图上有以下地点：${placeNames}。
你必须以这个角色的视角思考和行动，保持人设和口吻一致。回答必须是有效 JSON，符合：

{
  "thought": "（你内心独白，1-2 句，用你的口吻）",
  "action": {
    "type": "go_to" | "say" | "wait" | "do" | "sleep",
    "place": "地点名（仅 go_to 时）",
    "target": "对话对象姓名（仅 say 时；广播写 'everyone'）",
    "utterance": "你说的话（仅 say 时；用你的口吻，简短）",
    "activity": "你正在做的事（仅 do 时，一句话描述）",
    "duration_seconds": 你预计需要的秒数（say 通常 5；do/wait 10~60）
  }
}

【行为规则】
- 必须只输出一个 JSON 对象，不要任何额外文字、不要 Markdown 围栏。
- 不要破坏人设。
- 优先回应身边人对你说的话，但你可以选择回避、转身就走、敷衍——按人设来。
- 想去某处用 go_to，想和身边某人说话用 say，想待着发呆用 wait，想做某件具体事用 do。
- **困了、累了、深夜、按作息该休息时用 sleep**。sleep 会让你休息较长一段时间（默认 8 小时），原地睡。
- **say 的 target 必须是当前【周围的人】里列出的人**。想找不在身边的人？先 go_to 到他在的地方。
- 不要瞬移：要去远处先用 go_to 一步步过去。`;
}

// 把 "h-h" 形式的 key（如 "9-12"）转成 [start, end)，并匹配当前小时。
function lookupCustomHint(hints: Record<string, string>, h: number): string | null {
  for (const [range, text] of Object.entries(hints)) {
    const m = range.match(/^(\d+)-(\d+)$/);
    if (!m) continue;
    const start = parseInt(m[1], 10);
    const end = parseInt(m[2], 10);
    if (start <= end ? h >= start && h < end : h >= start || h < end) {
      return text;
    }
  }
  return null;
}

// 只用 scenario 自定义的时段提示（如音乐节 14-22 黄金时段、修仙宗按子时寅时分段）。
// 通用场景没有 hint 时返回空，让模型按时间字符串自己理解。
function timeOfDayHint(timeOfDay: string, scenario: Scenario): string {
  const custom = scenario.world.timeOfDayHints;
  if (!custom) return "";
  const m = timeOfDay.match(/(\d{2}):/);
  if (!m) return "";
  const h = parseInt(m[1], 10);
  return lookupCustomHint(custom, h) ?? "";
}

export function buildUserPrompt(obs: Observation, scenario: Scenario): string {
  const lines: string[] = [];
  const hint = timeOfDayHint(obs.timeOfDay, scenario);
  lines.push(`【现在】tick=${obs.tick}，${obs.timeOfDay}${hint ? "（" + hint + "）" : ""}`);
  lines.push(`【你在哪】${obs.currentPlace}`);
  if (obs.nearby.length > 0) {
    lines.push(`【周围的人】`);
    for (const n of obs.nearby) {
      lines.push(`- ${n.name}（在 ${n.placeName}）：${n.activity || "看起来没在做什么"}`);
    }
  } else {
    lines.push(`【周围的人】没有人`);
  }
  if (obs.pendingSpeechFrom.length > 0) {
    lines.push(`【刚刚有人对你说】`);
    for (const s of obs.pendingSpeechFrom) {
      lines.push(`- ${s.from}：「${s.text}」`);
    }
  }
  if (obs.recentEvents.length > 0) {
    lines.push(`【你最近的记忆】`);
    for (const e of obs.recentEvents) lines.push(`- ${e}`);
  }
  lines.push(``);
  lines.push(`请决定你下一步做什么。只输出 JSON。`);
  return lines.join("\n");
}

export function normalizeDecision(raw: RawDecision, scenario: Scenario): AgentDecision {
  const action: AgentAction = { type: raw.action.type };
  const duration = raw.action.duration_seconds;
  if (typeof duration === "number" && duration > 0) {
    action.durationTicks = Math.max(1, Math.round(duration / 1.5));
  }
  if (raw.action.type === "go_to") {
    const name = (raw.action.place || "").trim();
    const place = scenario.places.find((p) => p.name === name || p.id === name);
    if (place) action.placeId = place.id;
  }
  if (raw.action.type === "say") {
    const target = (raw.action.target || "").trim();
    if (target) {
      const persona = scenario.characters.find((c) => c.name === target || c.id === target);
      action.target = persona?.id ?? target.toLowerCase();
    }
    action.utterance = (raw.action.utterance || "").trim() || undefined;
    if (!action.durationTicks) action.durationTicks = 3;
  }
  if (raw.action.type === "do") {
    action.activity = (raw.action.activity || "在发呆").trim();
    if (!action.durationTicks) action.durationTicks = 6;
  }
  if (raw.action.type === "wait") {
    if (!action.durationTicks) action.durationTicks = 4;
  }
  if (raw.action.type === "sleep") {
    // 8 sim 小时 = 96 ticks (5 sim min/tick)。睡眠固定时长，忽略模型给的 duration。
    action.durationTicks = 96;
    action.activity = "睡觉";
  }
  return { thought: raw.thought, action };
}

export async function decideForAgent(
  persona: CharacterPersona,
  observation: Observation,
  scenario: Scenario,
  llmConfig?: RuntimeLLMConfig
): Promise<AgentDecision> {
  const sys = buildSystemPrompt(persona, scenario);
  const usr = buildUserPrompt(observation, scenario);
  const raw = await callDecide(sys, usr, persona.name, llmConfig);
  return normalizeDecision(raw, scenario);
}
