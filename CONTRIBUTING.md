# 贡献指南

欢迎贡献！项目目前是 MVP，欢迎提 issue 和 PR。

## 开发流程

```bash
git clone https://github.com/yuzai/tutu-ai
cd tutu-ai
npm install
npm run dev
```

打开 http://localhost:3000，点 ⚙️ 配置好你的 LLM 后端，开始本地开发。

提交前请确保：

```bash
npx tsc --noEmit   # TypeScript 必须无错
npm run build      # 生产构建必须通过
```

CI 会跑这两步，本地也建议跑一遍。

## 项目心智模型

具体的引擎架构、关键文件分工、踩坑记录都写在 **[CLAUDE.md](CLAUDE.md)**。第一次改代码前强烈建议先看一眼。

简要：

- 主循环：`setInterval(2.5s) → tickOnce() → diagnoseTick() → fetch /api/agent/decide → applyDecision()`
- LLM 调用 async fire-and-forget，单个 agent 卡不会拖累全局
- 引擎和场景**完全解耦** — 加新场景不需要改 simulation/agent/llm 任何引擎代码

## 加新场景

最常见的贡献。**只需要改数据，不需要碰引擎逻辑**。

1. **建目录**：`lib/scenarios/<your_id>/`，里面三个文件 `places.ts` / `characters.ts` / `index.ts`（照 `tutu/` 抄一份再改）
2. **写场景对象**：导出一个 `Scenario`（见 [lib/scenarios/types.ts](lib/scenarios/types.ts)）
3. **注册**：在 [lib/scenarios/index.ts](lib/scenarios/index.ts) 把它加进 `SCENARIOS`
4. 重启 dev server，场景下拉里就会出现

写 persona/voice/relationships 是仿真"涌现感"的关键 — 模糊但有冲突的人设比死板的清单效果好得多。具体格式见 [README.md](README.md#自定义场景)。

## 改引擎

如果要改 `lib/simulation.ts` / `lib/agent.ts` / `lib/llm.ts` 这些核心文件，请先看 [CLAUDE.md](CLAUDE.md) 里的「易踩坑」段。常见的坑：

- **Hydration 不匹配**：不要在 `makeInitialAgent` 里用 `Math.random()` / `Date.now()`
- **走路打断逻辑**：`diagnoseTick` 和 `applyDecision` 两端必须保持一致
- **`say` 只能对身边的人**：广播严格按 `NEAR_RADIUS` 距离过滤

## 提交 PR

- 一个 PR 解决一件事，别一次混多个改动
- 标题用动词开头：`feat: 加 xxx 场景` / `fix: 解决 yyy 时的崩溃` / `docs: 更新 zzz`
- PR 描述里写清「为什么」，「做了什么」可以看 diff，「为什么」别人看不出来
- UI 改动尽量附截图或 GIF

## 不建议现在加的复杂度

CLAUDE.md 列了一份"不要做的事"清单 — 这些方向不是不好，而是当前 MVP 阶段不想引入。如果你想做这些，先开 issue 讨论：

- vector database / memory reflection / long-term planning
- 把 LLM 调用挪到客户端直连
- 大型 UI 库（framer-motion / shadcn / antd）

## 行为准则

简单一句话：互相尊重、对事不对人。维护者保留以"破坏社区氛围"为由关闭 issue/PR 的权利。

## 协议

提交 PR 即同意你的贡献以本仓库的 [MIT License](LICENSE) 发布。
