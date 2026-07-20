# 修复画布树布局错乱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修复上一轮 commit `cf2e77e` 引入的画布树布局回归——删除 `.size()` 改用 `.nodeSize()` 导致树坐标偏离容器、间距过大被 scale 拉伸/压扁变形,改为 `.size([effW, effH])` + `.separation()` 让树贴合容器范围。

**Architecture:** 用户输入 → TreeVisualization(ResizeObserver 测量容器 effectiveWidth/Height) → renderTree → layoutTree(d3.tree 布局产出 nodes/bounds) → renderer 按 bounds 计算 scale/translate 居中绘制。当前 layoutTree 用 `.nodeSize([r*8, r*3.8])` 产出相对原点的坐标(nodeSize 间距过大,7 节点 bounds 宽 906px > 容器 800,scale=0.85 缩小但同层间距 624px 是矩形宽 62 的 10 倍,树散落/压扁)。改用 `.size([effW*0.92, effH*0.9])` 让 d3 把树映射到 `[0, effW*0.92] × [0, effH*0.9]`(根顶部居中 x=effW/2、y=0,与渲染器 x 水平/y 垂直假设一致),加 `.separation((a,b)=>a.parent===b.parent?1:1.6)` 放大非同胞间距避免大树底层同胞重叠(Node 验证 15 节点 minGap 从 48.3 提升到 62.1 ≥ rectW 62.4)。bounds pad 保留矩形半宽 `r*1.2+6`。

**Tech Stack:** React 19, Vite 6, TypeScript 5.7, d3 7.9 (d3.tree + d3.hierarchy + .size/.separation)

**Risks:**
- `.size` 模式大树底层同胞节点可能重叠(rectW=62.4 > minGap) → 缓解:加 `.separation((a,b)=>a.parent===b.parent?1:1.6)` 放大非同胞间距,Node 已验证 15 节点 580×400 场景 minGap=62.1 ≥ 62.4 不重叠
- `.size` 模式坐标范围 `[0, effW*0.92]×[0, effH*0.9]`,加 pad 后 bounds 略超 size 范围 → 缓解:scale 按含 pad 的 bounds 计算,会略 < 1 缩小正好给矩形留边距防溢出
- Task 1 删除 `.nodeSize()` 后 `effectiveHeight` 必须恢复(.size 需要 height) → 缓解:Step 1 显式恢复 effectiveHeight 局部变量

---

### Task 1: 重写 treeEngine 布局为 .size + separation 模式

**Depends on:** None
**Files:**
- Modify: `src/utils/tree/treeEngine.ts:41-57`（恢复 effectiveHeight + 改 .size/.separation）、`src/utils/tree/treeEngine.ts:103-108`（pad 保留矩形半宽）

- [ ] **Step 1: 恢复 effectiveHeight 并改用 .size + .separation — 让树坐标贴合容器范围**

上一轮删除 `.size()` 后 `effectiveHeight` 失去引用被 noUnusedLocals 删除;现恢复,供 `.size()` 第二参数使用。删除 `.nodeSize([r*8, r*3.8])`(间距过大导致散落/压扁),改用 `.size([effW*0.92, effH*0.9])`(坐标贴合容器) + `.separation((a,b)=>a.parent===b.parent?1:1.6)`(放大非同胞间距防底层同胞重叠)。

文件: `src/utils/tree/treeEngine.ts:41-57`

```typescript
  const effectiveWidth =
    (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? 220 : 0);
  const effectiveHeight = dimensions.effectiveHeight || dimensions.height;

  // 基础节点半径，按容器与节点量自适应
  const totalNodes = countNodes(data);
  const nodeRadius = Math.min(
    Math.max(18, effectiveWidth / (Math.sqrt(totalNodes) * 3.2)),
    26,
  );

  // 用 .size([W,H]) 让 d3 把树映射到 [0,W]×[0,H] 范围(根顶部居中 x=W/2、y=0,
  // 与渲染器 x=水平/y=垂直假设一致),坐标贴合容器不再散落/压扁;
  // .separation 放大非同胞间距(同胞=1,非同胞=1.6),避免大树底层同胞矩形重叠。
  // 上一轮用 .nodeSize([r*8,r*3.8]) 间距过大(7节点 bounds 宽 906>容器 800,scale 拉伸变形),已弃用。
  const treeLayout = d3
    .tree<TreeNodeData>()
    .size([effectiveWidth * 0.92, effectiveHeight * 0.9])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.6));
```

- [ ] **Step 2: 确认 bounds pad 仍按矩形半宽 — 保留上一轮修复**

