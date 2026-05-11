# 赛博图图小镇 · tutu-ai

一个以《大耳朵图图》世界观为底的**多智能体生成式仿真**：胡图图、胡英俊、张小丽、牛爷爷、壮壮、小美、小怪…… 每个角色都由 LLM 按自己的人设、记忆、关系网自主行动 — 走路、对话、做事、串门。

灵感来源于 Stanford [Generative Agents (Smallville)](https://github.com/joonspk-research/generative_agents)，按图图世界本地化。

> 形态：2D 网格小镇 · 技术栈：Next.js 14 + TypeScript · 模型：**任何 OpenAI 兼容协议**（本地 Ollama / LM Studio / vLLM / 远端 OpenAI / DeepSeek / Moonshot…）

## 它能做什么

- 7 个图图世界经典角色，每个有独立人设、口吻、人际关系、作息。
- 每个 tick 由 LLM 决定角色的下一步动作：去某地、对身边人说话、做某件事、等一会儿。
- 角色有**短期记忆**，会记得自己刚做过什么、刚听谁说了什么。
- 互动是涌现的：壮壮看见图图可能会先吃醋，张小丽撞见胡英俊偷溜面馆可能会发飙。
- 可视化 2D 小镇 + 实时对话气泡 + 事件日志 + 单角色"内心戏"面板。

## 5 分钟跑起来

### 1. 选一个 OpenAI 兼容的模型后端

**本地（推荐 Ollama）**

```bash
# 安装 ollama，然后拉一个中文能力还可以的小模型
ollama pull qwen2.5:7b-instruct
ollama serve  # 默认监听 http://localhost:11434
```

**或 LM Studio**：打开 LM Studio，下载一个 chat 模型，启动本地 server（默认 `http://localhost:1234`）。

**或远端 OpenAI 兼容服务**：DeepSeek / Moonshot / OpenAI / 通义千问 OpenAI 模式 …… 任何遵循 `/v1/chat/completions` 协议的都行。

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
# 编辑 .env.local，填入对应 baseURL / apiKey / model
```

```env
# Ollama 示例
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5:7b-instruct

# DeepSeek 示例
# OPENAI_BASE_URL=https://api.deepseek.com/v1
# OPENAI_API_KEY=sk-xxxxx
# OPENAI_MODEL=deepseek-chat
```

### 3. 装依赖 + 起服务

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

点 **▶ 开始**，仿真就跑起来了。第一次 LLM 调用可能要等几秒（尤其是本地小模型）。

## 操作

- 顶部 **▶ 开始 / ⏸ 暂停 / ↺ 重置 / 速度切换**
- 点 **地图上的角色** 或右侧 **名册** 中的卡片 → 右下角面板显示 TA 的当前动作、想法、最近 8 条记忆
- 底部 **事件日志** 滚动显示发生的所有事情

## 仿真节奏调参

- `NEXT_PUBLIC_TICK_INTERVAL_MS`（默认 1500ms）：每 tick 的实时秒数。
- 仿真中每 tick = 5 个 in-sim 分钟（7:00 开始一天）。
- 每个角色至少 12 ticks 触发一次重新决策；说话/做事完成后立刻决策。
- 同时进行的 LLM 决策上限为 2（避免压垮本地模型），可在 `lib/simulation.ts` 顶部的 `MAX_CONCURRENT_DECISIONS` 调整。
- 7B 模型每次决策大约 5-15 秒，14B 模型大约 10-30 秒；想流畅就上更快的远端 API 或更小的模型。

## 项目结构

```
tutu-ai/
├── app/
│   ├── page.tsx              # 主页（仿真 UI + tick 驱动）
│   ├── layout.tsx
│   ├── globals.css
│   └── api/agent/decide/     # POST: 给定 agent + observation → action
├── components/
│   ├── WorldView.tsx         # SVG 2D 地图
│   ├── AgentPanel.tsx        # 名册 + 单角色面板
│   ├── EventLog.tsx
│   └── Controls.tsx
└── lib/
    ├── types.ts              # 核心数据类型
    ├── world.ts              # 地图、地点、移动
    ├── characters.ts         # 7 个图图世界角色 + 人设
    ├── llm.ts                # OpenAI 兼容客户端（zod 校验）
    ├── agent.ts              # 提示词构建 + 决策标准化
    └── simulation.ts         # Zustand store + tick 循环 + 决策派发
```

## 自己加角色 / 地点

- 加角色：编辑 `lib/characters.ts`，复制一项，填好 `persona`、`voice`、`relationships`、`schedule`、`homeId`。
- 加地点：编辑 `lib/world.ts` 的 `PLACES`，确保 `rect` 在 `WORLD_W × WORLD_H`（32×20）范围内不严重重叠。

## 已知局限 / 后续方向

- 暂无路径规划，agent 直线穿过地点。如果你想加 A*，墙体在 `world.ts` 里加 `walls` 字段即可。
- 记忆是 ring buffer，没有反思/总结/长期记忆。可加 Stanford 论文里的 "reflection" 步骤。
- 视觉是 SVG emoji，可换成 sprite sheet 或像素图图角色立绘。
- 不知道用户介入怎么玩？可以加一个"以图图身份说话"的输入框，把用户的话作为 pendingHeard 注入到附近角色。

## 协议

仅供学习/玩耍用途。《大耳朵图图》角色与世界观版权归原作者所有。
