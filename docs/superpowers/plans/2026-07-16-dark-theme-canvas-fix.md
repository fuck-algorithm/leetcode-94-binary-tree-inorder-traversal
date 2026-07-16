# 深色扁平化配色统一 + 画布坐标修复 + 树引擎美化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修复线上页面四类视觉问题：(1) 配色错乱——主样式仍是浅色主题与深色背景割裂；(2) 画布元素遮挡——布局 bounds 未含节点半径导致 scale 溢出；(3) 树绘制粗糙——节点/连线/阴影视觉简陋；(4) 黑底黑字——图例 text 无 fill 属性 + 旧 CSS 残留浅色文字色。整体统一为深色 + 扁平化配色。

**Architecture:** 数据流：`src/theme/colors.ts` 的 `palette` 是唯一配色源 → 各 CSS 文件改为引用语义化 token 值（深色 surface + 浅色 text）→ `treeEngine.ts` 的 bounds 计算纳入 nodeRadius（`minX -= r` 等）使 scale 预留节点边距 → `treeRenderer.ts` 删除冗余旧 d3.tree 布局（第 37-103 行，结果已被 engineLayout 覆盖）+ 美化节点视觉（更柔和的圆角矩形、扁平整边、subtle 阴影）+ 边标签/图例全部改用 palette token 并为图例 text 补 `fill: palette.textSecondary`。关键组件：`BinaryTreeInorderTraversal.css`（主样式，浅色→深色）、`treeEngine.ts`（bounds 修正）、`treeRenderer.ts`（删冗余 + 美化 + token 化）。设计理由：配色统一收敛到 palette，杜绝组件内硬编码 hex；bounds 含 radius 是消除遮挡的根本修复，而非靠手调偏移量。

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, d3 7.9, CSS3（语义化 token、`var()` 占位由硬编码值替代），SVG 渐变 + drop-shadow

**Risks:**
- Task 2 删除孤立的 `BinaryTreeInorderTraversal/styles.css`（class 名 `.binary-tree-traversal` 与实际组件 `.binary-tree-inorder-traversal` 对不上，从未被 import）→ 缓解：已确认无 import 引用，删除安全
- Task 3 删 treeRenderer.ts 第 37-103 行冗余旧布局后，`d3.tree`/`treeLayout`/`optimizeTreeLayout`/`adjustLeftRightBalance`/`shiftSubtree`/`calculateNodeSize`/`treeWidth`/`treeHeight` 等 import 与变量可能变未使用 → noUnusedLocals 报错，须同步删除对应 import 与局部变量
- Task 4 改 bounds 含 radius 后 scale 会略缩小（boundsWidth/Height 变大），节点视觉变小但仍完整可见、不再遮挡，属预期行为
- CSS 改深色后，按钮/输入框 hover/focus 阴影需重新校色，避免深色背景上看不出反馈 → 缓解：用 palette.borderActive + 半透明发光

---

### Task 1: 统一全局 CSS 为深色扁平化配色

**Depends on:** None
**Files:**
- Modify: `src/index.css:33-54`
- Modify: `src/components/BinaryTreeInorderTraversal.css`（全文）
- Modify: `src/components/TreeInputExamples.css`（全文）
- Modify: `src/components/VisualizationBottomControls.css`（全文）

- [ ] **Step 1: 重写 index.css 的 button 全局样式 — 改为深色扁平按钮**
文件: `src/index.css:33-54`

```css
button {
  border-radius: 6px;
  border: 1px solid #334155;
  padding: 0.5em 1em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1E293B;
  color: #F8FAFC;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
}

button:hover {
  background-color: #334155;
  border-color: #4F46E5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.25);
}

button:focus,
button:focus-visible {
  outline: 2px solid #4F46E5;
  outline-offset: 2px;
}
```

- [ ] **Step 2: 重写 BinaryTreeInorderTraversal.css — 主样式整体深色扁平化**
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
  background-color: #0F172A;
  color: #F8FAFC;
}

.title-container {
  display: flex;
  align-items: center;
  position: relative;
  padding: 0 10px;
  margin-top: 5px;
}

.back-link {
  position: absolute;
  left: 10px;
  color: #818CF8;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(79, 70, 229, 0.15);
  border-left: 3px solid #4F46E5;
  display: flex;
  align-items: center;
  z-index: 10;
}

