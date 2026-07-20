# 二叉树自定义布局 + 移除紫色配色 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 用自定义中序遍历定位布局替换 d3.tree(后者把单链树画成垂直直线丢失左右子几何),并移除全产品紫色配色(violet)。

**Architecture:** TreeNodeData(含 nodeId/val/children) → layoutTree 自定义布局:中序遍历给每个叶子分配递增 x 序号(leafSpacing 间距),内部节点 x=其子树叶子 x 区间中点、y=depth×levelHeight;左右子天然分居父两侧,单链树也能正确斜向展开 → renderer 按 bounds scale 居中绘制矩形节点+贝塞尔连线。配色:colors.ts palette 是唯一真源,index.css :root 注入同名 CSS 变量,组件 CSS 引用 var(--c-*);violet 仅 colors.ts 自身定义无 TS 引用,直接删 key + 删 CSS 变量,引用处改 cyan/indigo/pink。

**Tech Stack:** React 19, Vite 6, TypeScript 5.7, d3 7.9(仅 d3.select 用于 SVG 操作,不再用 d3.tree/d3.hierarchy), CSS Variables

**Risks:**
- 自定义中序定位子树重叠 → 缓解:中序遍历叶子唯一递增 x,内部节点取子树叶子区间中点,子树区间不重叠(经典算法,Task1 Step4 Node 验证)
- 删 violet key 前 TS 引用导致编译失败 → 缓解:已 grep 确认 palette.violet/violetDark 无 TS 引用,仅 colors.ts 定义;action.moveRight 改值不改 key
- levelHeight/leafSpacing 与 nodeRadius 不匹配致节点重叠 → 缓解:leafSpacing=rectW+8、levelHeight=rectH+24,bounds 含 pad 后 scale 缩放兜底

---

### Task 1: 重写 treeEngine 为自定义二叉树布局

**Depends on:** None
**Files:**
- Modify: `src/utils/tree/treeEngine.ts:1-125`（整体重写 layoutTree + 删除 d3.tree/d3.hierarchy import）

- [ ] **Step 1: 重写 treeEngine — 用中序遍历定位替代 d3.tree**

d3.tree 是通用对称层级布局,不保留二叉树左右子位置:单链树 `[1,null,2,3]` 经它布局后 1→2→3 全在 x=400 垂直一线,丢失"2 是 1 右子、3 是 2 左子"的几何关系。改用自定义中序定位:叶子按中序序号分配 x(均匀不重叠),内部节点 x=子树叶子 x 中点(左子在父左、右子在父右,天然二叉树形态),y=depth×levelHeight。

文件: `src/utils/tree/treeEngine.ts`（替换整个文件）

