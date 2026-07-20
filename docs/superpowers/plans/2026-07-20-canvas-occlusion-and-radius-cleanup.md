# 画布元素遮挡修复 + 全站大圆角清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修复画布演示动画中元素/文字面板互相遮挡的 5 个叠加根因,并清理全站所有大圆角样式(严禁大圆角,统一 ≤3-4px,节点矩形改小圆角 r*0.12)。

**Architecture:** 树布局引擎(treeEngine.ts)输出 bounds 与 nodeRadius → 渲染器(treeRenderer.ts)按 bounds 计算 scale/translate 居中并绘制矩形节点/连线/边标签/图例。遮挡源于:pad 只按圆形 radius 而非矩形半宽、translateX 硬编码 110 偏移破坏居中、边标签贴连线中点、图例无背板压树、节点圆角过大。修复流向:engine 算准 bounds(矩形半宽 pad) → renderer 按纯居中 transform + 边标签避让 + 图例背板 + 节点小圆角 → CSS 全站大圆角统一 3px。复用现有 palette token 与 CSS 变量,不新增配色。

**Tech Stack:** React 19, Vite 6, TypeScript 5.7, d3 7.9 (d3.tree + d3.hierarchy), CSS Variables

**Risks:**
- 删除 `.size()` 后布局完全由 `.nodeSize()` 驱动,坐标相对原点,bounds 可能 minX 为负 → 缓解:bounds 计算取 min/max 后 scale 按宽高缩放回容器,translate 按 bounds 中心居中,与坐标正负无关
- 边标签避让判断间距逻辑复杂 → 缓解:同层相邻节点 x 差 < rectW*1.2 时直接 return '' 不渲染该标签
- 圆角统一 3px 可能略影响视觉 → 缓解:3px 是扁平设计标准小圆角,配合现有左边框/阴影仍清晰区分;滑块 thumb 50% 保留(非大圆角,是圆形控件)

---

### Task 1: 修复 treeEngine 布局 — bounds 纳入矩形半宽 + 删除死代码 .size()

**Depends on:** None
**Files:**
- Modify: `src/utils/tree/treeEngine.ts:52-58`（删除 .size()）、`src/utils/tree/treeEngine.ts:105`（pad 改矩形半宽）

- [ ] **Step 1: 删除 .size() 死代码 — 消除与 .nodeSize() 并存的反模式**

d3.tree 中 `.nodeSize()` 会覆盖 `.size()`,两者并存时 `.size()` 被静默忽略,是误导性死代码。删除 `.size()` 链式调用,仅保留 `.nodeSize()`。

文件: `src/utils/tree/treeEngine.ts:52-58`

```typescript
  const treeLayout = d3
    .tree<TreeNodeData>()
    .nodeSize([
      nodeRadius * (totalNodes > 15 ? 5.0 : totalNodes > 7 ? 6.5 : 8.0),
      nodeRadius * (totalNodes > 15 ? 3.2 : 3.8),
    ]);
```

- [ ] **Step 2: 修改 pad 计算为矩形半宽 — 消除节点矩形左右溢出 0.2r**

节点矩形宽度是 `rectW = r * 2.4`(半宽 `r * 1.2`),但当前 pad 用 `nodeRadius + 6`(即 `r + 6`),仅覆盖圆形半径,矩形左右各溢出 `0.2r`。改为按矩形半宽留边距。

文件: `src/utils/tree/treeEngine.ts:104-109`

```typescript
  // bounds 纳入节点矩形半宽(rectW/2 = r*1.2),使 scale 计算预留矩形边距,避免矩形溢出/遮挡
  const pad = nodeRadius * 1.2 + 6;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;
```

- [ ] **Step 3: 验证类型检查**
Run: `npx tsc --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 提交**
Run: `git add src/utils/tree/treeEngine.ts && git commit -m "fix(tree): engine bounds 纳入矩形半宽并删除死代码 .size()"`

---

### Task 2: 修复 treeRenderer 遮挡 + 节点小圆角

**Depends on:** Task 1
**Files:**
- Modify: `src/utils/tree/treeRenderer.ts:62`（translateX 纯居中）、`117-118/129-130/141-142/173-174`（rx 改小）、`191-214`（边标签避让）、`216-223`（图例背板+移位）

- [ ] **Step 1: 修改 translateX 为纯居中 — 移除 110 硬编码偏移**

当前 `translateX = effW/2 - cx*scale - (hasStackPanel ? 110 : 0)`,减 110 是为给栈面板让位的手调,但 effW 已扣除栈面板宽度(见 56 行 `hasStackPanel ? 220 : 4`),再减 110 会让树偏左而非居中于可用区。改为纯按 bounds 中心居中。

文件: `src/utils/tree/treeRenderer.ts:62`

```typescript
  const translateX = effW / 2 - cx * scale;
