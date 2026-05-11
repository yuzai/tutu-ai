# CLAUDE.md

这份文档是给 Claude Code 看的项目工作指引。User-facing 说明在 [README.md](README.md)。

## 项目一句话

**轻量级中文多智能体生成式仿真框架**（参考 Stanford Generative Agents 范式）。Next.js 14 + TS 全栈，LLM 走 OpenAI 兼容协议（默认接本地 Ollama）。**数据驱动的"场景"机制** — 同一套引擎跑不同的人物/地图配置。

自带两个场景：`tutu`（翻斗大杂院，《大耳朵图图》同人）和 `office`（科技公司一日）。可通过 `NEXT_PUBLIC_SCENARIO` 切换，也可加自定义。

## 心智模型

**主循环范式**：`setInterval(2.5s) → tickOnce()推物理 → diagnoseTick()派决策 → fetch /api/agent/decide → applyDecision()`。

LLM 调用 **async fire-and-forget**，模型慢只让单个 agent 卡，不卡心跳，不卡其他 agent。

**三个触发条件**（[lib/simulation.ts:276](lib/simulation.ts#L276) `diagnoseTick`）：
- `idle`：`busyUntilTick <= now`（动作做完）
- `stale`：`now - lastDecisionTick >= RE_DECIDE_TICKS`（默认 12 ticks 强制再想一次）
- `hasHeard`：`pendingHeard[id].length > 0`（被人喊话）

加两个排他：`isDeciding`（在等模型）、`targetPos != null && !hasHeard`（走路中除非被打断）。

**四种动作**（[lib/simulation.ts:207](lib/simulation.ts#L207) `applyDecision`）：
- `go_to(placeId)` → 设 `targetPos`，后续 tick 一格一格走过去
- `say(target, utterance)` → 立刻冒气泡 + 广播给 `NEAR_RADIUS` 内的人作 `pendingHeard`
- `do(activity)` → 设 activity 文字 + busy N
- `wait()` → 仅 busy 倒计时

非 `go_to` 的决策会**主动清掉 `targetPos`**（停下脚步说话/做事）。

## 关键文件（按职责）

| 文件 | 干什么 | 改的时候注意 |
|---|---|---|
| [lib/scenarios/types.ts](lib/scenarios/types.ts) | `Scenario` 类型定义 | 场景必须包含 world / places / characters；可选 timeOfDayHints |
| [lib/scenarios/<id>/](lib/scenarios/) | 各场景的数据包 | 三件套：`places.ts` + `characters.ts` + `index.ts`。完全数据驱动，不写仿真逻辑 |
| [lib/scenarios/index.ts](lib/scenarios/index.ts) | 场景注册表 + `ACTIVE_SCENARIO` | 加新场景：建目录 + 在这里加入 `SCENARIOS` |
| [lib/types.ts](lib/types.ts) | 共享类型 | `AgentRuntime` 是仿真核心，加字段要在 `makeInitialAgent` 里初始化 |
| [lib/world.ts](lib/world.ts) | 移动数学 + PLACES 访问层 | 从 `ACTIVE_SCENARIO.places` 读；`stableCellInPlace` 用于 SSR-safe 初始位置；`randomCellInPlace` 只在客户端运行时用 |
| [lib/characters.ts](lib/characters.ts) | 角色访问层 | thin wrapper，从 `ACTIVE_SCENARIO.characters` re-export |
| [lib/llm.ts](lib/llm.ts) | OpenAI 兼容客户端 + zod 校验 | 见下面"LLM 调用注意" |
| [lib/agent.ts](lib/agent.ts) | prompt 构建 + 决策标准化 | `buildSystemPrompt` 角色化，`buildUserPrompt` 上下文化；`timeOfDayHint` 优先用 scenario 提供的，再 fallback 默认 |
| [lib/simulation.ts](lib/simulation.ts) | Zustand store + tick 循环 + 派发 + 广播 | `diagnoseTick` / `tickOnce` / `applyDecision` 三件套；`START_HOUR` 和 `TICK_MINUTES` 从 scenario 读 |
| [app/api/agent/decide/route.ts](app/api/agent/decide/route.ts) | 后端 LLM 端点 | 30 行胶水，校验入参 + 调 `decideForAgent` |
| [app/page.tsx](app/page.tsx) | UI 组装 + tick 心跳 driver | `useEffect` 起 `setInterval`；标题/描述从 `ACTIVE_SCENARIO` 取 |
| [components/*.tsx](components/) | 纯 UI，无仿真逻辑 | |

## LLM 调用注意（[lib/llm.ts](lib/llm.ts)）

- **协议**：`openai` SDK 但 `baseURL` 可换，**绝对不要**改成绑定单一厂商 SDK（用户明确要求要能切本地模型，见 [memory/feedback_llm_provider.md](../memory/feedback_llm_provider.md)）
- **思考模型**：Qwen3 系列、DeepSeek-R1 等会先 `<think>...</think>` 大段思考。`TUTU_DISABLE_THINKING=1` 会在 user prompt 末尾追加 `/no_think`。代码里有 `stripThinkTags()` 兜底剥离。
- **JSON 模式**：默认**关**（`TUTU_JSON_MODE=0`）。Ollama 上 `response_format: json_object` 与思考模型同存会产空字符串。prompt 已强约束输出 JSON。
- **schema 宽容**：`thought` 字段允许 `thought | thinking | reason` 别名，缺失则空字符串。这是给小模型留余地（[lib/llm.ts:55](lib/llm.ts#L55)）。
- **JSON 解析**：`extractJSON()` 兼容 markdown 围栏 ```` ```json ... ``` ````。
- **日志两层**：`TUTU_DEBUG_LLM=1` 打单行摘要；`TUTU_DEBUG_VERBOSE=1` 打完整 prompt + raw response。

## 场景机制

- `ACTIVE_SCENARIO` 是**模块级常量**，进程内不可切换（切场景要重启 dev server）
- `NEXT_PUBLIC_SCENARIO` 选场景；非法值 fallback 到 `tutu`
- `lib/world.ts` 和 `lib/characters.ts` 是**透明 wrapper**，所有数据从 `ACTIVE_SCENARIO` 拿。不要把场景数据直接写进这两个文件
- 加新场景时**不需要**改 simulation/agent/llm 任何引擎代码 — 只动 `lib/scenarios/<id>/`
- 场景里的 `timeOfDayHints` 是可选的，格式 `"6-9": "提示文本"`，未命中区间 fallback 到 `defaultHint()` (in `agent.ts`)

## 易踩坑

### Hydration 不匹配
SSR 与客户端首次渲染必须算出**同样**的初始 agent 位置。所以：
- 首次初始化用 `stableCellInPlace(home, persona.id)`（基于 id 的稳定哈希）
- **不要在 `makeInitialAgent` 或 `initialAgents` 里调 `Math.random()` / `Date.now()`**
- 运行中（`applyDecision` 里的 `go_to`）用 `randomCellInPlace` 是 OK 的，只在客户端运行

### `NEXT_PUBLIC_*` 环境变量
改 `NEXT_PUBLIC_TICK_INTERVAL_MS` 或 `NEXT_PUBLIC_SCENARIO` 必须重启 `npm run dev`，Next 构建时注入，不热重载。

### 并发上限
`MAX_CONCURRENT_DECISIONS`（默认 4）平衡 GPU 显存与 agent 活跃度。本地单卡 7B+ 模型不要超过 5。**远端 API 可以拉到 10+**。

### 模型选择教训
**用户明确说不要用思考模型做仿真**（太慢，仿真感全无）。推荐顺序：`qwen2.5:3b-instruct` > `qwen2.5:7b-instruct` > 远端 API > 思考模型（最后）。

### 走路打断
hasHeard 优先级最高，可以打断 `targetPos`（在 `diagnoseTick` 里）。`applyDecision` 收到非 `go_to` 的新决策会清掉 targetPos（停下脚步）。改的时候要保持这两端一致，否则会出现"边走边做事"或"听到话不响应"。

### 说话只能对身边的人
`say` 的广播严格按 `NEAR_RADIUS` 距离过滤，**没有"被点名跨距离能听到"的特例**。Prompt 里也强约束了 target 必须是 nearby 列表里的人。如果模型乱点远处的人，结果就是自言自语（头顶冒泡但没人收到）。

## 命令速查

```bash
npm install              # 装依赖
npm run dev              # dev server (http://localhost:3000)
npm run build            # 生产构建
npm run typecheck        # 等于 npx tsc --noEmit，必须无错才行
```

## 写代码风格约定

- 默认**不写注释**，除非要解释"为什么"而不是"是什么"
- 不写 docstring 块
- 不主动加 fallback / error handling 给"不会发生"的情况
- Tailwind 是默认样式方案
- 中文注释 OK（用户主用中文交流）
- 改完务必跑 `npx tsc --noEmit`

## 不要做的事

- 不要给项目加 vector database / memory reflection / longer-term planning，**除非用户明确要求**。当前是 MVP，加复杂度需要 review。
- 不要把 LLM 调用挪到客户端直连。后端中转是为了人设 / API key 不暴露。
- 不要把 prompt 模板拆出到 `.md` 文件再读。当前都在 `lib/agent.ts` 里就够了。
- 不要在 `lib/simulation.ts` 里直接 import `openai` 包。LLM 调用走 `/api/agent/decide` 后端，前端 store 只管状态。
- 不要装 framer-motion / shadcn / antd 等大依赖来"美化 UI"。当前 SVG + Tailwind 够用。