```typescript
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
 * 二叉树绘制引擎:自定义中序遍历定位。
 * 叶子按中序序号分配 x(均匀),内部节点 x=子树叶子 x 中点,y=depth×levelHeight。
 * 保留二叉树左右子几何(左子在父左、右子在父右),单链树也能正确斜向展开。
 * d3.tree 是通用对称布局,不保留左右子位置(单链树画成垂直直线),已弃用。
 */
export function layoutTree(
  data: TreeNodeData,
  dimensions: TreeDimensions,
  hasStackPanel: boolean,
): EngineLayout {
  const effectiveWidth =
    (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? 220 : 0);
  const effectiveHeight = dimensions.effectiveHeight || dimensions.height;

  const totalNodes = countNodes(data);
  // 节点半径按容器与节点量自适应,矩形宽 rectW=r*2.4
  const nodeRadius = Math.min(
    Math.max(16, effectiveWidth / (Math.sqrt(totalNodes) * 3.2)),
    24,
  );
  const rectW = nodeRadius * 2.4;
  const rectH = nodeRadius * 2;
  const leafSpacing = rectW + 10; // 叶子水平间距,保证不重叠
  const levelHeight = rectH + 28; // 层级垂直间距

  // 中序遍历:叶子分配递增 x 序号,内部节点 x=子树叶子区间中点
  let leafCounter = 0;
  const nodeMap = new Map<string, EngineNode>();

  // 第一遍:递归计算每个节点的 x(叶子=序号*leafSpacing,内部=子树中点)与 y、depth、左右标记
  function assign(
    node: TreeNodeData,
    depth: number,
    parent: TreeNodeData | null,
    isLeft: boolean,
    isRight: boolean,
  ): { x: number; leftmost: number; rightmost: number } {
    const children = node.children || [];
    let x: number;
    let leftmost: number;
    let rightmost: number;

    if (children.length === 0) {
      // 叶子:分配递增 x
      x = leafCounter * leafSpacing;
      leafCounter += 1;
      leftmost = x;
      rightmost = x;
    } else {
      // 内部节点:递归子节点,取子树叶子区间中点
      const childResults = children.map((child, i) =>
        assign(
          child,
          depth + 1,
          node,
          i === 0,
          i === 1 || children.length === 1 ? false : i === 1,
        ),
      );
      // 子节点 x 已定,本节点 x=子树叶子区间中点
      leftmost = childResults[0].leftmost;
      rightmost = childResults[childResults.length - 1].rightmost;
      x = (leftmost + rightmost) / 2;
    }

    nodeMap.set(node.nodeId || '', {
      id: node.nodeId || '',
      val: node.val,
      x,
      y: depth * levelHeight,
      depth,
      isLeftChild: isLeft,
      isRightChild: isRight,
      parentId: parent ? parent.nodeId || null : null,
    });

    return { x, leftmost, rightmost };
  }

  assign(data, 0, null, false, false);

  const nodes = Array.from(nodeMap.values());

  // 连线:父→子,isLeft/isRight 从子节点的标记取
  const links: EngineLink[] = [];
  function collectLinks(node: TreeNodeData) {
    const children = node.children || [];
    children.forEach((child, i) => {
      const src = nodeMap.get(node.nodeId || '')!;
      const tgt = nodeMap.get(child.nodeId || '')!;
      links.push({
        source: src,
        target: tgt,
        isLeft: i === 0,
        isRight: i === 1,
      });
      collectLinks(child);
    });
  }
  collectLinks(data);

  // bounds:纳入矩形半宽 pad,scale 缩放兜底防溢出
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
  const pad = nodeRadius * 1.2 + 6;
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

function countNodes(node: TreeNodeData): number {
  let count = 1;
  if (node.children) {
    for (const c of node.children) count += countNodes(c);
  }
  return count;
}
```

- [ ] **Step 2: 验证类型检查**
Run: `npx tsc --noEmit`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 3: 验证 treeRenderer 无需改动(连线用 source/target x/y,与布局算法无关)**

renderer 的连线 `d` 函数用 `d.source.x/d.source.y/d.target.x/d.target.y`,节点用 `translate(d.x,d.y)`,均与布局算法无关,自定义布局产出相同 EngineNode/EngineLink 结构,renderer 无需改。确认无 `d3.tree`/`d3.hierarchy` 残留引用。

Run: `grep -n "d3.tree\|d3.hierarchy\|\.size(\|\.nodeSize(\|\.separation(" src/utils/tree/treeRenderer.ts src/utils/tree/treeEngine.ts || echo "无 d3.tree 残留"`
Expected:
  - Exit code: 0
  - Output contains: "无 d3.tree 残留"

- [ ] **Step 4: Node 验证单链树不再垂直直线**
Run: `node -e "const {layoutTree}=require('./src/utils/tree/treeEngine.ts');"` 2>/dev/null || node -e "
// 内联复刻 layoutTree 逻辑验证 [1,null,2,3]
function count(n){let c=1;if(n.children)for(const x of n.children)c+=count(x);return c;}
function layout(data){
  const r=20,rectW=r*2.4,rectH=r*2,leafSpacing=rectW+10,levelHeight=rectH+28;
  let leaf=0;const map=new Map();
  function assign(node,depth,parent,isLeft,isRight){
    const ch=node.children||[];let x,lm,rm;
    if(ch.length===0){x=leaf*leafSpacing;leaf++;lm=x;rm=x;}
    else{const cr=ch.map((c,i)=>assign(c,depth+1,node,i===0,i===1));lm=cr[0].lm;rm=cr[cr.length-1].rm;x=(lm+rm)/2;}
    map.set(node.nodeId,{x,y:depth*levelHeight,depth});
    return {x,lm,rm};
  }
  assign(data,0,null,false,false);
  return Array.from(map.values());
}
// [1,null,2,3] = 根1,右子2,2的左子3
const t={nodeId:'1',val:1,children:[{nodeId:'2',val:2,children:[{nodeId:'3',val:3}]}]};
const ns=layout(t);
console.log('=== [1,null,2,3] 自定义布局 ===');
ns.forEach(n=>console.log('id='+n.id?'':'','x='+n.x.toFixed(1),'y='+n.y.toFixed(1)));
const xs=ns.map(n=>n.x);
const allSameX=xs.every(x=>x===xs[0]);
console.log(allSameX?'失败:仍是垂直直线':'OK:叶子3的x≠根1的x,单链斜向展开');
"
Expected:
  - Exit code: 0
  - Output contains: "OK:叶子3的x≠根1的x"

