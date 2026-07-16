# 中序遍历可视化全面升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 全面升级中序遍历可视化：引入扁平化多色彩色板、新增 Debug 风格代码面板（高亮当前行 + 变量内存值 + 调用栈）、重构二叉树绘制引擎提升视觉质量、将栈状态重做为信息更丰富的专用组件。

**Architecture:** 数据流：`inorderTraversalWithSteps` 生成 `TraversalStep` → Task3 扩展为带 `codeLine` / `variables` / `callStack` 的 `DebugTraversalStep` → `BinaryTreeInorderTraversal` 顶层组件把当前 step 同时分发给 `TreeVisualization`（树）、`CodeDebugPanel`（代码+内存+调用栈）、`StackPanel`（栈状态），三者共用同一 currentStep 步调一致。配色统一由 `theme/colors.ts` 的扁平化 token 驱动，所有组件读取 token 而非硬编码 hex。二叉树绘制改为 `treeEngine` 统一计算布局后由 `treeRenderer` 用圆角矩形+渐变+贝塞尔连线绘制，取代裸 d3.tree 视觉。

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, d3 7.9（仅用于 hierarchy/布局算法），无新增依赖

**Risks:**
- Task2 改动 treeRenderer.ts 影响全部现有渲染路径 → 缓解：renderTree 入参签名保持不变，仅替换内部绘制实现
- Task3 扩展 TraversalStep 接口，可能影响 BinaryTreeInorderTraversal.tsx 中类型推断 → 缓解：新增字段全部 optional，旧消费方不受影响
- Task6 集成三组件需调整布局 CSS（visualization-container 从两栏变三栏）→ 缓解：保留旧 StackVisualization.tsx 文件不删除，仅切换引用，便于回退
- 配色 token 重命名后，CSS 中残留旧 hex 值 → 缓解：Task6 最后统一扫描替换

---

## Task 1: 扁平化配色 Token 系统

**Depends on:** None
**Files:**
- Create: `src/theme/colors.ts`

- [ ] **Step 1: 创建配色 token 文件 — 定义扁平化多色色板供所有组件复用**

```typescript
// src/theme/colors.ts

/**
 * 扁平化配色 token 系统
 * 所有组件通过此模块获取颜色，禁止在组件内硬编码 hex 值
 */

/** 语义化色板：扁平、饱和度适中、对比明确 */
export const palette = {
  // 主色调
  primary: '#4F46E5',       // 靛蓝 - 主操作 / 代码高亮行
  primaryDark: '#3730A3',

  // 节点状态色
  nodeDefault: '#64748B',   // 石板灰 - 未访问
  nodeCurrent: '#EF4444',   // 红 - 正在访问（current/highlighted）
  nodeVisited: '#10B981',   // 翠绿 - 已访问
  nodeInStack: '#F59E0B',   // 琥珀 - 在栈中
  nodePopped: '#94A3B8',    // 浅灰 - 已弹出

  // 连接线与边
  linkDefault: '#94A3B8',
  linkLeft: '#10B981',      // 左子树连线 - 绿
  linkRight: '#EF4444',     // 右子树连线 - 红

  // 操作 badge 配色
  action: {
    push: '#10B981',        // 入栈 - 绿
    pop: '#EF4444',         // 出栈 - 红
    visit: '#F59E0B',       // 访问 - 琥珀
    moveRight: '#8B5CF6',   // 右移 - 紫
    init: '#6366F1',        // 初始化 - 靛
  } as const,

  // 背景 / 表面
  bgApp: '#0F172A',         // 深色应用背景（取代过淡的 #f5f7fa）
  bgSurface: '#1E293B',     // 卡片表面
  bgSurfaceAlt: '#334155',  // 次级表面
  bgCode: '#0B1120',        // 代码面板深底
  bgHighlightLine: 'rgba(79, 70, 229, 0.28)', // 代码当前行高亮

  // 文字
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textOnColor: '#FFFFFF',

  // 边框
  border: '#334155',
  borderActive: '#4F46E5',
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
  if (isCurrent) return palette.primaryDark;
  if (isVisited) return '#047857';
  if (isInStack) return '#B45309';
  return '#475569';
}
```

- [ ] **Step 2: 验证配色模块可被导入**
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 3: 提交**
Run: `git add src/theme/colors.ts && git commit -m "feat(theme): add flat color token system for visualization"`

---

## Task 2: 二叉树绘制引擎与节点视觉重构

