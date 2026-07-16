# 多色相扁平化配色丰富化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 将上一轮单一靛蓝+灰阶的深色配色升级为配色丰富的多色相扁平化系统——各功能区域（标题/输入/控制/进度/按钮/树/代码/栈）用不同色相区分但同属一套扁平色板，并引入 CSS 变量系统实现一处调整全站生效。

**Architecture:** 数据流：`src/theme/colors.ts` 的 `palette` 是唯一配色真源 → 在 `src/index.css` 的 `:root` 注入同名 CSS 变量（`--c-bg` / `--c-surface` / `--c-cyan` / `--c-violet` / `--c-pink` / `--c-emerald` / `--c-indigo` 等，值与 palette 完全一致）→ 7 个 CSS 文件改为引用 `var(--c-*)` 而非硬编码 hex → 各区域按色相分工：标题/返回链接=青(cyan)、输入区=靛(indigo)、速度方法控制=紫(violet)、步骤进度=粉(pink)、播放按钮=翠绿(emerald)、树节点状态=红/绿/琥珀/灰(已有保留)、代码面板=靛蓝头+多彩类型(增强)、栈面板=琥珀顶(保留)。关键决策：保留 palette 已有 key 不改名（3 个 TS 文件依赖），仅新增 key；CSS 变量与 palette hex 双源同步，变量名注释在 palette 中标注。设计理由：多色相按区域分工比单一主色更有视觉节奏感，但统一取自标准设计色（Tailwind 500/600 级、饱和度对齐）保证扁平不花。

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, d3 7.9, CSS3 自定义属性（`--c-*` 变量）、SVG

**Risks:**
- palette.ts 与 index.css 的 `:root` 变量是双源，改一处忘改另一处会不一致 → 缓解：palette.ts 作为唯一真源，每个新增 hex 旁注释对应变量名（如 `// =var(--c-cyan)`），CSS 变量值逐字复制
- 丰富配色易"花"→ 缓解：新增主色相限定 6 个（cyan/indigo/violet/pink/emerald/amber），全部取 Tailwind 500 级，明度统一在深底之上的中等亮度；深底仍单一（`#0B1220`）做视觉锚
- palette 改动可能破坏 3 个 TS 文件引用 → 缓解：不删不改名已有 key，只新增 key（`cyan`/`cyanDark`/`violet`/`violetDark`/`pink`/`pinkDark`/`emerald`/`emeraldDark`/`indigo`/`indigoDark`/`bgAppDeep`）
- 按钮多色相 hover 态需各配深一档 → 缓解：每个新色相定义 base + dark 两档

---

### Task 1: 扩展 palette 多色相 token + 在 index.css 注入 CSS 变量

**Depends on:** None
**Files:**
- Modify: `src/theme/colors.ts`（全文）
- Modify: `src/index.css:1-12`（`:root` 块追加 CSS 变量）

- [ ] **Step 1: 重写 colors.ts — 新增多色相区域主色 token，保留所有已有 key 不改名**
文件: `src/theme/colors.ts`（全文替换）