- [ ] **Step 5: 提交**
Run: `git add src/utils/tree/treeEngine.ts && git commit -m "fix(tree): 用自定义中序定位布局替代 d3.tree,修复单链树画成垂直直线"`

---

### Task 2: 移除全产品紫色配色

**Depends on:** None
**Files:**
- Modify: `src/theme/colors.ts:19-20,45`（删 violet/violetDark key,moveRight 改 pink）
- Modify: `src/index.css:23-24`（删 --c-violet 变量）
- Modify: `src/components/BinaryTreeInorderTraversal.css`（violet→cyan 多处）
- Modify: `src/components/StackPanel.css:59`（violet→indigo）
- Modify: `src/components/CodeDebugPanel.css:160`（violet→indigo）

- [ ] **Step 1: 删除 colors.ts 的 violet key + moveRight 改 pink**

violet/violetDark 在 TS 文件无引用(grep 已确认),安全删除。action.moveRight(右移操作)从 violet 改 pink,与结束按钮 pink 区分但同属粉系(避免引入紫色)。

文件: `src/theme/colors.ts:19-20`（删除两行）

删除:
```typescript
  violet: '#8B5CF6',        // 紫 - 速度/方法控制       =var(--c-violet)
  violetDark: '#7C3AED',
```

文件: `src/theme/colors.ts:45`（moveRight 改色）

```typescript
    moveRight: '#EC4899',   // 右移 - 粉(原紫,移除紫色)
```

- [ ] **Step 2: 删除 index.css 的 --c-violet 变量**

文件: `src/index.css:23-24`（删除两行）

删除:
```css
  --c-violet: #8B5CF6;
  --c-violet-dark: #7C3AED;
```

- [ ] **Step 3: 修改 BinaryTreeInorderTraversal.css — violet 引用改 cyan**

速度/方法控制区原用紫色,改青色(cyan)保持"控制类"语义且非紫。涉及:L124 accent-color、L154 滑块填充、L163/L172 thumb、L319 hover border。注释 L84/L143/L301 的"紫色"改"青色"。

文件: `src/components/BinaryTreeInorderTraversal.css`（逐一替换 `var(--c-violet)` → `var(--c-cyan)`、`var(--c-violet-dark)` → `var(--c-cyan-dark)`）

- [ ] **Step 4: 修改 StackPanel.css — 函数名色 violet→indigo**

文件: `src/components/StackPanel.css:59`

```css
.sp-phase-value {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-indigo);
}
```

- [ ] **Step 5: 修改 CodeDebugPanel.css — 函数名色 violet→indigo**

文件: `src/components/CodeDebugPanel.css:160`

```css
.cdp-frame-fn { color: var(--c-indigo); font-weight: 700; }
```

- [ ] **Step 6: 验证无 violet 残留 + 类型检查**
Run: `grep -rn "violet\|紫色\|#8B5CF6\|#7C3AED" src/ --include="*.ts" --include="*.tsx" --include="*.css" || echo "无紫色残留" && npx tsc --noEmit`
Expected:
  - Output contains: "无紫色残留"
  - tsc Exit code: 0

- [ ] **Step 7: 提交**
Run: `git add src/theme/colors.ts src/index.css src/components/BinaryTreeInorderTraversal.css src/components/StackPanel.css src/components/CodeDebugPanel.css && git commit -m "style(ui): 移除全产品紫色配色,violet→cyan/indigo/pink"`

---

### Task 3: 构建验证并 push main

**Depends on:** Task 1, Task 2
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

- [ ] **Step 3: 等待部署完成后验证线上 js hash 更新 + 无紫色**
Run: `sleep 60 && curl -s https://fuck-algorithm.github.io/leetcode-94-binary-tree-inorder-traversal/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'`
Expected:
  - 输出新的 js hash(与上一轮线上 `index-t_GINIOs.js` 不同)
