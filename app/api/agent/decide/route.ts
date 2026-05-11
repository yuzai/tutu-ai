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

const RequestSchema = z.object({
  agentId: z.string(),
  scenarioId: z.string().optional(),
  observation: ObservationSchema,
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
    const decision = await decideForAgent(persona, parsed.data.observation, scenario);
    return NextResponse.json({ decision });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[decide] ${scenario.id}/${persona.name} failed:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
