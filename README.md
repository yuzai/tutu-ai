# tutu-ai · 多智能体生成式仿真框架

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](tsconfig.json)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)

一个**轻量级中文友好的多智能体仿真框架**：在 2D 网格小镇上，每个 NPC 由 LLM 按自己的人设、记忆、关系网自主行动 — 走路、对话、做事、串门。

灵感来源于 Stanford [Generative Agents (Smallville)](https://github.com/joonspk-research/generative_agents)，做了中文化和小模型适配。

> **形态**：2D 网格 · **技术栈**：Next.js 14 + TypeScript · **模型**：任何 OpenAI 兼容协议（本地 Ollama / LM Studio / vLLM / 远端 OpenAI / DeepSeek / Moonshot…）

## 🚀 一键部署 / 在线体验

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yuzai/tutu-ai&project-name=tutu-ai&repository-name=tutu-ai)

> **🌐 在线 Demo**：<https://tutu-ai-one.vercel.app/> — 直接体验，自带 ⚙️ 面板填你自己的 LLM key。

部署后用户访问首页 → 选场景 → 进入仿真 → 点 ⚙️ 填自己的 API key（Ollama / DeepSeek / OpenAI 均可），立即开跑。**服务端零状态、零环境变量、不存任何 key**。

## 自带 8 个场景

| 场景 | 描述 | 角色数 |
|---|---|:---:|
| 🏘️ **tutu** | 《大耳朵图图》翻斗大杂院（致敬同人，见底部说明）| 7 |
| 🏢 **office** | 科技公司一天（老板/PM/工程师/设计师/实习生/前台）| 6 |
| 📚 **school** | 一年三班（班主任/班长/捣蛋鬼/学霸/体育委员/校长）| 6 |
| 🛝 **playground** | 小区遛娃（妈妈/爷孙/八卦阿姨/独居老人）| 6 |
| 🏋️ **gym** | 城市健身房（私教/吹牛大叔/网红/阿姨）| 6 |
| 🎸 **festival** | 夏日音乐节（摇滚铁粉/网红/DJ/餐车）| 6 |
| 🏯 **wuxia** | 江湖小镇（客栈/武馆/镖局/算命瞎子）| 6 |
| 🏚️ **xianxia** | 青云宗（掌门/大师兄/二师姐/小师妹）| 6 |

在 `.env.local` 切换：`NEXT_PUBLIC_SCENARIO=office`（改完要**重启** dev server）。

也可以加你自己的场景，见下文"自定义场景"。

## 它能做什么

- 多个角色独立人设、口吻、人际关系、作息。
- 每个 tick 由 LLM 决定角色的下一步动作：去某地、对身边人说话、做某件事、睡觉、等一会儿。
- 角色有**短期记忆**（最近 60 条），会记得自己刚做过什么、刚听谁说了什么。
- 互动是涌现的：撞见、吃醋、八卦、争执都不是写死的，是模型从人设 + 当下情景里自然长出来的。
- 可视化 2D 小镇 + 实时对话气泡 + 想法冒泡 + 活动标签 + 事件日志 + 单角色"内心戏"面板。
- 地图支持鼠标滚轮缩放、拖动平移，气泡文字始终保持清晰大小。
- **用户介入**：可以以"路人"身份插话，让某个角色或所有人收到你的消息并自然回应。
- **运行时配置**：浏览器 ⚙️ 面板里填 baseURL / API key / model / 并发等，零环境变量。
- **多场景切换**：UI 上一键切换场景，无需重启。

## ⚠️ 模型选择最关键

**请用"小且非思考"的 instruct 模型**，否则仿真完全跑不起来：

- 7 个角色每个 tick 都在请求决策。如果模型 30+ 秒/次（典型思考模型），整个世界会卡得像停滞。
- **思考模型（Qwen3 全系、DeepSeek-R1 系等）默认会先 `<think>...</think>` 大段思考再回答，速度比同尺寸 instruct 模型慢 3-10 倍**。
- 单 GPU 推理 7B 已经是边界，**3B 是甜蜜点**。

