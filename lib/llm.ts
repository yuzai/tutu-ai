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
  return Number.isFinite(v) && v > 0 ? v : 600;
}

// Qwen3 / 类似支持 hybrid thinking 的模型默认会先吐 <think>...</think>。
// 在 prompt 里追加 /no_think 可以让它跳过思考，直接出答案 — 速度快很多。
// 设 TUTU_DISABLE_THINKING=0 可关掉这个行为（让模型继续思考）。
function shouldDisableThinking(): boolean {
  return process.env.TUTU_DISABLE_THINKING !== "0";
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

const DecisionSchema = z.object({
  thought: z.string(),
  action: ActionSchema,
});

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

export async function callDecide(systemPrompt: string, userPrompt: string): Promise<RawDecision> {
  const llm = getLLM();
  const model = getModel();
  const noThink = shouldDisableThinking();
  const finalUser = noThink ? `${userPrompt}\n\n/no_think` : userPrompt;
  const finalSystem = noThink ? `${systemPrompt}\n\n/no_think` : systemPrompt;

  const completion = await llm.chat.completions.create({
    model,
    temperature: 0.9,
    max_tokens: getMaxTokens(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: finalSystem },
      { role: "user", content: finalUser },
    ],
  });
  const rawRaw = completion.choices[0]?.message?.content ?? "";
  const raw = stripThinkTags(rawRaw);
  if (!raw) {
    throw new Error(
      `LLM returned empty content (thinking-only?). 如果是 Qwen3/思考模型：默认已加 /no_think；若仍空请加大 TUTU_MAX_TOKENS 或换非思考模型。raw="${rawRaw.slice(0, 200)}"`
    );
  }
  const jsonText = extractJSON(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`LLM returned non-JSON output: ${raw.slice(0, 200)}`);
  }
  const result = DecisionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`LLM decision failed schema: ${result.error.message}; raw=${raw.slice(0, 200)}`);
  }
  return result.data;
}