```

- [ ] **Step 2: 修改节点矩形 rx 为小圆角 — 严禁大圆角**

当前 `rx = r * 0.5`(r=18-26 时 rx=9-13px,过大圆角),光晕底 `r*0.55`、投影底 `r*0.5`、高光 `r*0.4`。统一改为 `r * 0.12`(约 2-3px 小圆角),符合"严禁大圆角"。

文件: `src/utils/tree/treeRenderer.ts:117-118`（光晕底）

```typescript
    .attr('rx', r * 0.12)
    .attr('ry', r * 0.12)
```

文件: `src/utils/tree/treeRenderer.ts:129-130`（投影底）

```typescript
    .attr('rx', r * 0.12)
    .attr('ry', r * 0.12)
```

文件: `src/utils/tree/treeRenderer.ts:141-142`（主体）

```typescript
    .attr('rx', r * 0.12)
    .attr('ry', r * 0.12)
```

文件: `src/utils/tree/treeRenderer.ts:173-174`（高光）

```typescript
    .attr('rx', r * 0.12)
    .attr('ry', r * 0.12)
```

- [ ] **Step 3: 修改边标签位置避开节点 + 间距不足时不渲染**

当前边标签在连线中点 `(source.x+target.x)/2, (source.y+target.y)/2 - 5`,中点接近父节点底部下方,易与父节点矩形重叠。改为靠近子节点上方(连线 70% 处),且当同层相邻节点 x 差小于 rectW*1.2 时(标签会与相邻节点重叠)直接不渲染。

文件: `src/utils/tree/treeRenderer.ts:191-214`

```typescript
  // 为边添加标签 (左/右),大树时隐藏以减少视觉混乱
  if (totalNodes <= 25) {
    g.selectAll('.edge-label')
      .data(engLinks)
      .enter()
      .append('text')
      .attr('class', 'edge-label')
      .attr('x', (d) => d.source.x + (d.target.x - d.source.x) * 0.7)
      .attr('y', (d) => d.source.y + (d.target.y - d.source.y) * 0.7 - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', Math.max(8, 8 / scale) * (totalNodes > 15 ? 0.8 : 1))
      .attr('font-weight', '600')
      .attr('fill', palette.textSecondary)
      .attr('stroke', '#0F172A')
      .attr('stroke-width', 0.4 / scale)
      .attr('paint-order', 'stroke')
      .text((d) => {
        if (!d.isLeft && !d.isRight) return '';
        // 同层相邻节点间距不足时不渲染,避免与节点矩形重叠
        const siblings = engNodes.filter((n) => n.depth === d.target.depth);
        const idx = siblings.findIndex((n) => n.id === d.target.id);
        const left = idx > 0 ? siblings[idx - 1] : null;
        const right = idx < siblings.length - 1 ? siblings[idx + 1] : null;
        const minGap = rectW * 1.2;
        if (left && Math.abs(d.target.x - left.x) < minGap) return '';
        if (right && Math.abs(right.x - d.target.x) < minGap) return '';
        if (d.isLeft) return '左';
        if (d.isRight) return '右';
        return '';
      });
  }
```

- [ ] **Step 4: 修改图例加半透明背板并移至不遮挡树的位置**

当前图例在 `translate(effectiveWidth - legendSize*9, 2)` 右上角,无背板,与树叠加遮挡。改为:加半透明深色背板 rect(覆盖图例区域)+ 圆角 2px + 边框,位置保持右上角但 z-order 高且自带背景,确保压在树上方时可读。

文件: `src/utils/tree/treeRenderer.ts:216-223`

```typescript
  // 添加图例 - 右上角,带半透明背板避免与树叠加遮挡
  const legendFontSize = Math.max(8, Math.min(10, effectiveWidth / 80));
  const legendSize = Math.max(8, Math.min(10, effectiveWidth / 70));
  const legendSpacing = legendSize * 1.5;
  const legendItemCount = totalNodes <= 25 ? 5 : 4;
  const legendBoxW = legendSize * 9;
  const legendBoxH = legendSpacing * legendItemCount + 8;

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${effectiveWidth - legendBoxW - 6}, 6)`);

  // 图例背板 — 半透明深底 + 小圆角 + 边框,确保压树时仍可读
  legend.append('rect')
    .attr('x', -4)
    .attr('y', -4)
    .attr('width', legendBoxW + 8)
    .attr('height', legendBoxH)
    .attr('rx', 3)
    .attr('ry', 3)
    .attr('fill', 'rgba(15, 23, 42, 0.82)')
    .attr('stroke', 'rgba(99, 102, 241, 0.4)')
    .attr('stroke-width', 1);
```