| 推荐 | 大小 | 单次决策耗时（M 系芯片 / 8GB+ GPU）| 备注 |
|---|---|---|---|
| ⭐ `qwen2.5:3b-instruct` | 1.9GB | 1-3s | **首选**。中文好、JSON 跟随 OK、速度快 |
| `qwen2.5:7b-instruct` | 4.7GB | 3-8s | 角色扮演更稳，慢一倍 |
| `qwen2.5:1.5b-instruct` | 1GB | <1s | 速度极快但人设细节会糊 |
| ❌ `qwen3:8b` / `qwen3:14b` | - | 10-30s | 思考模型，默认很慢；想用要在 `.env.local` 设 `TUTU_DISABLE_THINKING=1` |
| ❌ `deepseek-r1:*` | - | 30s+ | 同上 |

远端 API（DeepSeek、Moonshot、OpenAI 等）速度通常都够。

## 5 分钟跑起来

### 1. 准备 OpenAI 兼容的模型后端

**本地 Ollama**：

```bash
ollama pull qwen2.5:3b-instruct
ollama serve  # 默认监听 http://localhost:11434
```

**或 LM Studio**：下载一个 chat 模型，启动本地 server（默认 `http://localhost:1234`）。

**或远端**：DeepSeek / Moonshot / OpenAI / 通义千问 OpenAI 模式…… 任何遵循 `/v1/chat/completions` 协议的都行。

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
# 编辑 .env.local
```

```env
# Ollama 示例
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5:3b-instruct
TUTU_MAX_TOKENS=600
TUTU_DISABLE_THINKING=0      # 用非思考模型时设 0；用 Qwen3 等思考模型设 1
TUTU_JSON_MODE=0             # Ollama 上对 json_object 支持参差，默认关
TUTU_DEBUG_LLM=1             # 每次决策打一行摘要到终端
NEXT_PUBLIC_TICK_INTERVAL_MS=2500
NEXT_PUBLIC_SCENARIO=tutu    # 切场景：tutu 或 office
```

```env
# DeepSeek 示例
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=deepseek-chat
```

### 3. 装依赖 + 跑

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

点 **▶ 开始**。第一次 LLM 调用可能要等几秒，正常。

## 操作

| 控件 | 作用 |
|---|---|
| **▶ 开始 / ⏸ 暂停** | 启停 tick 循环 |
| **⏭ 单步** | 暂停状态下手动推进一格 tick（调试模型决策时最有用）|
| **↺ 重置** | tick 归零，所有 agent 回到初始位置 |
| **速度 0.25× / 0.5× / 1× / 2× / 4×** | 倍速 tick 间隔。本地慢模型选 0.25×~0.5× 比较跟得上 |
| **场景下拉** | 一键切换场景，会重置当前世界 |
| **⚙️ 设置** | LLM baseURL / API key / model / 并发 / 调试日志 等，浏览器本地保存 |
| **点角色** | 地图上或名册里点一下，右侧详情面板显示 TA 的人设、当前动作、最近 16 条记忆 |
| **路人输入框** | 选目标角色 + 输入文字 + Enter 发送，AI 角色会按人设回应你 |
| **滚轮 / 拖动** | 地图缩放和平移；🎯 重置视图按钮回到默认 |

## 看日志

**浏览器 console** —— 每个 tick 的派发情况：

```
[tick 5] 派 胡图图(idle), 张小丽(hasHeard) | 跳过 胡英俊=决策中 牛爷爷=走路中 ...
```

**Next dev 终端** —— 每次 LLM 调用前后摘要：

```
→ 胡图图    询问中…
← 胡图图    11042ms 52t · say → 张小丽：「我就要嘛！」 · 想法："妈妈又凶我…"
```

想看完整 prompt 和 raw response，`.env.local` 加 `TUTU_DEBUG_VERBOSE=1`。

## 仿真节奏调参

| 参数 | 在哪 | 当前值 | 含义 |
|---|---|---|---|
| `NEXT_PUBLIC_TICK_INTERVAL_MS` | `.env.local` | 2500 | 每 tick 真实毫秒（仅 dev 启动时读，改完要重启）|
| `TUTU_MAX_TOKENS` | `.env.local` | 600 | LLM 输出上限。被截断会报 `finish=length` |
| `MAX_CONCURRENT_DECISIONS` | [lib/simulation.ts:14](lib/simulation.ts#L14) | 4 | 同时进行的 LLM 调用数。本地 GPU 建议 2-5，远端 API 可拉到 10+ |
| `RE_DECIDE_TICKS` | [lib/simulation.ts:13](lib/simulation.ts#L13) | 12 | 在做事的 agent 多久强制重新决策一次（让 agent 不一直杵在那）|
| `NEAR_RADIUS` | [lib/simulation.ts:11](lib/simulation.ts#L11) | 5 | 说话广播的曼哈顿距离上限 |
| `SPEECH_TTL_TICKS` | [lib/simulation.ts:12](lib/simulation.ts#L12) | 4 | 头顶对话气泡的显示时长 |
| `TICK_MINUTES` | [lib/simulation.ts:18](lib/simulation.ts#L18) | 5 | 每 tick 在仿真世界里推进多少分钟 |

## 项目结构

```
tutu-ai/
├── app/
│   ├── page.tsx              # 主页（UI + tick 心跳驱动）
│   ├── layout.tsx
│   ├── globals.css
│   └── api/agent/decide/     # POST: 给定 agent + observation → 返回 action JSON
├── components/
│   ├── WorldView.tsx         # SVG 2D 地图（角色 emoji + 气泡 + 思考光圈）
│   ├── AgentPanel.tsx        # 名册 + 单角色详情面板
│   ├── EventLog.tsx          # 滚动事件日志
│   └── Controls.tsx          # ▶⏸⏭↺ + 速度档
└── lib/
    ├── scenarios/            # ⭐ 所有场景数据在这里
    │   ├── types.ts          # Scenario 类型定义
    │   ├── index.ts          # 场景注册 + 当前激活场景
    │   ├── tutu/             # 翻斗大杂院场景
    │   │   ├── places.ts
    │   │   ├── characters.ts
    │   │   └── index.ts
    │   └── office/           # 科技公司场景
    │       ├── places.ts
    │       ├── characters.ts
    │       └── index.ts
    ├── types.ts              # 仿真核心数据类型
    ├── world.ts              # 地图、移动数学（从 active scenario 取数据）
    ├── characters.ts         # 角色访问层（从 active scenario 取数据）
    ├── llm.ts                # OpenAI 兼容客户端（zod 校验、剥 think 标签）
    ├── agent.ts              # 提示词构建 + 决策标准化
    └── simulation.ts         # Zustand store + tick 循环 + 决策派发 + 记忆/广播