```typescript
// src/theme/colors.ts

/**
 * 多色相扁平化配色 token 系统
 * 每个功能区域用一个主色相，色相间形成节奏但同属一套扁平色板（Tailwind 500/600 级）。
 * CSS 变量（--c-*）在 index.css :root 中同步，组件 CSS 引用 var(--c-*) 而非硬编码 hex。
 */

export const palette = {
  // 主操作色
  primary: '#6366F1',       // 靛蓝 - 主操作 / 代码高亮行  =var(--c-indigo)
  primaryDark: '#4F46E5',

  // 区域主色相（新增，按功能区分）
  cyan: '#06B6D4',          // 青 - 标题/返回链接       =var(--c-cyan)
  cyanDark: '#0891B2',
  indigo: '#6366F1',        // 靛 - 输入区/构建按钮     =var(--c-indigo)
  indigoDark: '#4F46E5',
  violet: '#8B5CF6',        // 紫 - 速度/方法控制       =var(--c-violet)
  violetDark: '#7C3AED',
  pink: '#EC4899',          // 粉 - 步骤进度条          =var(--c-pink)
  pinkDark: '#DB2777',
  emerald: '#10B981',       // 翠绿 - 播放/随机/操作     =var(--c-emerald)
  emeraldDark: '#059669',
  amber: '#F59E0B',         // 琥珀 - 栈/访问           =var(--c-amber)
  amberDark: '#D97706',

  // 节点状态色（保留 key，微调更鲜艳以适配多色背景）
  nodeDefault: '#64748B',   // 石板灰 - 未访问
  nodeCurrent: '#EF4444',   // 红 - 正在访问
  nodeVisited: '#10B981',   // 翠绿 - 已访问
  nodeInStack: '#F59E0B',   // 琥珀 - 在栈中
  nodePopped: '#94A3B8',    // 浅灰 - 已弹出

  // 连接线与边（保留）
  linkDefault: '#94A3B8',
  linkLeft: '#10B981',      // 左子树连线 - 绿
  linkRight: '#EF4444',     // 右子树连线 - 红

  // 操作 badge 配色（保留）
  action: {
    push: '#10B981',        // 入栈 - 绿
    pop: '#EF4444',         // 出栈 - 红
    visit: '#F59E0B',       // 访问 - 琥珀
    moveRight: '#8B5CF6',   // 右移 - 紫
    init: '#6366F1',        // 初始化 - 靛
  } as const,

  // 背景 / 表面（深底单一做视觉锚，表面分层）
  bgApp: '#0B1220',         // 深色应用背景  =var(--c-bg)（比上轮 #0F172A 更深更冷）
  bgAppDeep: '#070B14',      // 更深底（代码面板）
  bgSurface: '#1E293B',     // 卡片表面      =var(--c-surface)
  bgSurfaceAlt: '#334155',  // 次级表面      =var(--c-surface-alt)
  bgCode: '#0B1120',        // 代码面板深底
  bgHighlightLine: 'rgba(99, 102, 241, 0.28)', // 代码当前行高亮（随 primary 更新）

  // 文字（保留）
  textPrimary: '#F8FAFC',    // =var(--c-text)
  textSecondary: '#94A3B8',  // =var(--c-text-secondary)
  textMuted: '#64748B',      // =var(--c-text-muted)
  textOnColor: '#FFFFFF',    // =var(--c-text-on-color)

  // 边框（保留，borderActive 随 primary 更新）
  border: '#334155',         // =var(--c-border)
  borderActive: '#6366F1',   // =var(--c-border-active)
} as const;

/** 节点状态 → 填充色（供 treeRenderer 使用） */
export function nodeFillColor(
  isCurrent: boolean,
  isVisited: boolean,
  isInStack: boolean,
): string {
  if (isCurrent) return palette.nodeCurrent;
  if (isVisited) return palette.nodeVisited;
  if (isInStack) return palette.nodeInStack;
  return palette.nodeDefault;
}

/** 节点状态 → 边框色 */
export function nodeStrokeColor(
  isCurrent: boolean,
  isVisited: boolean,
  isInStack: boolean,
): string {
  if (isCurrent) return palette.pinkDark;
  if (isVisited) return '#047857';
  if (isInStack) return palette.amberDark;
  return '#475569';
}
```

- [ ] **Step 2: 修改 index.css :root — 注入 CSS 变量，与 palette 同值**
文件: `src/index.css:1-12`（替换 `:root` 块，保留 body 等）

```css
:root {
  font-family: system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: dark;
  color: #F8FAFC;
  background-color: #0B1220;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  /* 多色相扁平化 CSS 变量（值与 src/theme/colors.ts palette 一致，唯一真源在 palette） */
  --c-bg: #0B1220;
  --c-surface: #1E293B;
  --c-surface-alt: #334155;
  --c-border: #334155;

  --c-cyan: #06B6D4;
  --c-cyan-dark: #0891B2;
  --c-indigo: #6366F1;
  --c-indigo-dark: #4F46E5;
  --c-violet: #8B5CF6;
  --c-violet-dark: #7C3AED;
  --c-pink: #EC4899;
  --c-pink-dark: #DB2777;
  --c-emerald: #10B981;
  --c-emerald-dark: #059669;
  --c-amber: #F59E0B;
  --c-amber-dark: #D97706;

  --c-text: #F8FAFC;
  --c-text-secondary: #94A3B8;
  --c-text-muted: #64748B;
  --c-text-on-color: #FFFFFF;
  --c-border-active: #6366F1;
}
```