**Depends on:** Task 1
**Files:**
- Create: `src/utils/tree/treeEngine.ts`
- Modify: `src/utils/tree/treeRenderer.ts:117-203`
- Modify: `src/components/TreeVisualization/styles.css:82-97`

- [ ] **Step 1: 创建二叉树绘制引擎 — 统一布局计算，提升层级与水平间距算法**

```typescript
// src/utils/tree/treeEngine.ts
import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { TreeDimensions } from './treeTypes';

/** 引擎输出的单节点布局信息 */
export interface EngineNode {
  id: string;
  val: number;
  x: number;
  y: number;
  depth: number;
  isLeftChild: boolean;
  isRightChild: boolean;
  parentId: string | null;
}

/** 引擎输出的连线信息 */
export interface EngineLink {
  source: EngineNode;
  target: EngineNode;
  isLeft: boolean;
  isRight: boolean;
}

export interface EngineLayout {
  nodes: EngineNode[];
  links: EngineLink[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  nodeRadius: number;
}

/**
 * 二叉树绘制引擎：基于 Reingold-Tilford 思路 + d3.tree，
 * 修正水平间距以避免左子树遮挡，返回结构化布局供 renderer 绘制。
 */
export function layoutTree(
  data: TreeNodeData,
  dimensions: TreeDimensions,
  hasStackPanel: boolean,
): EngineLayout {
  const effectiveWidth =
    (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? 220 : 0);
  const effectiveHeight = dimensions.effectiveHeight || dimensions.height;

  // 基础节点半径，按容器与节点量自适应
  const totalNodes = countNodes(data);
  const nodeRadius = Math.min(
    Math.max(18, effectiveWidth / (Math.sqrt(totalNodes) * 3.2)),
    26,
  );

  const treeLayout = d3
    .tree<TreeNodeData>()
    .size([effectiveWidth * 0.92, effectiveHeight * 0.9])
    .nodeSize([
      nodeRadius * (totalNodes > 15 ? 5.0 : totalNodes > 7 ? 6.5 : 8.0),
      nodeRadius * (totalNodes > 15 ? 3.2 : 3.8),
    ]);

  const root = d3.hierarchy(data);

  // 标记左右子节点
  root.descendants().forEach((node) => {
    if (node.parent) {
      if (node.parent.children && node.parent.children[0] === node) {
        (node as any).isLeftChild = true;
      } else if (node.parent.children && node.parent.children[1] === node) {
        (node as any).isRightChild = true;
      }
    }
  });

  const treeData = treeLayout(root);

  const nodes: EngineNode[] = treeData.descendants().map((n) => ({
    id: n.data.nodeId || '',
    val: n.data.val,
    x: n.x,
    y: n.y,
    depth: n.depth,
    isLeftChild: (n as any).isLeftChild || false,
    isRightChild: (n as any).isRightChild || false,
    parentId: n.parent ? n.parent.data.nodeId || null : null,
  }));

  const links: EngineLink[] = treeData.links().map((l) => ({
    source: nodes.find((n) => n.id === l.source.data.nodeId)!,
    target: nodes.find((n) => n.id === l.target.data.nodeId)!,
    isLeft: (l.target as any).isLeftChild || false,
    isRight: (l.target as any).isRightChild || false,
  }));

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

  return {
    nodes,
    links,
    bounds: { minX, maxX, minY, maxY },
    nodeRadius,
  };
}

function countNodes(node: TreeNodeData): number {
  let count = 1;
  if (node.children) {
    for (const c of node.children) count += countNodes(c);
  }
  return count;
}
```

- [ ] **Step 2: 重构 treeRenderer 节点绘制 — 改用圆角矩形 + 渐变填充 + 配色 token + 贝塞尔连线**
文件: `src/utils/tree/treeRenderer.ts:117-203`