.back-link:hover {
  color: #C7D2FE;
  background-color: rgba(79, 70, 229, 0.28);
  transform: translateX(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

h1 {
  color: #F8FAFC;
  text-align: center;
  margin: 0 0 1px 0;
  font-size: 1.1rem;
  padding: 2px 0;
  width: 100%;
}

.problem-description {
  background-color: #1E293B;
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: 5px;
  border-left: 3px solid #4F46E5;
  font-size: 0.75rem;
  color: #94A3B8;
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

.algorithm-section {
  display: flex;
  align-items: center;
  height: 32px;
  margin: 0;
  padding: 0;
  background-color: #1E293B;
  border: 1px solid #334155;
  border-radius: 6px;
  width: 100%;
}

.method-selection {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0 10px;
  border-right: 1px solid #334155;
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
  accent-color: #4F46E5;
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
  background: linear-gradient(to right, #4F46E5 var(--fill-percent), #334155 var(--fill-percent));
  direction: rtl;
}

.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #818CF8;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.speed-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #818CF8;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.speed-slider:hover::-webkit-slider-thumb {
  transform: scale(1.2);
  box-shadow: 0 0 8px rgba(129, 140, 248, 0.6);
}

.speed-slider:hover::-moz-range-thumb {
  transform: scale(1.2);
  box-shadow: 0 0 8px rgba(129, 140, 248, 0.6);
}

.speed-value {
  width: 60px;
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 8px;
  font-size: 0.8rem;
  color: #94A3B8;
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
  background-color: #1E293B;
  border: 1px solid #334155;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.step-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #94A3B8;
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
  color: #64748B;
  min-width: 20px;
  text-align: center;
}

.step-progress-bar {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 6px;
  background: linear-gradient(to right,
    #4F46E5 calc((var(--value) - var(--min)) / (var(--max) - var(--min)) * 100%),
    #334155 calc((var(--value) - var(--min)) / (var(--max) - var(--min)) * 100%)
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
  background: #818CF8;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.step-progress-bar::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #818CF8;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.step-progress-bar:hover::-webkit-slider-thumb {
  transform: scale(1.1);
  box-shadow: 0 0 6px rgba(129, 140, 248, 0.6);
}

.step-progress-bar:hover::-moz-range-thumb {
  transform: scale(1.1);
  box-shadow: 0 0 6px rgba(129, 140, 248, 0.6);
}

.step-buttons {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 2px;
}

.step-buttons button {
  padding: 4px 8px;
  background-color: #1E293B;
  color: #F8FAFC;
  border: 1px solid #334155;
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
  background-color: #334155;
  border-color: #4F46E5;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.step-buttons button:active {
  transform: translateY(0);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

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
  background-color: #0F172A;
  color: #475569;
  border-color: #1E293B;
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
  border-left: 3px solid #EF4444;
}

.warning-message {
  color: #FCD34D;
  background-color: rgba(245, 158, 11, 0.12);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 10px;
  font-size: 0.9rem;
  border-left: 3px solid #F59E0B;
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

.tree-section {
  flex: 3;
  background-color: #0F172A;
  border: 1px solid #334155;
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
  background-color: #0F172A;
  border: 1px solid #334155;
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

/* 放大进度条，简化指示器 */
#progressBarContainer {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
}

/* 响应式调整 */
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

- [ ] **Step 3: 重写 TreeInputExamples.css — 输入区与按钮深色扁平化**
文件: `src/components/TreeInputExamples.css`（全文替换）

```css
.tree-input-panel {
  background-color: #1E293B;
  border-radius: 8px;
  padding: 8px 15px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-left: 4px solid #4F46E5;
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
  border: 1px solid #334155;
  background-color: #0F172A;
  color: #F8FAFC;
  border-radius: 6px;
  font-size: 0.85rem;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
  transition: all 0.2s;
  min-width: 120px;
}

.tree-input-container input::placeholder {
  color: #64748B;
}

.tree-input-container input:focus {
  outline: none;
  border-color: #4F46E5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.3);
}

.build-button {
  background-color: #4F46E5;
  color: #FFFFFF;
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
  background-color: #3730A3;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.4);
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

.example-button {
  background-color: rgba(79, 70, 229, 0.15);
  color: #C7D2FE;
  border: 1px solid #4F46E5;
  padding: 4px 8px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
  font-weight: 500;
  white-space: nowrap;
}

.example-button:hover {
  background-color: rgba(79, 70, 229, 0.3);
  transform: translateY(-1px);
}

.random-button {
  background-color: #10B981;
  color: #0F172A;
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
  background-color: #059669;
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

- [ ] **Step 4: 重写 VisualizationBottomControls.css — 底部控制区深色扁平化**
文件: `src/components/VisualizationBottomControls.css`（全文替换）

```css
.visualization-bottom-controls {
  width: 100%;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 10px;
  background-color: #0F172A;
  border-top: 1px solid #334155;
}

#progressBarContainer {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-step {
  font-size: 12px;
  color: #94A3B8;
  min-width: 25px;
  text-align: center;
}

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
  background: #818CF8;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  z-index: 2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.step-progress-bar::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #818CF8;
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
  background: linear-gradient(to right, #4F46E5 var(--fill-percent), #334155 0);
}
```

- [ ] **Step 5: 验证 build 通过**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 6: 提交**
Run: `git add src/index.css src/components/BinaryTreeInorderTraversal.css src/components/TreeInputExamples.css src/components/VisualizationBottomControls.css && git commit -m "feat(ui): 统一全局CSS为深色扁平化配色"`

---

### Task 2: 清理 TreeVisualization 浅色残留 + 删除孤立过时样式文件

**Depends on:** Task 1
**Files:**
- Modify: `src/components/TreeVisualization/styles.css`（第 19-79 行浅色规则）
- Delete: `src/components/BinaryTreeInorderTraversal/styles.css`

- [ ] **Step 1: 重写 TreeVisualization/styles.css — 清理浅色残留与无效 class**
文件: `src/components/TreeVisualization/styles.css`（全文替换）

```css
.tree-visualization-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  background-color: #0F172A;
  border-radius: 8px;
}

.tree-visualization-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* 节点动画（drop-shadow 由 renderer 的 filter 内联设置，此处仅保留过渡） */
.node circle,
.node rect,
.tree-link {
  transition: all 0.3s ease;
}

.node.visited circle,
.node.visited rect {
  filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.5));
}

.node.current circle,
.node.current rect {
  filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.6));
  animation: node-pulse 1.4s ease-in-out infinite;
}