- [ ] **Step 3: 验证 TypeScript 编译通过（palette 已有 key 未改名，3 个 TS 文件引用不受影响）**
Run: `npx tsc --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 验证 build 通过**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 5: 提交**
Run: `git add src/theme/colors.ts src/index.css && git commit -m "feat(theme): 扩展palette多色相token并在index.css注入CSS变量系统"`

---

### Task 2: 改造 BinaryTreeInorderTraversal.css 为区域分色引用 CSS 变量

**Depends on:** Task 1
**Files:**
- Modify: `src/components/BinaryTreeInorderTraversal.css`（全文）

- [ ] **Step 1: 重写 BinaryTreeInorderTraversal.css — 标题青/控制紫/进度粉/按钮翠绿，全引用 var(--c-*)**
文件: `src/components/BinaryTreeInorderTraversal.css`（全文替换）

```css
.binary-tree-inorder-traversal {
  max-width: 100%;
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', system-ui, 'Arial', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background-color: var(--c-bg);
  color: var(--c-text);
}

.title-container {
  display: flex;
  align-items: center;
  position: relative;
  padding: 0 10px;
  margin-top: 5px;
}

/* 返回链接 — 青色 */
.back-link {
  position: absolute;
  left: 10px;
  color: var(--c-cyan);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(6, 182, 212, 0.12);
  border-left: 3px solid var(--c-cyan);
  display: flex;
  align-items: center;
  z-index: 10;
}

.back-link:hover {
  color: #67E8F9;
  background-color: rgba(6, 182, 212, 0.22);
  transform: translateX(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

h1 {
  color: var(--c-text);
  text-align: center;
  margin: 0 0 1px 0;
  font-size: 1.1rem;
  padding: 2px 0;
  width: 100%;
}

/* 题目描述 — 青色左边框 */
.problem-description {
  background-color: var(--c-surface);
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: 5px;
  border-left: 3px solid var(--c-cyan);
  font-size: 0.75rem;
  color: var(--c-text-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.problem-description p {
  margin: 2px 0;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 8px;
}

/* 算法控制区 — 紫色主题 */
.algorithm-section {
  display: flex;
  align-items: center;
  height: 32px;
  margin: 0;
  padding: 0;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  width: 100%;
}

.method-selection {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0 10px;
  border-right: 1px solid var(--c-border);
  height: 100%;
  flex-shrink: 0;
  min-width: 120px;
}

.method-selection label {
  display: flex;
  align-items: center;
  margin-right: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  color: #CBD5E1;
}

.method-selection label:last-child {
  margin-right: 0;
}

.method-selection label input {
  margin-right: 3px;
  accent-color: var(--c-violet);
}

.speed-control {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  padding: 0 10px;
}

.speed-control label {
  white-space: nowrap;
  font-size: 0.8rem;
  flex-shrink: 0;
  margin-right: 8px;
  color: #CBD5E1;
}

/* 速度滑块 — 紫色填充 */
.speed-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 6px;
  border-radius: 3px;
  outline: none;
  margin: 0;
  cursor: pointer;
  --fill-percent: 50%;
  background: linear-gradient(to right, var(--c-violet) var(--fill-percent), var(--c-surface-alt) var(--fill-percent));
  direction: rtl;
}

.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--c-violet);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.speed-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--c-violet);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.speed-slider:hover::-webkit-slider-thumb {
  transform: scale(1.2);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
}

.speed-slider:hover::-moz-range-thumb {
  transform: scale(1.2);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
}

.speed-value {
  width: 60px;
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 8px;
  font-size: 0.8rem;
  color: var(--c-text-secondary);
}

.controls-results-wrapper {
  padding: 0 10px;
  margin-bottom: 5px;
  display: flex;
  flex-direction: column;
}

.manual-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.step-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--c-text-secondary);
}

.progress-icon {
  font-size: 0.9rem;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  margin: 2px 0;
}

.progress-step {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--c-text-muted);
  min-width: 20px;
  text-align: center;
}

/* 步骤进度条 — 粉色填充 */
.step-progress-bar {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 6px;
  background: linear-gradient(to right,
    var(--c-pink) calc((var(--value) - var(--min)) / (var(--max) - var(--min)) * 100%),
    var(--c-surface-alt) calc((var(--value) - var(--min)) / (var(--max) - var(--min)) * 100%)
  );
  border-radius: 4px;
  outline: none;
  margin: 0;
  cursor: pointer;
  position: relative;
}