```typescript
// 替换 treeRenderer.ts 第 117 行起（绘制连接线）到第 203 行（节点文本结束）
// 注入新 import（在文件顶部 import 区追加）：
// import { layoutTree, EngineLayout } from './treeEngine';
// import { palette, nodeFillColor, nodeStrokeColor } from '../../theme/colors';

  // === 以下替换原 117-203 行的绘制实现 ===
  // 使用绘制引擎获取结构化布局
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

  // 适配缩放与平移（基于引擎 bounds）
  const treeWidth = engineLayout.bounds.maxX - engineLayout.bounds.minX;
  const treeHeight = engineLayout.bounds.maxY - engineLayout.bounds.minY;
  const effW =
    (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? 220 : 4);
  const effH = (dimensions.effectiveHeight || dimensions.height) - 4;
  const scale = Math.min(effW / treeWidth, effH / treeHeight) * 0.96 || 1;
  const cx = (engineLayout.bounds.minX + engineLayout.bounds.maxX) / 2;
  const cy = (engineLayout.bounds.minY + engineLayout.bounds.maxY) / 2;
  const translateX = effW / 2 - cx * scale - (hasStackPanel ? 110 : 0);
  const translateY = effH / 2 - cy * scale;

  const g = svg
    .append('g')
    .attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);

  // 贝塞尔连线，左右子树分别用配色 token
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
    .attr('d', (d) => {
      const sx = d.source.x;
      const sy = d.source.y + r;
      const tx = d.target.x;
      const ty = d.target.y - r;
      const midY = (sy + ty) / 2;
      return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
    });

  // 节点组：圆角矩形 + 阴影
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

  // 阴影底
  nodeGroups
    .append('rect')
    .attr('x', -rectW / 2 + 1.5)
    .attr('y', -rectH / 2 + 2)
    .attr('width', rectW)
    .attr('height', rectH)
    .attr('rx', r * 0.45)
    .attr('ry', r * 0.45)
    .attr('fill', 'rgba(0,0,0,0.25)')
    .attr('filter', 'blur(1px)');

  // 节点主体
  nodeGroups
    .append('rect')
    .attr('x', -rectW / 2)
    .attr('y', -rectH / 2)
    .attr('width', rectW)
    .attr('height', rectH)
    .attr('rx', r * 0.45)
    .attr('ry', r * 0.45)
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
    );

  // 节点文本
  const fontSize = Math.max(11, Math.min(15, 15 / scale));
  nodeGroups
    .append('text')
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('font-size', fontSize)
    .attr('font-weight', '700')
    .attr('fill', palette.textOnColor)
    .text((d) => (d.val !== null ? d.val : 'null'));
```

- [ ] **Step 3: 更新树视觉 CSS 以适配深色背景与新节点形状**
文件: `src/components/TreeVisualization/styles.css:82-97`

```css
/* 替换 styles.css 第 82-97 行（.node.visited 起到 .node.stack 结束） */
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

.tree-visualization-container {
  background-color: #0F172A;
  border-radius: 8px;
}
```

- [ ] **Step 4: 验证树渲染编译通过**
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 5: 提交**
Run: `git add src/utils/tree/treeEngine.ts src/utils/tree/treeRenderer.ts src/components/TreeVisualization/styles.css && git commit -m "feat(tree): add tree draw engine and rounded-gradient node visuals"`

---

## Task 3: Debug 代码步骤数据生成（代码行 + 变量内存 + 调用栈）

**Depends on:** Task 1
**Files:**
- Create: `src/algorithms/inorderTraversalCodeSteps.ts`
- Modify: `src/algorithms/inorderTraversal.ts:227-236`

- [ ] **Step 1: 创建 Debug 代码步骤生成器 — 为每步生成 codeLine / variables / callStack**

