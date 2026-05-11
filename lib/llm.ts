import OpenAI from "openai";
import { z } from "zod";

// 客户端运行时传递的 LLM 配置（与 lib/config.ts 的 LLMConfig 字段对应）。
export type RuntimeLLMConfig = {
  baseURL?: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  jsonMode?: boolean;
  disableThinking?: boolean;
  reasoningEffort?: "high" | "max";
  debug?: boolean;
  verbose?: boolean;
};

// DeepSeek V4 系列用 API 参数控制思考，不再吃 prompt 里的 /no_think。
function isDeepSeekV4(model: string): boolean {
  return /deepseek[-_/]v4/i.test(model);
}

// 所有配置通过客户端请求 body 传入。服务端只在字段为空时用硬编码兜底。
const FALLBACK = {
  baseURL: "http://localhost:11434/v1",
  apiKey: "not-needed",
  model: "qwen2.5:3b-instruct",
  maxTokens: 600,
} as const;

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

// 客户端传配置则优先用客户端，否则 fallback 到硬编码默认。绝不打印 apiKey。
function resolveConfig(cfg?: RuntimeLLMConfig) {
  return {
    baseURL: cfg?.baseURL?.trim() || FALLBACK.baseURL,
    apiKey: cfg?.apiKey?.trim() || FALLBACK.apiKey,
    model: cfg?.model?.trim() || FALLBACK.model,
    maxTokens: cfg?.maxTokens && cfg.maxTokens > 0 ? cfg.maxTokens : FALLBACK.maxTokens,
    disableThinking: cfg?.disableThinking ?? false,
    jsonMode: cfg?.jsonMode ?? false,
    reasoningEffort: cfg?.reasoningEffort,
    debug: cfg?.debug ?? false,
    verbose: cfg?.verbose ?? false,
  };
}

export async function callDecide(
  systemPrompt: string,
  userPrompt: string,
  label: string = "agent",
  cfg?: RuntimeLLMConfig
): Promise<RawDecision> {
  const resolved = resolveConfig(cfg);
  const debug = resolved.debug;
  const verbose = resolved.verbose;
  const isV4 = isDeepSeekV4(resolved.model);
  // V4 通过 API 参数控制思考，不要再追加 /no_think 字符串污染 prompt。
  const finalUser = resolved.disableThinking && !isV4 ? `${userPrompt}\n\n/no_think` : userPrompt;

  // 每次创建新 client（不缓存）—— config 可能因请求不同。OpenAI SDK 实例化很轻量。
  const llm = new OpenAI({ baseURL: resolved.baseURL, apiKey: resolved.apiKey });

  // DeepSeek V4 的特殊参数：thinking + reasoning_effort（OpenAI SDK 透传到 body）。
  const v4Extras: Record<string, unknown> = {};
  if (isV4) {
    v4Extras.thinking = { type: resolved.disableThinking ? "disabled" : "enabled" };
    if (!resolved.disableThinking) {
      v4Extras.reasoning_effort = resolved.reasoningEffort ?? "high";
    }
  }

  if (verbose) {
    console.log(
      divider(`LLM REQ · ${label} · model=${resolved.model} · no_think=${resolved.disableThinking} · json_mode=${resolved.jsonMode}${isV4 ? " · v4=true" : ""}`)
    );
    console.log("[system]\n" + systemPrompt);
    console.log("[user]\n" + finalUser);
  } else if (debug) {
    console.log(`→ ${label.padEnd(6)} 询问中…  [${resolved.model}]`);
  }

  const startedAt = Date.now();
  let completion;
  try {
    // 用 as any 允许透传非 SDK schema 字段（DeepSeek V4 的 thinking / reasoning_effort）。
    completion = await llm.chat.completions.create({
      model: resolved.model,
      temperature: 0.9,
      max_tokens: resolved.maxTokens,
      ...(resolved.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalUser },
      ],
      ...v4Extras,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
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
      `LLM returned empty content (finish=${finishReason}). 检查模型是否还在思考——把 max tokens 调大，或换非思考模型。raw="${rawRaw.slice(0, 300)}"`
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
    // DeepSeek-R1 这类把思考放在 reasoning_content 的模型，debug 模式也露个摘要
    const reasoningPreview = reasoning ? ` · 思考："${reasoning.replace(/\s+/g, " ").slice(0, 60)}…"` : "";
    console.log(`← ${label.padEnd(6)} ${ms}ms${tok} · ${a.type} ${target}${thoughtPreview}${reasoningPreview}`);
  }
  return result.data;
}