.step-progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--c-pink);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.step-progress-bar::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--c-pink);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.step-progress-bar:hover::-webkit-slider-thumb {
  transform: scale(1.1);
  box-shadow: 0 0 6px rgba(236, 72, 153, 0.6);
}

.step-progress-bar:hover::-moz-range-thumb {
  transform: scale(1.1);
  box-shadow: 0 0 6px rgba(236, 72, 153, 0.6);
}

.step-buttons {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 2px;
}

/* 播放控制按钮 — 各按钮分色：重置灰、上一步青、播放翠绿、下一步紫、结束粉 */
.step-buttons button {
  padding: 4px 8px;
  background-color: var(--c-surface);
  color: var(--c-text);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.step-buttons button:hover {
  background-color: var(--c-surface-alt);
  border-color: var(--c-violet);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.step-buttons button:active {
  transform: translateY(0);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

/* 各按钮按语义上色：重置=灰、上一步=青、播放/暂停=翠绿、下一步=靛、结束=粉 */
.step-buttons .reset-button { border-color: var(--c-text-muted); }
.step-buttons .reset-button:hover { border-color: var(--c-cyan); box-shadow: 0 0 0 2px rgba(6,182,212,0.18); }

.step-buttons .prev-button { border-color: var(--c-cyan); }
.step-buttons .prev-button:hover { background-color: rgba(6,182,212,0.18); border-color: var(--c-cyan); }

.step-buttons .play-button { border-color: var(--c-emerald); background-color: rgba(16,185,129,0.15); }
.step-buttons .play-button:hover { background-color: var(--c-emerald); color: #06281D; border-color: var(--c-emerald); box-shadow: 0 2px 6px rgba(16,185,129,0.4); }

.step-buttons .pause-button { border-color: var(--c-amber); background-color: rgba(245,158,11,0.15); }
.step-buttons .pause-button:hover { background-color: var(--c-amber); color: #1A1206; border-color: var(--c-amber); }

.step-buttons .next-button { border-color: var(--c-indigo); }
.step-buttons .next-button:hover { background-color: rgba(99,102,241,0.18); border-color: var(--c-indigo); }

.step-buttons .end-button { border-color: var(--c-pink); }
.step-buttons .end-button:hover { background-color: rgba(236,72,153,0.18); border-color: var(--c-pink); }

.button-icon {
  display: inline-block;
  margin-right: 2px;
  font-size: 0.85rem;
}

/* 快捷键提示样式 */
.shortcut-hint {
  display: inline-block;
  font-size: 0.65rem;
  color: rgba(248, 250, 252, 0.8);
  background-color: rgba(0, 0, 0, 0.3);
  padding: 1px 3px;
  border-radius: 3px;
  margin-left: 3px;
  font-weight: normal;
  vertical-align: middle;
}

.step-buttons button:hover .shortcut-hint {
  background-color: rgba(0, 0, 0, 0.4);
}

.step-buttons button:disabled {
  background-color: var(--c-bg);
  color: #475569;
  border-color: var(--c-surface);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.error-message {
  color: #FCA5A5;
  background-color: rgba(239, 68, 68, 0.12);
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 0.9rem;
  border-left: 3px solid var(--c-pink-dark);
}

.warning-message {
  color: #FCD34D;
  background-color: rgba(245, 158, 11, 0.12);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 10px;
  font-size: 0.9rem;
  border-left: 3px solid var(--c-amber);
  text-align: center;
}

.visualization-wrapper {
  display: flex;
  flex: 1;
  width: 100%;
  height: calc(100vh - 140px);
  overflow: hidden;
  margin-bottom: 5px;
}

.visualization-wrapper.with-stack {
  height: calc(100vh - 140px);
}

.visualization-container {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 15px;
}

/* 树区与栈区 — 深底 + 各自左边框色区分 */
.tree-section {
  flex: 3;
  background-color: var(--c-bg);
  border: 1px solid var(--c-border);
  border-left: 3px solid var(--c-indigo);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tree-section-content {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.stack-section {
  flex: 1;
  background-color: var(--c-bg);
  border: 1px solid var(--c-border);
  border-left: 3px solid var(--c-amber);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  max-width: 230px;
  height: 100%;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .visualization-wrapper {
    height: auto;
    flex-direction: column;
  }

  .visualization-container {
    flex-direction: column;
    height: auto;
  }

  .tree-section {
    height: 50vh;
    min-height: 300px;
  }

  .stack-section {
    height: 40vh;
    min-height: 200px;
    max-width: 100%;
  }
}

/* 底部播放控制区域的紧凑样式 */
.visualization-bottom-controls {
  height: 50px;
  padding: 0;
  margin: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

#progressBarContainer {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
}

@media (max-height: 700px) {
  .step-progress-bar {
    height: 5px;
  }

  .step-buttons button {
    padding: 3px 6px;
    font-size: 0.7rem;
  }

  .button-icon {
    font-size: 0.8rem;
  }
}
```

- [ ] **Step 2: 验证 build 通过**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 3: 提交**
Run: `git add src/components/BinaryTreeInorderTraversal.css && git commit -m "feat(ui): 主样式按区域分色(青/紫/粉/翠绿)引用CSS变量"`

---

### Task 3: 改造 TreeInputExamples.css + VisualizationBottomControls.css 引用 CSS 变量

**Depends on:** Task 2
**Files:**
- Modify: `src/components/TreeInputExamples.css`（全文）
- Modify: `src/components/VisualizationBottomControls.css`（全文）

- [ ] **Step 1: 重写 TreeInputExamples.css — 输入区靛色、构建按钮靛、示例按钮青、随机按钮翠绿**
文件: `src/components/TreeInputExamples.css`（全文替换）

```css
/* 输入区 — 靛色主题 */
.tree-input-panel {
  background-color: var(--c-surface);
  border-radius: 8px;
  padding: 8px 15px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-left: 4px solid var(--c-indigo);
}

.tree-input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: nowrap;
}

.tree-input-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
}

.tree-input-wrapper label {
  font-weight: 600;
  color: #E2E8F0;
  font-size: 0.85rem;
  margin-right: 8px;
  white-space: nowrap;
}

.tree-input-container {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  width: 100%;
}

.tree-input-container input {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid var(--c-border);
  background-color: var(--c-bg);
  color: var(--c-text);
  border-radius: 6px;
  font-size: 0.85rem;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
  transition: all 0.2s;
  min-width: 120px;
}

.tree-input-container input::placeholder {
  color: var(--c-text-muted);
}

.tree-input-container input:focus {
  outline: none;
  border-color: var(--c-indigo);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

/* 构建按钮 — 靛色 */
.build-button {
  background-color: var(--c-indigo);
  color: var(--c-text-on-color);
  border: none;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.build-button:hover {
  background-color: var(--c-indigo-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);
}

.build-button:active {
  transform: translateY(1px);
}

.tree-examples {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* 示例按钮 — 青色描边 */
.example-button {
  background-color: rgba(6, 182, 212, 0.12);
  color: #67E8F9;
  border: 1px solid var(--c-cyan);
  padding: 4px 8px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
  font-weight: 500;
  white-space: nowrap;
}

.example-button:hover {
  background-color: rgba(6, 182, 212, 0.28);
  transform: translateY(-1px);
}

/* 随机按钮 — 翠绿 */
.random-button {
  background-color: var(--c-emerald);
  color: #06281D;
  border: none;
  padding: 4px 8px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.random-button:hover {
  background-color: var(--c-emerald-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
}

.random-icon {
  font-size: 0.9rem;
}

@media (max-width: 1024px) {
  .tree-input-row {
    flex-wrap: wrap;
  }

  .tree-examples {
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-top: 10px;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .tree-input-wrapper {
    width: 100%;
  }

  .example-button, .random-button {
    padding: 5px 8px;
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .tree-input-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .tree-input-wrapper {
    width: 100%;
  }

  .tree-examples {
    margin-top: 12px;
    width: 100%;
    justify-content: space-between;
  }
}
```

- [ ] **Step 2: 重写 VisualizationBottomControls.css — 底部进度区粉色引用变量**
文件: `src/components/VisualizationBottomControls.css`（全文替换）

```css
.visualization-bottom-controls {
  width: 100%;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 10px;
  background-color: var(--c-bg);
  border-top: 1px solid var(--c-border);
}

#progressBarContainer {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-step {
  font-size: 12px;
  color: var(--c-text-secondary);
  min-width: 25px;
  text-align: center;
}

/* 底部进度条 — 粉色填充 */
.step-progress-bar {
  flex: 1;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  outline: none;
  border-radius: 4px;
  position: relative;
}

.step-progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--c-pink);
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  z-index: 2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.step-progress-bar::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--c-pink);
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  z-index: 2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  border: none;
}

/* 背景填充效果 */
.step-progress-bar {
  --fill-percent: 0%;
  background: linear-gradient(to right, var(--c-pink) var(--fill-percent), var(--c-surface-alt) 0);
}
```

- [ ] **Step 3: 验证 build 通过**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 4: 提交**
Run: `git add src/components/TreeInputExamples.css src/components/VisualizationBottomControls.css && git commit -m "feat(ui): 输入区(青/靛/翠绿)与底部进度(粉)引用CSS变量"`

---

### Task 4: 改造 StackPanel.css + CodeDebugPanel.css 色彩丰富化引用 CSS 变量

**Depends on:** Task 3
**Files:**
- Modify: `src/components/StackPanel.css`（全文）
- Modify: `src/components/CodeDebugPanel.css`（全文）

- [ ] **Step 1: 重写 StackPanel.css — 琥珀顶保留、栈项多彩、引用变量**
文件: `src/components/StackPanel.css`（全文替换）

```css
/* src/components/StackPanel.css */
.stack-panel {
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow-y: auto;
  color: var(--c-text);
  font-family: 'JetBrains Mono', Consolas, monospace;
}

.sp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--c-border);
}

.sp-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: #E0E7FF;
}

.sp-action-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--c-text-on-color);
}

.sp-phase-row,
.sp-current-row,
.sp-result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--c-bg);
  border-radius: 6px;
  padding: 5px 8px;
}

.sp-phase-label,
.sp-current-label,
.sp-result-label {
  font-size: 0.72rem;
  color: var(--c-text-secondary);
}

.sp-phase-value {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-violet);
}

.sp-stack-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sp-stack-label {
  text-align: center;
  font-size: 0.68rem;
  color: var(--c-text-muted);
}

.sp-stack-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 200px;
  overflow-y: auto;
}

