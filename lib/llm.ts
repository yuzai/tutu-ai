import OpenAI from "openai";
import { z } from "zod";

let cachedClient: OpenAI | null = null;

export function getLLM(): OpenAI {
  if (cachedClient) return cachedClient;
  const baseURL = process.env.OPENAI_BASE_URL || "http://localhost:11434/v1";
  const apiKey = process.env.OPENAI_API_KEY || "not-needed";
  cachedClient = new OpenAI({ baseURL, apiKey });
  return cachedClient;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || "qwen2.5:7b-instruct";
}

export function getMaxTokens(): number {
  const v = Number(process.env.TUTU_MAX_TOKENS);
  return Number.isFinite(v) && v > 0 ? v : 800;
}

// Qwen3 / 类似支持 hybrid thinking 的模型默认会先吐 <think>...</think>。
// 在 prompt 里追加 /no_think 可以让它跳过思考，直接出答案 — 速度快很多。
// 设 TUTU_DISABLE_THINKING=0 可关掉这个行为（让模型继续思考）。
function shouldDisableThinking(): boolean {
  return process.env.TUTU_DISABLE_THINKING !== "0";
}

// Ollama 上 Qwen3 系列的 json_object 模式跟 thinking 冲突，常常产出空字符串。
// 默认关闭；设 TUTU_JSON_MODE=1 强制开。
function shouldUseJsonMode(): boolean {
  return process.env.TUTU_JSON_MODE === "1";
}

// 默认开：每次 LLM 调用前后各一行摘要，看 agent 在做什么决定。
function shouldDebugLLM(): boolean {
  return process.env.TUTU_DEBUG_LLM !== "0";
}

// 设 TUTU_DEBUG_VERBOSE=1 才打完整的 prompt / raw response，调试 prompt 工程时用。
function shouldDebugVerbose(): boolean {
  return process.env.TUTU_DEBUG_VERBOSE === "1";
}

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/i, "").trim();
}

const ActionSchema = z.object({
  type: z.enum(["go_to", "say", "wait", "do"]),
  place: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  utterance: z.string().nullable().optional(),
  activity: z.string().nullable().optional(),
  duration_seconds: z.number().nullable().optional(),
});

// 小模型偶尔漏 thought 字段，宽容处理：允许 thought / thinking / reason 任一，缺失则空串。
const DecisionSchema = z
  .object({
    thought: z.string().optional(),
    thinking: z.string().optional(),
    reason: z.string().optional(),
    action: ActionSchema,
  })
  .transform((d) => ({
    thought: d.thought || d.thinking || d.reason || "",
    action: d.action,
  }));

export type RawDecision = z.infer<typeof DecisionSchema>;

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

function divider(label: string): string {
  const bar = "─".repeat(Math.max(4, 60 - label.length));
  return `── ${label} ${bar}`;
}

export async function callDecide(
  systemPrompt: string,
  userPrompt: string,
  label: string = "agent"
): Promise<RawDecision> {
  const llm = getLLM();
  const model = getModel();
  const noThink = shouldDisableThinking();
  const jsonMode = shouldUseJsonMode();
  const debug = shouldDebugLLM();
  const verbose = shouldDebugVerbose();
  const finalUser = noThink ? `${userPrompt}\n\n/no_think` : userPrompt;

  if (verbose) {
    console.log(divider(`LLM REQ · ${label} · model=${model} · no_think=${noThink} · json_mode=${jsonMode}`));
    console.log("[system]\n" + systemPrompt);
    console.log("[user]\n" + finalUser);
  } else if (debug) {
    console.log(`→ ${label.padEnd(6)} 询问中…`);
  }

  const startedAt = Date.now();
  let completion;
  try {
    completion = await llm.chat.completions.create({
      model,
      temperature: 0.9,
      max_tokens: getMaxTokens(),
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalUser },
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${label} ${Date.now() - startedAt}ms LLM ERR: ${msg}`);
    throw err;
  }

  const choice = completion.choices[0];
  const finishReason = choice?.finish_reason;
  const rawRaw = choice?.message?.content ?? "";
  const reasoning = (choice?.message as { reasoning_content?: string } | undefined)?.reasoning_content ?? "";
  const usage = completion.usage;

  if (verbose) {
    console.log(divider(`LLM RESP · ${label} · ${Date.now() - startedAt}ms · finish=${finishReason}`));
    if (usage) console.log(`[usage] prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`);
    if (reasoning) console.log("[reasoning_content]\n" + reasoning);
    console.log("[content]\n" + rawRaw);
  }

  const raw = stripThinkTags(rawRaw);
  if (!raw) {
    throw new Error(
      `LLM returned empty content (finish=${finishReason}). 检查模型是否还在思考——把 TUTU_MAX_TOKENS 调大，或换 qwen2.5 非思考模型。raw="${rawRaw.slice(0, 300)}"`
    );
  }
  const jsonText = extractJSON(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`LLM returned non-JSON output: ${raw.slice(0, 300)}`);
  }
  const result = DecisionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`LLM decision failed schema: ${result.error.message}; raw=${raw.slice(0, 300)}`);
  }
  if (debug) {
    const a = result.data.action;
    const target =
      a.type === "go_to"
        ? `→ ${a.place ?? "?"}`
        : a.type === "say"
        ? `→ ${a.target ?? "周围"}：「${a.utterance ?? ""}」`
        : a.type === "do"
        ? `${a.activity ?? "?"}`
        : `等 ${a.duration_seconds ?? "?"}s`;
    const ms = Date.now() - startedAt;
    const tok = usage ? ` ${usage.completion_tokens}t` : "";
    const thoughtPreview = result.data.thought ? ` · 想法："${result.data.thought.slice(0, 40)}"` : "";
    console.log(`← ${label.padEnd(6)} ${ms}ms${tok} · ${a.type} ${target}${thoughtPreview}`);
  }
  return result.data;
}