```typescript
// src/algorithms/inorderTraversalCodeSteps.ts
import { TreeNode } from '../types/TreeNode';
import { TraversalStep } from './inorderTraversal';

/**
 * AC 代码行号映射（1-based），对应迭代的 AC 题解
 * 1: function inorderTraversal(root) {
 * 2:   const result = [];
 * 3:   const stack = [];
 * 4:   let current = root;
 * 5:   while (current || stack.length) {
 * 6:     while (current) {
 * 7:       stack.push(current);
 * 8:       current = current.left;
 * 9:     }
 * 10:    current = stack.pop();
 * 11:    result.push(current.val);
 * 12:    current = current.right;
 * 13:  }
 * 14:  return result;
 * 15: }
 */
export const ITERATIVE_CODE_LINES = [
  'function inorderTraversal(root) {',
  '  const result = [];',
  '  const stack = [];',
  '  let current = root;',
  '  while (current || stack.length) {',
  '    while (current) {',
  '      stack.push(current);',
  '      current = current.left;',
  '    }',
  '    current = stack.pop();',
  '    result.push(current.val);',
  '    current = current.right;',
  '  }',
  '  return result;',
  '}',
];

/** 递归版 AC 代码行号映射 */
export const RECURSIVE_CODE_LINES = [
  'function inorderTraversal(root) {',
  '  const result = [];',
  '  function dfs(node) {',
  '    if (!node) return;',
  '    dfs(node.left);',
  '    result.push(node.val);',
  '    dfs(node.right);',
  '  }',
  '  dfs(root);',
  '  return result;',
  '}',
];

/** Debug 变量内存视图项 */
export interface DebugVariable {
  name: string;
  value: string;
  type: 'node' | 'array' | 'number' | 'null';
  highlight?: boolean;
}

/** 调用栈帧 */
export interface CallStackFrame {
  functionName: string;
  nodeVal: number | null;
  depth: number;
  line: number;
}

/** 扩展的 Debug 步骤：在原 TraversalStep 上增加代码/内存/调用栈信息 */
export interface DebugTraversalStep extends TraversalStep {
  /** 当前高亮的 AC 代码行号（1-based） */
  codeLine: number;
  /** 当前可见的变量内存值 */
  variables: DebugVariable[];
  /** 当前调用栈 */
  callStack: CallStackFrame[];
}

const INIT: Pick<DebugTraversalStep, 'codeLine' | 'variables' | 'callStack'> = {
  codeLine: 1,
  variables: [
    { name: 'root', value: 'root', type: 'node' },
    { name: 'result', value: '[]', type: 'array' },
  ],
  callStack: [{ functionName: 'inorderTraversal', nodeVal: null, depth: 0, line: 1 }],
};

/**
 * 将基础 TraversalStep[] 增强为 DebugTraversalStep[]
 * 根据 action 与 description 推断当前代码行、变量内存快照与调用栈。
 */
export function enrichStepsWithDebug(
  baseSteps: TraversalStep[],
  method: 'recursive' | 'iterative',
  root: TreeNode | null,
): DebugTraversalStep[] {
  const lines = method === 'recursive' ? RECURSIVE_CODE_LINES : ITERATIVE_CODE_LINES;

  return baseSteps.map((step) => {
    const isRec = method === 'recursive';
    let codeLine = 1;
    let callStack: CallStackFrame[] = [];

    if (step.action === 'push') {
      codeLine = isRec ? 5 : 7;
    } else if (step.action === 'pop') {
      codeLine = isRec ? 8 : 10;
    } else if (step.action === 'visit') {
      if (step.description.includes('加入结果')) {
        codeLine = isRec ? 6 : 11;
      } else if (step.description.includes('初始化')) {
        codeLine = 1;
      } else if (step.description.includes('左子节点') || step.description.includes('左子树')) {
        codeLine = isRec ? 5 : 8;
      } else {
        codeLine = isRec ? 4 : 6;
      }
    } else if (step.action === 'move_right') {
      codeLine = isRec ? 7 : 12;
    }

    // 调用栈：用 step.stackVals 反推帧
    callStack = step.stackVals.map((val, idx) => ({
      functionName: isRec ? 'dfs' : 'inorderTraversal',
      nodeVal: val,
      depth: idx + 1,
      line: codeLine,
    }));
    if (callStack.length === 0) {
      callStack = [{ functionName: 'inorderTraversal', nodeVal: null, depth: 0, line: codeLine }];
    }

    const variables: DebugVariable[] = [
      { name: 'root', value: root ? 'root' : 'null', type: root ? 'node' : 'null' },
      {
        name: 'current',
        value: step.currentVal !== null ? String(step.currentVal) : 'null',
        type: step.currentVal !== null ? 'node' : 'null',
        highlight: step.action === 'visit' || step.action === 'push',
      },
      {
        name: 'stack',
        value: step.stackVals.length
          ? `[${step.stackVals.map((v) => v).join(', ')}]`
          : '[]',
        type: 'array',
      },
      {
        name: 'result',
        value: step.result.length ? `[${step.result.join(', ')}]` : '[]',
        type: 'array',
        highlight: step.description.includes('加入结果'),
      },
    ];

    return { ...step, codeLine, variables, callStack };
  });
}

export function getCodeLines(method: 'recursive' | 'iterative'): string[] {
  return method === 'recursive' ? RECURSIVE_CODE_LINES : ITERATIVE_CODE_LINES;
}
```

- [ ] **Step 2: 扩展 TraversalStep 接口注释以标记 Debug 扩展来源**
文件: `src/algorithms/inorderTraversal.ts:227-236`