.node.stack circle,
.node.stack rect {
  filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.5));
}

@keyframes node-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .tree-visualization-container {
    height: 50vh;
    min-height: 300px;
  }
}
```

- [ ] **Step 2: 删除孤立过时的 BinaryTreeInorderTraversal/styles.css**
Run: `git rm src/components/BinaryTreeInorderTraversal/styles.css`
Expected:
  - Exit code: 0
  - Output contains: "rm" 或 "removed"

（该文件 class 名 `.binary-tree-traversal`/`.traversal-title` 与实际组件 `.binary-tree-inorder-traversal` 对不上，从未被任何文件 import，是误导性孤立文件。）

- [ ] **Step 3: 验证无残留 import 引用被删除文件**
Run: `grep -rn "BinaryTreeInorderTraversal/styles" src/ || echo "NO_REFERENCES"`
Expected:
  - Exit code: 0
  - Output contains: "NO_REFERENCES"

- [ ] **Step 4: 验证 build 通过**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 5: 提交**
Run: `git add -A src/components/TreeVisualization/styles.css && git commit -m "refactor(ui): 清理TreeVisualization浅色残留CSS并删除孤立过时样式文件"`

---

### Task 3: 修复 treeEngine bounds 计算纳入节点半径 + 删除 treeRenderer 冗余旧布局逻辑

**Depends on:** Task 2
**Files:**
- Modify: `src/utils/tree/treeEngine.ts:93-107`
- Modify: `src/utils/tree/treeRenderer.ts:1-143`（删第 5-7、24-103 行冗余布局 + 调整 scale 计算）

- [ ] **Step 1: 修改 treeEngine.ts — bounds 计算纳入 nodeRadius，预留节点边距**
文件: `src/utils/tree/treeEngine.ts:93-107`（替换 bounds 计算块）

```typescript
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  });

  // bounds 纳入节点半径，使 scale 计算预留节点边距，避免节点溢出/遮挡
  const pad = nodeRadius + 6;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;

  return {
    nodes,
    links,
    bounds: { minX, maxX, minY, maxY },
    nodeRadius,
  };
}
```

- [ ] **Step 2: 修改 treeRenderer.ts — 删除冗余旧布局逻辑与未用 import，并调整 scale 计算**
文件: `src/utils/tree/treeRenderer.ts:1-143`（替换 import + 删除第 24-103 行旧布局，保留 engineLayout 路径，调整第 129-139 行 scale/translate）

```typescript
import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { TreeDimensions, TreeRenderOptions, LegendItem } from './treeTypes';
import { countNodes } from './treeAnalysis';
import { layoutTree, EngineLayout } from './treeEngine';
import { palette, nodeStrokeColor } from '../../theme/colors';