.sp-stack-item {
  background-color: var(--c-surface-alt);
  border-left: 3px solid #475569;
  border-radius: 4px;
  padding: 5px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.sp-stack-item.sp-top {
  background-color: var(--c-amber);
  color: #1A1206;
  border-left-color: var(--c-amber-dark);
  font-weight: 700;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.sp-item-val {
  font-size: 1rem;
}

.sp-top-tag {
  font-size: 0.62rem;
  background: rgba(0,0,0,0.25);
  padding: 1px 6px;
  border-radius: 8px;
}

.sp-empty {
  text-align: center;
  color: var(--c-text-muted);
  font-style: italic;
  padding: 12px;
  border: 1px dashed var(--c-border);
  border-radius: 6px;
}

.sp-current-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--c-emerald);
  background: rgba(16,185,129,0.15);
  padding: 2px 10px;
  border-radius: 8px;
}

.sp-current-val.sp-null {
  color: var(--c-text-muted);
  background: rgba(100,116,139,0.15);
}

.sp-desc {
  background-color: var(--c-bg);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.75rem;
  color: #CBD5E1;
  line-height: 1.5;
  border-left: 3px solid var(--c-indigo);
}

.sp-result-val {
  font-size: 0.85rem;
  color: var(--c-amber);
  font-weight: 700;
}
```

- [ ] **Step 2: 重写 CodeDebugPanel.css — 靛蓝头、类型多彩(青/翠绿/琥珀/蓝)、调用栈红顶，引用变量**
文件: `src/components/CodeDebugPanel.css`（全文替换）

```css
/* src/components/CodeDebugPanel.css */
.code-debug-panel {
  background-color: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: var(--c-text);
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
}

