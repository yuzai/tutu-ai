import { NextResponse } from "next/server";
import { z } from "zod";
import { decideForAgent } from "@/lib/agent";
import { getScenarioById, DEFAULT_SCENARIO_ID } from "@/lib/scenarios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ObservationSchema = z.object({
  selfName: z.string(),
  timeOfDay: z.string(),
  tick: z.number(),
  currentPlace: z.string(),
  nearby: z.array(
    z.object({ name: z.string(), placeName: z.string(), activity: z.string() })
  ),
  recentEvents: z.array(z.string()),
  relationshipsContext: z.string(),
  pendingSpeechFrom: z.array(z.object({ from: z.string(), text: z.string() })),
});

const LLMConfigSchema = z
  .object({
    baseURL: z.string().optional(),
    apiKey: z.string().optional(),
    model: z.string().optional(),
    maxTokens: z.number().optional(),
    jsonMode: z.boolean().optional(),
    disableThinking: z.boolean().optional(),
  })
  .optional();

const RequestSchema = z.object({
  agentId: z.string(),
  scenarioId: z.string().optional(),
  observation: ObservationSchema,
  llmConfig: LLMConfigSchema,
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request", details: parsed.error.message }, { status: 400 });
  }
  const scenario = getScenarioById(parsed.data.scenarioId ?? DEFAULT_SCENARIO_ID);
  const persona = scenario.characters.find((c) => c.id === parsed.data.agentId);
  if (!persona) {
    return NextResponse.json(
      { error: `unknown agent in scenario ${scenario.id}: ${parsed.data.agentId}` },
      { status: 404 }
    );
  }
  try {
    const decision = await decideForAgent(
      persona,
      parsed.data.observation,
      scenario,
      parsed.data.llmConfig
    );
    return NextResponse.json({ decision });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 不要在错误信息里包含 apiKey 或客户端传来的任何敏感字段
    console.error(`[decide] ${scenario.id}/${persona.name} failed:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