/**
 * 渲染二叉树
 */
export const renderTree = (
  svgElement: SVGSVGElement,
  data: TreeNodeData,
  dimensions: TreeDimensions,
  options: TreeRenderOptions
): void => {
  const { highlightedNodeId, visitedNodeIds = [], stackNodeIds = [], hasStackPanel = false } = options;

  // 清除之前的内容
  d3.select(svgElement).selectAll('*').remove();

  const svg = d3.select(svgElement);
  const totalNodes = countNodes(data);

  // 计算有效宽度，考虑栈面板，更大化利用空间
  const stackPanelWidth = hasStackPanel ? 220 : 0;
  const effectiveWidth = (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? stackPanelWidth : 0);
  const effectiveHeight = dimensions.effectiveHeight || dimensions.height;

  // 使用绘制引擎获取结构化布局（bounds 已含节点半径边距）
  const engineLayout: EngineLayout = layoutTree(data, dimensions, hasStackPanel);
  const { nodes: engNodes, links: engLinks, nodeRadius: r } = engineLayout;

  // defs：渐变定义
  const defs = svg.append('defs');
  const gradDefs = [
    { id: 'grad-default', from: '#64748B', to: '#475569' },
    { id: 'grad-current', from: '#EF4444', to: '#B91C1C' },
    { id: 'grad-visited', from: '#10B981', to: '#047857' },
    { id: 'grad-stack', from: '#F59E0B', to: '#B45309' },
  ];
  gradDefs.forEach((g) => {
    const grad = defs
      .append('linearGradient')
      .attr('id', g.id)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', g.from);
    grad.append('stop').attr('offset', '100%').attr('stop-color', g.to);
  });

  // 适配缩放与平移（基于引擎 bounds，bounds 已含节点半径边距，配合留白不再溢出）
  const boundsWidth = engineLayout.bounds.maxX - engineLayout.bounds.minX;
  const boundsHeight = engineLayout.bounds.maxY - engineLayout.bounds.minY;
  const effW =
    (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? 220 : 4);
  const effH = (dimensions.effectiveHeight || dimensions.height) - 4;
  const scale = Math.min(effW / boundsWidth, effH / boundsHeight) * 0.96 || 1;
  const cx = (engineLayout.bounds.minX + engineLayout.bounds.maxX) / 2;
  const cy = (engineLayout.bounds.minY + engineLayout.bounds.maxY) / 2;
  const translateX = effW / 2 - cx * scale - (hasStackPanel ? 110 : 0);
  const translateY = effH / 2 - cy * scale;

  const g = svg
    .append('g')
    .attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);

```

（注：第 145 行起的连线、节点、文本、边标签、图例绘制逻辑保留，在 Task 4 美化。）

- [ ] **Step 3: 验证 TypeScript 编译通过（无 noUnusedLocals 报错）**
Run: `npx tsc --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "is declared but its value is never read"
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 验证 build 通过**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 5: 提交**
Run: `git add src/utils/tree/treeEngine.ts src/utils/tree/treeRenderer.ts && git commit -m "fix(tree): bounds纳入节点半径消除遮挡并删除treeRenderer冗余旧布局逻辑"`

---

### Task 4: 美化 treeRenderer 树绘制 — 节点视觉 + 边标签/图例配色 token 化

**Depends on:** Task 3
**Files:**
- Modify: `src/utils/tree/treeRenderer.ts:145-338`（连线、节点、文本、边标签、图例）

- [ ] **Step 1: 美化节点与连线视觉 — 更柔和的圆角、扁平描边、subtle 阴影、光晕高亮**
文件: `src/utils/tree/treeRenderer.ts:145-236`（替换连线 + 节点绘制块）

