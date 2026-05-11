"use client";

import { useRouter } from "next/navigation";
import { SCENARIO_LIST } from "@/lib/scenarios";
import { useSim } from "@/lib/simulation";

export default function HomePage() {
  const router = useRouter();
  const switchScenario = useSim((s) => s.switchScenario);
  const currentScenarioId = useSim((s) => s.scenarioId);

  function enter(scenarioId: string) {
    if (scenarioId !== currentScenarioId) {
      switchScenario(scenarioId);
    }
    router.push(`/sim?scenario=${scenarioId}`);
  }

  return (
    <main className="max-w-[1100px] mx-auto p-6 sm:p-10 space-y-10">
      {/* Hero */}
      <section className="space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-full bg-stone-900 text-white">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-tutu-accent" />
          基于 Stanford Generative Agents · 中文 · 本地小模型友好
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
          <span className="text-tutu-accent">赛博</span>小镇
          <span className="text-stone-400 font-normal text-2xl sm:text-3xl ml-2">tutu-ai</span>
        </h1>
        <p className="text-stone-600 max-w-2xl text-sm sm:text-base leading-relaxed">
          多智能体生成式仿真。每个角色由 LLM 按自己的人设、记忆、关系网自主行动 —— 走路、对话、做事、串门。同一套引擎可以跑不同的"场景"。
        </p>
      </section>

      {/* Scenarios */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg sm:text-xl font-bold">选个场景，进去逛逛</h2>
          <span className="text-[11px] text-stone-500">{SCENARIO_LIST.length} 个内置</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENARIO_LIST.map((s) => {
            const isCurrent = s.id === currentScenarioId;
            return (
              <button
                key={s.id}
                onClick={() => enter(s.id)}
                className="text-left panel p-5 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition group relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{s.places[0]?.emoji ?? "🌐"}</span>
                    <h3 className="text-base sm:text-lg font-bold">{s.name}</h3>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-tutu-accent text-white shrink-0">
                      当前
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-stone-600 leading-snug mb-4 min-h-[3em]">
                  {s.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.characters.slice(0, 8).map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-stone-100 text-[11px]"
                      style={{ borderLeft: `3px solid ${c.color}` }}
                    >
                      <span>{c.emoji}</span>
                      <span>{c.name}</span>
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>
                    {s.characters.length} 角色 · {s.places.length} 地点 · 从{" "}
                    {String(s.world.startHour).padStart(2, "0")}:00 开始
                  </span>
                  <span className="text-tutu-accent font-semibold group-hover:translate-x-0.5 transition">
                    进入 →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* About */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Card title="🧠 怎么运作的">
          每个 tick 心跳推一格物理（走路 / 气泡过期 / 到达事件），再扫一遍角色看谁该思考（idle / 12 tick 没决策 / 被人喊话）。被选中的就调 LLM 拿 JSON 决策落地。
        </Card>
        <Card title="🔌 模型适配">
          走 OpenAI 兼容协议，任何提供方都行：本地 Ollama / LM Studio / vLLM / 远端 OpenAI / DeepSeek / Moonshot。推荐 <code className="px-1 rounded bg-stone-100 text-[11px]">qwen2.5:3b-instruct</code>，速度和效果平衡。
        </Card>
        <Card title="🎭 自定义场景">
          所有场景在 <code className="px-1 rounded bg-stone-100 text-[11px]">lib/scenarios/</code>。三个文件就能新加一个：地图、角色、场景声明。引擎完全数据驱动，不用改任何仿真代码。
        </Card>
      </section>

      <section className="panel p-5 space-y-3">
        <h2 className="text-base font-bold">快速开始</h2>
        <ol className="text-[13px] text-stone-700 leading-relaxed space-y-2 list-decimal list-inside">
          <li>
            拉模型：<code className="px-1.5 py-0.5 rounded bg-stone-100 text-[12px]">ollama pull qwen2.5:3b-instruct</code> 然后{" "}
            <code className="px-1.5 py-0.5 rounded bg-stone-100 text-[12px]">ollama serve</code>
          </li>
          <li>
            配置：<code className="px-1.5 py-0.5 rounded bg-stone-100 text-[12px]">cp .env.local.example .env.local</code>，填好 model 和 baseURL
          </li>
          <li>
            选场景 → <span className="text-tutu-accent font-semibold">进入</span> → 仿真里点 <span className="font-semibold">▶ 开始</span>
          </li>
        </ol>
      </section>

      <footer className="text-center text-[11px] text-stone-400 pt-6 pb-2">
        仅供学习/玩耍用途 · 灵感来源{" "}
        <a
          className="underline underline-offset-2 hover:text-stone-600"
          href="https://github.com/joonspk-research/generative_agents"
          target="_blank"
          rel="noreferrer"
        >
          Stanford Generative Agents
        </a>
      </footer>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <h3 className="font-bold text-sm mb-1.5">{title}</h3>
      <p className="text-[13px] text-stone-600 leading-relaxed">{children}</p>
    </div>
  );
}