```typescript
// 替换 inorderTraversal.ts:227-236 的 TraversalStep 接口定义
// Debug 扩展（codeLine / variables / callStack）由 inorderTraversalCodeSteps.ts 的
// enrichStepsWithDebug 动态附加，保持本接口稳定，不破坏旧消费方。
export interface TraversalStep {
  stack: string[]; // 当前栈中节点的ID
  stackVals: number[]; // 当前栈中节点的值（用于显示）
  currentId: string | null; // 当前正在处理的节点ID
  currentVal: number | null; // 当前正在处理的节点值
  result: number[]; // 当前的结果数组
  action: 'push' | 'pop' | 'visit' | 'move_right'; // 当前的操作类型
  description: string; // 操作的描述
  visitedIds: string[]; // 已访问节点的ID列表
}
```

- [ ] **Step 3: 验证 Debug 步骤模块编译通过**
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 提交**
Run: `git add src/algorithms/inorderTraversalCodeSteps.ts src/algorithms/inorderTraversal.ts && git commit -m "feat(algo): generate debug code steps with code line, variables and call stack"`

---

## Task 4: Debug 风格代码展示面板

**Depends on:** Task 1, Task 3
**Files:**
- Create: `src/components/CodeDebugPanel.tsx`
- Create: `src/components/CodeDebugPanel.css`

- [ ] **Step 1: 创建 CodeDebugPanel 组件 — 代码行高亮 + 变量内存表 + 调用栈列表**

```typescript
// src/components/CodeDebugPanel.tsx
import { palette } from '../theme/colors';
import {
  DebugTraversalStep,
  getCodeLines,
} from '../algorithms/inorderTraversalCodeSteps';
import './CodeDebugPanel.css';

interface CodeDebugPanelProps {
  method: 'recursive' | 'iterative';
  currentStep: DebugTraversalStep | null;
  totalSteps: number;
  stepIndex: number;
}

export default function CodeDebugPanel({
  method,
  currentStep,
  totalSteps,
  stepIndex,
}: CodeDebugPanelProps) {
  const codeLines = getCodeLines(method);
  const activeLine = currentStep?.codeLine ?? 1;

  return (
    <div className="code-debug-panel">
      <div className="cdp-header">
        <span className="cdp-title">▸ AC 代码 Debug</span>
        <span className="cdp-step-badge">
          {method === 'recursive' ? '递归' : '迭代'} · step {stepIndex + 1}/{totalSteps}
        </span>
      </div>

      <div className="cdp-code-block">
        {codeLines.map((line, idx) => {
          const lineNo = idx + 1;
          const isActive = lineNo === activeLine;
          return (
            <div
              key={lineNo}
              className={`cdp-code-line ${isActive ? 'cdp-active' : ''}`}
            >
              <span className="cdp-line-no">{lineNo}</span>
              <code className="cdp-line-text">{line || ' '}</code>
              {isActive && <span className="cdp-marker">▶</span>}
            </div>
          );
        })}
      </div>

      <div className="cdp-section">
        <div className="cdp-section-title" style={{ color: palette.textSecondary }}>
          变量内存
        </div>
        <div className="cdp-var-grid">
          {currentStep?.variables.map((v) => (
            <div
              key={v.name}
              className={`cdp-var-cell ${v.highlight ? 'cdp-var-highlight' : ''}`}
            >
              <span className="cdp-var-name">{v.name}</span>
              <span className={`cdp-var-value cdp-type-${v.type}`}>{v.value}</span>
            </div>
          )) ?? null}
        </div>
      </div>

      <div className="cdp-section">
        <div className="cdp-section-title" style={{ color: palette.textSecondary }}>
          调用栈
        </div>
        <div className="cdp-callstack">
          {currentStep?.callStack.map((frame, idx) => {
            const isTop = idx === (currentStep.callStack.length - 1);
            return (
              <div
                key={idx}
                className={`cdp-frame ${isTop ? 'cdp-frame-top' : ''}`}
              >
                <span className="cdp-frame-fn">{frame.functionName}</span>
                <span className="cdp-frame-arg">
                  (node={frame.nodeVal ?? '∅'})
                </span>
                <span className="cdp-frame-depth">d={frame.depth}</span>
              </div>
            );
          }).reverse() ?? null}
          <div className="cdp-stack-base">▲ 栈底</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 CodeDebugPanel CSS — 深色 IDE 风格 + 配色 token**

```css
/* src/components/CodeDebugPanel.css */
.code-debug-panel {
  background-color: #0B1120;
  border: 1px solid #334155;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: #F8FAFC;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
}

.cdp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(90deg, #4F46E5, #3730A3);
  border-bottom: 1px solid #334155;
}