```typescript
  // 贝塞尔连线，左右子树分别用配色 token，扁平描边
  g.selectAll('.link')
    .data(engLinks)
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', (d) =>
      d.isLeft ? palette.linkLeft : d.isRight ? palette.linkRight : palette.linkDefault,
    )
    .attr('stroke-width', Math.max(1.5, 2.2 / scale))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.85)
    .attr('d', (d) => {
      const sx = d.source.x;
      const sy = d.source.y + r;
      const tx = d.target.x;
      const ty = d.target.y - r;
      const midY = (sy + ty) / 2;
      return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
    });

  // 节点组：圆角矩形 + 柔和阴影 + 光晕高亮底
  const nodeGroups = g
    .selectAll('.node')
    .data(engNodes)
    .enter()
    .append('g')
    .attr('class', (d) => {
      let cls = 'node';
      if (visitedNodeIds && visitedNodeIds.includes(d.id)) cls += ' visited';
      if (highlightedNodeId === d.id) cls += ' current';
      if (stackNodeIds && stackNodeIds.includes(d.id)) cls += ' stack';
      return cls;
    })
    .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

  const rectW = r * 2.4;
  const rectH = r * 2;

  // 当前节点光晕底（仅 current 节点渲染，提升焦点感）
  nodeGroups
    .filter((d) => highlightedNodeId === d.id)
    .append('rect')
    .attr('x', -rectW / 2 - 4)
    .attr('y', -rectH / 2 - 4)
    .attr('width', rectW + 8)
    .attr('height', rectH + 8)
    .attr('rx', r * 0.55)
    .attr('ry', r * 0.55)
    .attr('fill', 'rgba(239, 68, 68, 0.18)')
    .attr('filter', 'blur(3px)');

  // 柔和投影底
  nodeGroups
    .append('rect')
    .attr('x', -rectW / 2 + 1)
    .attr('y', -rectH / 2 + 2)
    .attr('width', rectW)
    .attr('height', rectH)
    .attr('rx', r * 0.5)
    .attr('ry', r * 0.5)
    .attr('fill', 'rgba(0,0,0,0.35)')
    .attr('filter', 'blur(1.5px)');

  // 节点主体：圆角矩形 + 渐变填充 + 扁平描边
  nodeGroups
    .append('rect')
    .attr('x', -rectW / 2)
    .attr('y', -rectH / 2)
    .attr('width', rectW)
    .attr('height', rectH)
    .attr('rx', r * 0.5)
    .attr('ry', r * 0.5)
    .attr('fill', (d) => {
      const isCur = highlightedNodeId === d.id;
      const isVis = !!(visitedNodeIds && visitedNodeIds.includes(d.id));
      const isStk = !!(stackNodeIds && stackNodeIds.includes(d.id));
      if (isCur) return 'url(#grad-current)';
      if (isVis) return 'url(#grad-visited)';
      if (isStk) return 'url(#grad-stack)';
      return 'url(#grad-default)';
    })
    .attr('stroke', (d) =>
      nodeStrokeColor(
        highlightedNodeId === d.id,
        !!(visitedNodeIds && visitedNodeIds.includes(d.id)),
        !!(stackNodeIds && stackNodeIds.includes(d.id)),
      ),
    )
    .attr('stroke-width', (d) =>
      highlightedNodeId === d.id
        ? Math.max(2.5, 3 / scale)
        : Math.max(1.2, 1.8 / scale),
    )
    .attr('stroke-opacity', 0.9);

  // 节点顶部高光（增加立体感，扁平风 subtle）
  nodeGroups
    .append('rect')
    .attr('x', -rectW / 2 + 2)
    .attr('y', -rectH / 2 + 2)
    .attr('width', rectW - 4)
    .attr('height', rectH * 0.35)
    .attr('rx', r * 0.4)
    .attr('ry', r * 0.4)
    .attr('fill', 'rgba(255,255,255,0.12)')
    .attr('pointer-events', 'none');

  // 节点文本
  const fontSize = Math.max(11, Math.min(15, 15 / scale));
  nodeGroups
    .append('text')
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('font-size', fontSize)
    .attr('font-weight', '700')
    .attr('fill', palette.textOnColor)
    .attr('pointer-events', 'none')
    .text((d) => (d.val !== null ? d.val : 'null'));
```

- [ ] **Step 2: 边标签配色 token 化 — 左/右标签用 palette.linkLeft/linkRight**
文件: `src/utils/tree/treeRenderer.ts:238-267`（替换边标签块）

```typescript
  // 为边添加标签 (左/右)，大树时隐藏以减少视觉混乱
  if (totalNodes <= 25) {
    g.selectAll('.edge-label')
      .data(engLinks)
      .enter()
      .append('text')
      .attr('class', 'edge-label')
      .attr('x', (d) => (d.source.x + d.target.x) / 2)
      .attr('y', (d) => (d.source.y + d.target.y) / 2 - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', Math.max(8, 8 / scale) * (totalNodes > 15 ? 0.8 : 1))
      .attr('font-weight', '600')
      .attr('fill', palette.textSecondary)
      .attr('stroke', '#0F172A')
      .attr('stroke-width', 0.4 / scale)
      .attr('paint-order', 'stroke')
      .text((d) => {
        if (d.isLeft) {
          return '左';
        } else if (d.isRight) {
          return '右';
        }
        return '';
      });
  }
```