/* 代码面板头 — 靛蓝渐变 */
.cdp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(90deg, var(--c-indigo), var(--c-indigo-dark));
  border-bottom: 1px solid var(--c-border);
}

.cdp-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--c-text-on-color);
}

.cdp-step-badge {
  background-color: rgba(0, 0, 0, 0.35);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  color: #E0E7FF;
}

.cdp-code-block {
  padding: 8px 0;
  background-color: var(--c-bg);
  overflow-y: auto;
  flex: 0 0 auto;
  max-height: 260px;
}

.cdp-code-line {
  display: flex;
  align-items: center;
  padding: 2px 8px;
  position: relative;
  font-size: 0.82rem;
  line-height: 1.5;
}

/* 当前行 — 翠绿左边框 + 靛底 */
.cdp-code-line.cdp-active {
  background-color: rgba(16, 185, 129, 0.16);
  border-left: 3px solid var(--c-emerald);
}

.cdp-line-no {
  display: inline-block;
  width: 26px;
  text-align: right;
  color: #475569;
  margin-right: 10px;
  user-select: none;
}

.cdp-line-text {
  color: #E2E8F0;
  white-space: pre;
}

/* 当前行文字 — 琥珀高亮 */
.cdp-active .cdp-line-text {
  color: var(--c-amber);
  font-weight: 600;
}