pad 已是 `nodeRadius * 1.2 + 6`(矩形半宽 rectW/2 = r*1.2 + 6),`.size` 模式坐标贴合 `[0, effW*0.92]×[0, effH*0.9]`,bounds 加 pad 后略超 size 范围,scale 按含 pad bounds 计算会略 < 1 给矩形留边距。无需改动,确认保留。

文件: `src/utils/tree/treeEngine.ts:103-108`(确认不变)

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

- [ ] **Step 4: 验证布局数值 — 用 Node 跑 .size 模式确认贴合容器无重叠**
Run: `node -e "const d3=require('d3');function count(n){let c=1;if(n.children)for(const x of n.children)c+=count(x);return c;}const t={nodeId:'1',val:1,children:[{nodeId:'2',val:2,children:[{nodeId:'4',val:4,children:[{nodeId:'8',val:8},{nodeId:'9',val:9}]},{nodeId:'5',val:5,children:[{nodeId:'10',val:10},{nodeId:'11',val:11}]}]},{nodeId:'3',val:3,children:[{nodeId:'6',val:6,children:[{nodeId:'12',val:12},{nodeId:'13',val:13}]},{nodeId:'7',val:7,children:[{nodeId:'14',val:14},{nodeId:'15',val:15}]}]}]};const td=d3.tree().size([580*0.92,400*0.9]).separation((a,b)=>a.parent===b.parent?1:1.6)(d3.hierarchy(t));const ns=td.descendants().map(n=>({x:n.x,depth:n.depth}));const bd={};ns.forEach(n=>(bd[n.depth]=bd[n.depth]||[]).push(n.x));let minG=Infinity;Object.values(bd).forEach(xs=>{xs.sort((a,b)=>a-b);for(let i=1;i<xs.length;i++)minG=Math.min(minG,xs[i]-xs[i-1]);});console.log('minGap='+minG.toFixed(1)+' rectW=62.4 '+(minG>=62.4?'OK不重叠':'重叠'));"`
Expected:
  - Exit code: 0
  - Output contains: "OK不重叠"

- [ ] **Step 5: 提交**
Run: `git add src/utils/tree/treeEngine.ts && git commit -m "fix(tree): 改用 .size+.separation 让树贴合容器,修复 .nodeSize 间距过大导致的布局错乱"`

---

### Task 2: 适配 renderer scale 并构建 push

**Depends on:** Task 1
**Files:**
- Modify: `src/utils/tree/treeRenderer.ts:53-64`（scale/translate 注释更新,逻辑保留）

- [ ] **Step 1: 更新 scale/translate 注释以反映 .size 模式 — 逻辑无需改动**

`.size` 模式下 bounds 天然贴合 `[0, effW*0.92]×[0, effH*0.9]` 加 pad,scale = min(effW/bw, effH/bh)*0.96 ≈ 1(略小给矩形留边距),translate 纯按 bounds 中心居中(effW/2 - cx*scale)——逻辑与上一轮一致无需改,仅更新注释说明坐标系。

文件: `src/utils/tree/treeRenderer.ts:53-64`

```typescript
  // 适配缩放与平移:.size 模式 bounds 天然贴合容器范围,加 pad 后略超,scale≈1(略小给矩形留边距);
  // translate 纯按 bounds 中心居中,effW 已扣除栈面板宽度(见上方)。
  const boundsWidth = engineLayout.bounds.maxX - engineLayout.bounds.minX;
  const boundsHeight = engineLayout.bounds.maxY - engineLayout.bounds.minY;
  const effW =
    (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? 220 : 4);
  const effH = (dimensions.effectiveHeight || dimensions.height) - 4;
  const scale = Math.min(effW / boundsWidth, effH / boundsHeight) * 0.96 || 1;
  const cx = (engineLayout.bounds.minX + engineLayout.bounds.maxX) / 2;
  const cy = (engineLayout.bounds.minY + engineLayout.bounds.maxY) / 2;
  const translateX = effW / 2 - cx * scale;
  const translateY = effH / 2 - cy * scale;
```

- [ ] **Step 2: 验证类型检查**
Run: `npx tsc --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 3: 完整构建验证**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"
  - Output does NOT contain: "error" or "ERROR"

- [ ] **Step 4: push 到 main 触发 GitHub Pages 部署**
Run: `git add src/utils/tree/treeRenderer.ts && git commit -m "refactor(tree): renderer scale 注释适配 .size 模式" && git push origin main`
Expected:
  - Exit code: 0
  - Output contains: "main -> main"

- [ ] **Step 5: 等待部署完成后验证线上 js hash 更新**
Run: `sleep 60 && curl -s https://fuck-algorithm.github.io/leetcode-94-binary-tree-inorder-traversal/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'`
Expected:
  - 输出新的 js hash(与上一轮线上 `index-BIx7a6t9.js` 不同)