- [ ] **Step 5: 验证类型检查**
Run: `npx tsc --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 6: 提交**
Run: `git add src/utils/tree/treeRenderer.ts && git commit -m "fix(tree): renderer 居中+边标签避让+图例背板+节点小圆角"`

---

### Task 3: 清理主样式 CSS 大圆角 — index.css + BinaryTreeInorderTraversal.css

**Depends on:** None
**Files:**
- Modify: `src/index.css:59`、`src/components/BinaryTreeInorderTraversal.css`（多处）

- [ ] **Step 1: 修改 index.css button 圆角 6px→3px**

文件: `src/index.css:59`

```css
button {
  border-radius: 3px;
```

- [ ] **Step 2: 修改 BinaryTreeInorderTraversal.css 所有 >3px 圆角统一 3px**

涉及行(保留滑块 thumb 50%):`.back-link` 4px→3px(L35)、`.problem-description` 6px→3px(L63)、`.algorithm-section` 6px→3px(L93)、`.speed-slider` 3px(保持,L149)、`.manual-controls` 6px→3px(L212)、`.step-progress-bar` 4px→3px(L256)、`.step-buttons button` 6px→3px(L307)、`.shortcut-hint` 3px(保持,L361)、`.error-message` 4px→3px(L384)、`.warning-message` 4px→3px(L394)、`.tree-section` 10px→3px(L427)、`.stack-section` 10px→3px(L447)。

逐一替换 `border-radius: <旧值>` → `border-radius: 3px`(仅 >3px 的)。

- [ ] **Step 3: 验证构建**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 4: 提交**
Run: `git add src/index.css src/components/BinaryTreeInorderTraversal.css && git commit -m "style(ui): 主样式大圆角统一 3px"`

---

### Task 4: 清理组件 CSS 大圆角 — 5 个组件文件

**Depends on:** None
**Files:**
- Modify: `src/components/TreeInputExamples.css`、`src/components/StackPanel.css`、`src/components/CodeDebugPanel.css`、`src/components/VisualizationBottomControls.css`、`src/components/TreeVisualization/styles.css`

- [ ] **Step 1: 修改 TreeInputExamples.css 大圆角 → 3px**

`.tree-input-panel` 8px→3px(L4)、`.tree-input-container input` 6px→3px(L48)、`.build-button` 6px→3px(L71)、`.example-button` 16px→3px(L107)、`.random-button` 16px→3px(L126)。

- [ ] **Step 2: 修改 StackPanel.css 大圆角 → 3px**

`.stack-panel` 10px→3px(L5)、`.sp-action-badge` 12px→3px(L32)、`.sp-phase-row/.sp-current-row/.sp-result-row` 6px→3px(L45)、`.sp-stack-item` 4px→3px(L86,保持小)、`.sp-top-tag` 8px→3px(L109)、`.sp-empty` 6px→3px(L118)、`.sp-current-val` 8px→3px(L127)、`.sp-desc` 6px→3px(L137)。

- [ ] **Step 3: 修改 CodeDebugPanel.css 大圆角 → 3px**

`.code-debug-panel` 10px→3px(L5)、`.cdp-step-badge` 10px→3px(L33)、`.cdp-var-cell` 6px→3px(L108)、`.cdp-frame` 4px(保持小,L147)。

- [ ] **Step 4: 修改 VisualizationBottomControls.css 圆角 4px→3px(保留 50% thumb)**

`.step-progress-bar` 4px→3px(L34)。`::-webkit-slider-thumb`/`::-moz-range-thumb` 50% 保留。

- [ ] **Step 5: 修改 TreeVisualization/styles.css 圆角 8px→3px**

`.tree-visualization-container` 8px→3px(L10)。同时该文件 L9 `background-color: #0F172A` 硬编码与 `--c-bg`(#0B1220)不一致,顺手改 `var(--c-bg)` 统一。

- [ ] **Step 6: 验证构建**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"

- [ ] **Step 7: 提交**
Run: `git add src/components/TreeInputExamples.css src/components/StackPanel.css src/components/CodeDebugPanel.css src/components/VisualizationBottomControls.css src/components/TreeVisualization/styles.css && git commit -m "style(ui): 组件大圆角统一 3px + 树容器底色走变量"`

---

### Task 5: 构建验证并 push main 触发自动部署

**Depends on:** Task 1, Task 2, Task 3, Task 4
**Files:** None

- [ ] **Step 1: 完整构建验证**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"
  - Output does NOT contain: "error" or "ERROR"

- [ ] **Step 2: push 到 main 触发 GitHub Pages 部署**
Run: `git push origin main`
Expected:
  - Exit code: 0
  - Output contains: "main -> main"

- [ ] **Step 3: 验证 GitHub Actions 部署 workflow 触发**
Run: `gh api repos/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal/actions/runs --jq '.workflow_runs[0] | {status, conclusion, head_sha}'`
Expected:
  - status 为 "queued" 或 "in_progress" 或 "completed"
  - head_sha 为最新 push 的 commit sha

- [ ] **Step 4: 等待部署完成后验证线上 js hash 更新**
Run: `curl -s https://fuck-algorithm.github.io/leetcode-94-binary-tree-inorder-traversal/ | grep -o 'index-[^"]*\.js'`
Expected:
  - 输出新的 js hash(与之前 `index-C9y-4rmH.js` 不同)