```

## 自定义场景

新场景就是一个 `Scenario` 对象，包含 6 件事：地图尺寸、起始时间、tick 分钟数、可选时段提示、地点列表、角色列表。

### 三步加一个新场景

**1. 建目录**：`lib/scenarios/<your_id>/`，里面三个文件 `places.ts` / `characters.ts` / `index.ts`（照 `tutu/` 抄一份再改）。

**2. 定义 Scenario**（`index.ts`）：

```ts
import type { Scenario } from "../types";
import { MY_PLACES } from "./places";
import { MY_CHARACTERS } from "./characters";

export const myScenario: Scenario = {
  id: "my_world",
  name: "我的世界",
  description: "一句话简介，会显示在标题下方。",
  world: {
    width: 32,
    height: 20,
    startHour: 8,            // 一天从几点开始
    tickMinutes: 5,          // 每 tick 推进多少 sim 分钟
    timeOfDayHints: {        // 可选 — 自定义时段提示
      "9-12": "上午专注工作时段",
      "12-14": "午餐时间",
      // ... 不写就用默认的
    },
  },
  places: MY_PLACES,
  characters: MY_CHARACTERS,
};
```

**3. 注册**：在 `lib/scenarios/index.ts` 把 `myScenario` 加进 `SCENARIOS`：

```ts
import { myScenario } from "./my_world";