- [ ] **Step 3: 图例配色 token 化 + 补 fill 属性 — 修复黑底黑字**
文件: `src/utils/tree/treeRenderer.ts:269-337`（替换图例块）

```typescript
  // 添加图例 - 移到右上角
  const legendFontSize = Math.max(8, Math.min(10, effectiveWidth / 80));
  const legendSize = Math.max(8, Math.min(10, effectiveWidth / 70));
  const legendSpacing = legendSize * 1.5;

  // 图例底板，避免文字与树重叠
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${effectiveWidth - legendSize * 9}, 2)`);

  // 图例项 — 全部改用 palette token
  const legendItems: LegendItem[] = [
    { color: palette.nodeDefault, text: '未访问' },
    { color: palette.nodeCurrent, text: '正在访问' },
    { color: palette.nodeVisited, text: '已访问' },
    { color: palette.nodeInStack, text: '在栈中' },
  ];

  // 当节点数量较少时才显示左右子树图例
  if (totalNodes <= 25) {
    legendItems.push({ color: palette.linkDefault, textLeft: '左', textRight: '右', text: '左/右子树' });
  }

  // 绘制图例
  legendItems.forEach((item, i) => {
    const legendItem = legend.append('g')
      .attr('transform', `translate(0, ${i * legendSpacing})`);

    if (item.textLeft && item.textRight) {
      // 为左右子树添加组合图例
      legendItem.append('line')
        .attr('x1', 0)
        .attr('y1', legendSize / 2)
        .attr('x2', legendSize)
        .attr('y2', legendSize / 2)
        .attr('stroke', item.color)
        .attr('stroke-width', 1.5);

      // 添加左右标识文字 — 补 fill
      legendItem.append('text')
        .attr('x', legendSize / 4)
        .attr('y', legendSize / 2 - 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${legendFontSize * 0.8}px`)
        .attr('font-weight', '700')
        .attr('fill', palette.linkLeft)
        .text(item.textLeft);

      legendItem.append('text')
        .attr('x', legendSize * 3 / 4)
        .attr('y', legendSize / 2 - 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${legendFontSize * 0.8}px`)
        .attr('font-weight', '700')
        .attr('fill', palette.linkRight)
        .text(item.textRight);

      // 左/右子树说明文字 — 补 fill（之前缺失导致黑底黑字）
      legendItem.append('text')
        .attr('x', legendSize + 5)
        .attr('y', legendSize / 2)
        .attr('dominant-baseline', 'central')
        .attr('font-size', `${legendFontSize}px`)
        .attr('fill', palette.textSecondary)
        .text(item.text);
    } else {
      legendItem.append('rect')
        .attr('width', legendSize)
        .attr('height', legendSize)
        .attr('fill', item.color)
        .attr('rx', 2)
        .attr('ry', 2);

      legendItem.append('text')
        .attr('x', legendSize + 5)
        .attr('y', legendSize / 2)
        .attr('dominant-baseline', 'central')
        .attr('font-size', `${legendFontSize}px`)
        .attr('fill', palette.textSecondary)
        .text(item.text);
    }
  });
};
```

- [ ] **Step 4: 验证 TypeScript 编译通过**
Run: `npx tsc --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 5: 验证 build 通过**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 6: 提交**
Run: `git add src/utils/tree/treeRenderer.ts && git commit -m "feat(tree): 美化树绘制引擎节点视觉并将边标签图例配色token化修复黑底黑字"`

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
Run: `LOCAL_JS=$(ls dist/assets/index-*.js 2>/dev/null | head -1 | xargs basename) && REMOTE_JS=$(curl -s https://fuck-algorithm.github.io/leetcode-94-binary-tree-inorder-traversal/ | grep -o 'index-[A-Za-z0-9]*\.js' | head -1) && echo "local=$LOCAL_JS remote=$REMOTE_JS"`
Expected:
  - Exit code: 0
  - local 与 remote 的 js 文件名一致（证明线上已部署最新代码）

- [ ] **Step 4: 提交 Plan 文档（如尚未入库）**
Run: `git add docs/superpowers/plans/2026-07-16-dark-theme-canvas-fix.md 2>/dev/null; git commit -m "docs: 添加深色扁平化配色与画布修复实施计划" 2>/dev/null && git push origin main 2>/dev/null || echo "plan doc already committed or pushed"`
Expected:
  - Exit code: 0