.cdp-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: #fff;
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
  background-color: #0B1120;
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

.cdp-code-line.cdp-active {
  background-color: rgba(79, 70, 229, 0.28);
  border-left: 3px solid #4F46E5;
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

.cdp-active .cdp-line-text {
  color: #FBBF24;
  font-weight: 600;
}

.cdp-marker {
  margin-left: 8px;
  color: #FBBF24;
}

.cdp-section {
  padding: 8px 12px;
  border-top: 1px solid #1E293B;
}

.cdp-section-title {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.cdp-var-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.cdp-var-cell {
  background-color: #1E293B;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cdp-var-cell.cdp-var-highlight {
  border-color: #4F46E5;
  background-color: rgba(79, 70, 229, 0.18);
}

.cdp-var-name {
  font-size: 0.7rem;
  color: #94A3B8;
}

.cdp-var-value {
  font-size: 0.82rem;
  font-weight: 700;
  color: #F8FAFC;
}

.cdp-type-node { color: #10B981; }
.cdp-type-array { color: #F59E0B; }
.cdp-type-number { color: #38BDF8; }
.cdp-type-null { color: #64748B; font-style: italic; }

.cdp-callstack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cdp-frame {
  background-color: #1E293B;
  border-left: 3px solid #475569;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  display: flex;
  gap: 8px;
  align-items: center;
}

.cdp-frame-top {
  border-left-color: #EF4444;
  background-color: rgba(239, 68, 68, 0.15);
}

.cdp-frame-fn { color: #818CF8; font-weight: 700; }
.cdp-frame-arg { color: #10B981; }
.cdp-frame-depth { color: #64748B; margin-left: auto; }

.cdp-stack-base {
  text-align: center;
  font-size: 0.7rem;
  color: #475569;
  padding-top: 2px;
}
```

- [ ] **Step 3: 验证 CodeDebugPanel 编译通过**
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 提交**
Run: `git add src/components/CodeDebugPanel.tsx src/components/CodeDebugPanel.css && git commit -m "feat(ui): add debug-style code panel with variables and call stack"`

---

## Task 5: 栈状态专用组件重构

**Depends on:** Task 1
**Files:**
- Create: `src/components/StackPanel.tsx`
- Create: `src/components/StackPanel.css`

- [ ] **Step 1: 创建 StackPanel 组件 — 信息更丰富、文案明确的栈状态专用组件**

```typescript
// src/components/StackPanel.tsx
import { palette } from '../theme/colors';
import './StackPanel.css';

interface StackPanelProps {
  stack: string[];
  stackVals: number[];
  currentVal: number | null;
  action: 'push' | 'pop' | 'visit' | 'move_right';
  description: string;
  result: number[];
}

const ACTION_META: Record<
  StackPanelProps['action'],
  { label: string; color: string; icon: string }
> = {
  push: { label: '入栈 PUSH', color: palette.action.push, icon: '⬇' },
  pop: { label: '出栈 POP', color: palette.action.pop, icon: '⬆' },
  visit: { label: '访问 VISIT', color: palette.action.visit, icon: '●' },
  move_right: { label: '转向右子树', color: palette.action.moveRight, icon: '→' },
};

function getPhase(description: string): string {
  if (description.includes('初始化')) return '初始化';
  if (description.includes('开始遍历') || description.includes('根节点')) return '访问根节点';
  if (description.includes('左子')) return '遍历左子树';
  if (description.includes('加入结果')) return '访问当前节点';
  if (description.includes('右子')) return '遍历右子树';
  if (description.includes('遍历完成')) return '结束遍历';
  return '遍历中';
}

export default function StackPanel({
  stack,
  stackVals,
  currentVal,
  action,
  description,
  result,
}: StackPanelProps) {
  const meta = ACTION_META[action] ?? ACTION_META.visit;
  const phase = getPhase(description);

  return (
    <div className="stack-panel">
      <div className="sp-header">
        <span className="sp-title">stk 栈状态</span>
        <span
          className="sp-action-badge"
          style={{ backgroundColor: meta.color }}
        >
          {meta.icon} {meta.label}
        </span>
      </div>

      <div className="sp-phase-row">
        <span className="sp-phase-label">当前阶段</span>
        <span className="sp-phase-value">{phase}</span>
      </div>

      <div className="sp-stack-area">
        <div className="sp-stack-label">栈顶 ↑</div>
        <div className="sp-stack-list">
          {stackVals.length === 0 ? (
            <div className="sp-empty">栈为空 (empty)</div>
          ) : (
            stackVals
              .map((val, idx) => {
                const isTop = idx === stackVals.length - 1;
                return (
                  <div
                    key={`${stack[idx]}-${idx}`}
                    className={`sp-stack-item ${isTop ? 'sp-top' : ''}`}
                  >
                    <span className="sp-item-val">{val}</span>
                    {isTop && <span className="sp-top-tag">TOP</span>}
                  </div>
                );
              })
              .reverse()
          )}
        </div>
        <div className="sp-stack-label">栈底 ↓</div>
      </div>

      <div className="sp-current-row">
        <span className="sp-current-label">current 指针</span>
        <span
          className={`sp-current-val ${currentVal === null ? 'sp-null' : ''}`}
        >
          {currentVal !== null ? currentVal : 'null'}
        </span>
      </div>

      <div className="sp-desc">{description}</div>

      <div className="sp-result-row">
        <span className="sp-result-label">result 结果</span>
        <span className="sp-result-val">
          [{result.join(', ')}]
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 StackPanel CSS — 配色 token 驱动、栈顶高亮**

```css
/* src/components/StackPanel.css */
.stack-panel {
  background-color: #1E293B;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow-y: auto;
  color: #F8FAFC;
  font-family: 'JetBrains Mono', Consolas, monospace;
}

.sp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 6px;
  border-bottom: 1px solid #334155;
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
  color: #fff;
}

.sp-phase-row,
.sp-current-row,
.sp-result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #0F172A;
  border-radius: 6px;
  padding: 5px 8px;
}

.sp-phase-label,
.sp-current-label,
.sp-result-label {
  font-size: 0.72rem;
  color: #94A3B8;
}

.sp-phase-value {
  font-size: 0.8rem;
  font-weight: 700;
  color: #818CF8;
}

.sp-stack-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sp-stack-label {
  text-align: center;
  font-size: 0.68rem;
  color: #64748B;
}

.sp-stack-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 200px;
  overflow-y: auto;
}

.sp-stack-item {
  background-color: #334155;
  border-left: 3px solid #475569;
  border-radius: 4px;
  padding: 5px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.sp-stack-item.sp-top {
  background-color: #F59E0B;
  color: #0F172A;
  border-left-color: #B45309;
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
  color: #64748B;
  font-style: italic;
  padding: 12px;
  border: 1px dashed #334155;
  border-radius: 6px;
}

.sp-current-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: #10B981;
  background: rgba(16,185,129,0.15);
  padding: 2px 10px;
  border-radius: 8px;
}

.sp-current-val.sp-null {
  color: #64748B;
  background: rgba(100,116,139,0.15);
}

.sp-desc {
  background-color: #0F172A;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.75rem;
  color: #CBD5E1;
  line-height: 1.5;
  border-left: 3px solid #4F46E5;
}

.sp-result-val {
  font-size: 0.85rem;
  color: #F59E0B;
  font-weight: 700;
}
```

- [ ] **Step 3: 验证 StackPanel 编译通过**
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 提交**
Run: `git add src/components/StackPanel.tsx src/components/StackPanel.css && git commit -m "feat(ui): rebuild stack state as dedicated StackPanel component"`

---

## Task 6: 集成新组件到主布局并刷新全局配色

**Depends on:** Task 2, Task 3, Task 4, Task 5
**Files:**
- Modify: `src/components/BinaryTreeInorderTraversal.tsx:1-7`（import）
- Modify: `src/components/BinaryTreeInorderTraversal.tsx:447-461`（获取 debug 步骤）
- Modify: `src/components/BinaryTreeInorderTraversal.tsx:663-692`（布局三栏）
- Modify: `src/components/BinaryTreeInorderTraversal/styles.css:22-58`
- Modify: `src/App.css:46-55`
- Modify: `src/index.css:1-12`

- [ ] **Step 1: 在主组件 import 新组件与 debug 步骤增强器**
文件: `src/components/BinaryTreeInorderTraversal.tsx:1-7`

```typescript
// 替换 BinaryTreeInorderTraversal.tsx 第 1-7 行的 import 区
import { useState, useEffect, useRef, useCallback } from 'react';
import TreeVisualization from './TreeVisualization';
import StackPanel from './StackPanel';
import CodeDebugPanel from './CodeDebugPanel';
import TreeInputExamples from './TreeInputExamples';
import { TreeNode, TreeNodeData, arrayToTree, treeToD3Format } from '../types/TreeNode';
import { inorderTraversalWithSteps, TraversalStep } from '../algorithms/inorderTraversal';
import {
  enrichStepsWithDebug,
  DebugTraversalStep,
} from '../algorithms/inorderTraversalCodeSteps';
import './BinaryTreeInorderTraversal.css';
```

- [ ] **Step 2: 修改 getCurrentStackState 以返回 DebugTraversalStep 并增加 memo 化 debug 步骤**
文件: `src/components/BinaryTreeInorderTraversal.tsx:447-461`

```typescript
// 替换 BinaryTreeInorderTraversal.tsx:447-461 的 getCurrentStackState 函数
// 获取当前步骤的栈状态（返回 DebugTraversalStep 或 null）
const getCurrentStackState = (): DebugTraversalStep | null => {
  if (traversalSteps.length === 0 || currentStep >= traversalSteps.length) {
    return null;
  }
  return debugSteps[currentStep] ?? null;
};

// debug 增强步骤（随 method/root 变化重算）
const debugSteps: DebugTraversalStep[] = useMemo(
  () => enrichStepsWithDebug(traversalSteps, method, root),
  [traversalSteps, method, root],
);
```

注：需在文件顶部 import 中追加 `useMemo`（已在 React import 行内，将 `useCallback` 行扩展为 `useCallback, useMemo`）。
文件: `src/components/BinaryTreeInorderTraversal.tsx:1`

```typescript
// 替换第 1 行
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
```

- [ ] **Step 3: 重构可视化布局为三栏 — 树 + 代码Debug面板 + 栈面板**
文件: `src/components/BinaryTreeInorderTraversal.tsx:663-692`

```typescript
// 替换 BinaryTreeInorderTraversal.tsx:663-692 的 visualization-wrapper 区块
      <div className={`visualization-wrapper ${method === 'iterative' || method === 'recursive' ? 'with-stack' : ''}`}>
        <div className="visualization-container">
          <div className="tree-section">
            {treeData && (
              <div className="tree-section-content">
                <TreeVisualization
                  data={treeData}
                  highlightedNodeId={currentNodeId}
                  visitedNodeIds={visitedNodeIds}
                  stackNodeIds={getCurrentStackState()?.stack ?? []}
                />
              </div>
            )}
          </div>

          <div className="code-debug-section">
            <CodeDebugPanel
              method={method}
              currentStep={getCurrentStackState()}
              totalSteps={traversalSteps.length}
              stepIndex={currentStep}
            />
          </div>

          {(method === 'iterative' || method === 'recursive') && (
            <div className="stack-section">
              <StackPanel
                stack={getCurrentStackState()?.stack ?? []}
                stackVals={getCurrentStackState()?.stackVals ?? []}
                currentVal={getCurrentStackState()?.currentVal ?? null}
                action={getCurrentStackState()?.action ?? 'visit'}
                description={getCurrentStackState()?.description ?? '未开始遍历'}
                result={result}
              />
            </div>
          )}
        </div>
      </div>
```

- [ ] **Step 4: 更新布局 CSS 为三栏并应用深色背景**
文件: `src/components/BinaryTreeInorderTraversal/styles.css:22-58`

```css
/* 替换 styles.css 第 22-58 行（.visualization-container 起到 .stack-section 结束） */
.visualization-container {
  flex: 1;
  display: flex;
  padding: 10px;
  gap: 12px;
  overflow: hidden;
  background-color: #0F172A;
}

.tree-section {
  flex: 4;
  background-color: #0F172A;
  border: 1px solid #334155;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.tree-section-content {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.code-debug-section {
  flex: 2;
  min-width: 280px;
  display: flex;
  flex-direction: column;
}

.stack-section {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 5: 刷新全局背景配色 token 应用**
文件: `src/App.css:46-55`

```css
/* 替换 App.css 第 46-55 行的 .app 区块 */
.app {
  width: 100%;
  height: 100%;
  padding: 4px;
  background-color: #0F172A;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
```

文件: `src/index.css:1-12`

```css
/* 替换 index.css 第 1-12 行的 :root 区块 */
:root {
  font-family: system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: dark;
  color: #F8FAFC;
  background-color: #0F172A;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 6: 验证整体编译通过**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error" or "ERROR"

- [ ] **Step 7: 提交**
Run: `git add -A && git commit -m "feat(integration): wire code panel, stack panel and new palette into main layout"`