.cdp-marker {
  margin-left: 8px;
  color: var(--c-amber);
}

.cdp-section {
  padding: 8px 12px;
  border-top: 1px solid var(--c-surface);
}

.cdp-section-title {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  color: var(--c-text-secondary);
}

.cdp-var-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.cdp-var-cell {
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cdp-var-cell.cdp-var-highlight {
  border-color: var(--c-indigo);
  background-color: rgba(99, 102, 241, 0.18);
}

.cdp-var-name {
  font-size: 0.7rem;
  color: var(--c-text-secondary);
}

.cdp-var-value {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-text);
}

/* 变量类型色 — 多彩：node=翠绿 array=琥珀 number=青 null=灰 */
.cdp-type-node { color: var(--c-emerald); }
.cdp-type-array { color: var(--c-amber); }
.cdp-type-number { color: var(--c-cyan); }
.cdp-type-null { color: var(--c-text-muted); font-style: italic; }

.cdp-callstack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cdp-frame {
  background-color: var(--c-surface);
  border-left: 3px solid #475569;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 调用栈顶 — 红色 */
.cdp-frame-top {
  border-left-color: var(--c-pink-dark);
  background-color: rgba(236, 72, 153, 0.15);
}

.cdp-frame-fn { color: var(--c-violet); font-weight: 700; }
.cdp-frame-arg { color: var(--c-emerald); }
.cdp-frame-depth { color: var(--c-text-muted); margin-left: auto; }

.cdp-stack-base {
  text-align: center;
  font-size: 0.7rem;
  color: #475569;
  padding-top: 2px;
}
```

- [ ] **Step 3: 验证 build 通过**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 4: 提交**
Run: `git add src/components/StackPanel.css src/components/CodeDebugPanel.css && git commit -m "feat(ui): 栈面板(琥珀)与代码面板(靛蓝+多彩类型)引用CSS变量丰富配色"`

---

### Task 5: 推送 main 触发自动部署并验证线上为最新代码

**Depends on:** Task 4
**Files:** 无（git 操作 + GitHub API 验证）

- [ ] **Step 1: 推送 main 到 origin — 触发 GitHub Action 自动部署**
Run: `git push origin main`
Expected:
  - Exit code: 0
  - Output contains: "To github.com:fuck-algorithm/..." 或 "remote:"
  - Output does NOT contain: "error: failed to push" 或 "! [rejected]"

- [ ] **Step 2: 轮询 GitHub Actions run 状态 — 确认 push 触发了部署**
Run: `for i in $(seq 1 30); do sleep 10; STATUS=$(gh api repos/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal/actions/runs --jq '.workflow_runs[0] | "\(.status) \(.conclusion) \(.head_sha[0:7]) \(.event)"' 2>/dev/null); echo "[$i] $STATUS"; case "$STATUS" in completed*) break;; esac; done`
Expected:
  - Exit code: 0
  - 最终输出包含: "completed" 和 "success" 和 "push" 以及本地 main HEAD 前 7 位 sha

- [ ] **Step 3: 验证线上 js 产物已更新（与本地 build 产物一致）**
Run: `LOCAL_JS=$(ls dist/assets/index-*.js 2>/dev/null | head -1 | xargs basename) && REMOTE_JS=$(curl -s https://fuck-algorithm.github.io/leetcode-94-binary-tree-inorder-traversal/ | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1) && echo "local=$LOCAL_JS remote=$REMOTE_JS"`
Expected:
  - Exit code: 0
  - local 与 remote 的 js 文件名一致

- [ ] **Step 4: 提交 Plan 文档（如尚未入库）**
Run: `git add docs/superpowers/plans/2026-07-16-rich-flat-color.md 2>/dev/null; git commit -m "docs: 添加多色相扁平化配色丰富化实施计划" 2>/dev/null && git push origin main 2>/dev/null || echo "plan doc already committed or pushed"`
Expected:
  - Exit code: 0