export const SCENARIOS: Record<string, Scenario> = {
  [tutuScenario.id]: tutuScenario,
  [officeScenario.id]: officeScenario,
  [myScenario.id]: myScenario,   // ← 加这行
};
```

然后 `.env.local` 设 `NEXT_PUBLIC_SCENARIO=my_world`，重启 dev server。

### Place 的格式

```ts
{
  id: "park",                          // 唯一 ID
  name: "翻斗公园",                     // 显示名（也是 LLM prompt 里出现的名字）
  kind: "park",                         // 类型标签：home / park / shop / restaurant / kindergarten / plaza
  rect: { x: 14, y: 1, w: 8, h: 8 },   // 矩形区域（注意别超出 width × height）
  anchor: { x: 17, y: 8 },             // 视觉锚点（暂时只用于 go_to 的默认落脚点）
  color: "#bfe5a0",                    // 矩形颜色
  emoji: "🌳",                         // 标题前的 emoji
}
```

### Character 的格式

```ts
{
  id: "tutu",                  // 唯一 ID（不要中文，pendingHeard / API 调用用得到）
  name: "胡图图",               // 显示名（LLM 里也用这个名字）
  age: 3,
  emoji: "👦",
  homeId: "tutu_home",         // 初始位置在哪个 place
  color: "#ff8b6b",            // 头像背景色
  persona: "...",              // 1-2 段，描述性格、爱好、口头禅、最怕什么
  voice: "...",                // 1 句，描述说话风格（短句？爱用感叹号？常说什么口头禅？）
  relationships: {             // 对其他角色的视角，影响互动
    "其他角色名字": "他/她在我眼里是...",
  },
  schedule: "...",             // 一日作息描述，LLM 会参考但不严格执行
}
```

写好 persona/voice/relationships 是仿真"涌现感"的关键 — 模糊但有冲突的人设比死板的清单效果好得多。

## 核心循环 1 分钟

每 2.5s（默认 tick interval），主循环做两件事：

1. **物理推进**（[`tickOnce()`](lib/simulation.ts#L170)）：所有 agent 走路 1 格、气泡过期、到达事件。
2. **决策派发**（[`diagnoseTick()`](lib/simulation.ts#L276)）：扫每个 agent，满足以下任一条件**且**并发未满 4 → 派 LLM：
   - `idle`：当前没事做
   - `stale`：≥ 12 ticks 没决策过
   - `hasHeard`：被人喊话了

被派的 agent 拿当下 observation（位置 / nearby / 最近 8 条记忆 / pending speech）走 `/api/agent/decide` 端点 → LLM 输出 `{thought, action}` → 回到前端 [`applyDecision()`](lib/simulation.ts#L207) 落地（设 targetPos / speech / activity / busy）。

LLM 调用是 async fire-and-forget，所以 tick 心跳永远不被慢模型拖住。

## 已知局限 / 后续方向

- 暂无路径规划，agent 直线穿过地点。如要加 A*，墙体在 `world.ts` 里加 `walls` 字段。
- 记忆是 ring buffer（60 条上限），没有 Stanford 论文里的反思（reflection）抽象层。
- 视觉是 SVG emoji，没像素小人。
- 没有"剧情触发器"机制（比如"图图见到小怪自动喊小怪"），目前完全靠 LLM 自然决策。
- 仅支持 2D 网格，没有物品系统（拿/放/给东西）。

## 协议与免责声明

**代码协议**：[MIT License](LICENSE) — 自由使用、修改、分发、商用。

**关于 tutu 场景**：项目内置的 `tutu` 场景是对央视动画《大耳朵图图》的**致敬性同人示例**（fan tribute），用于演示框架能力。所有角色（胡图图、胡英俊、张小丽、牛爷爷、壮壮、小美、小怪）及世界观版权归**央视动画 / 速达**等原作者所有。如果版权方有任何异议，请通过 issue 联系作者，我们会立即移除该示例场景。其余 7 个场景的角色均为原创。

**免责**：本项目为个人学习作品，与上述版权方无任何关联或商业合作关系。
