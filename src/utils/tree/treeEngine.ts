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
 * 二叉树绘制引擎:中序遍历定位。
 * 对每个节点(含内部节点)按中序序号分配递增 x,内部节点也有独立 x,
 * 单链树(如 [1,null,2,3])也能斜向展开而非画成垂直直线。
 * y=depth×levelHeight,左子天然在父左侧(中序先于父)、右子在父右侧(中序后于父)。
 * d3.tree 是通用对称布局,单链树会全压在 x=0 垂直一线丢失形态,已弃用。
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
  const nodeSpacing = rectW + 12; // 节点水平间距,保证不重叠
  const levelHeight = rectH + 28; // 层级垂直间距

  // 中序遍历:左子 → 自己 → 右子,每个节点分配递增 x 序号
  let counter = 0;
  const nodeMap = new Map<string, EngineNode>();

  function inorder(
    node: TreeNodeData,
    depth: number,
    parentId: string | null,
    isLeft: boolean,
    isRight: boolean,
  ): void {
    const children = node.children || [];
    // children[0] 当左子,children[1] 当右子(二叉树约定)
    if (children[0]) inorder(children[0], depth + 1, node.nodeId || null, true, false);
    nodeMap.set(node.nodeId || '', {
      id: node.nodeId || '',
      val: node.val,
      x: counter * nodeSpacing,
      y: depth * levelHeight,
      depth,
      isLeftChild: isLeft,
      isRightChild: isRight,
      parentId,
    });
    counter += 1;
    if (children[1]) inorder(children[1], depth + 1, node.nodeId || null, false, true);
  }

  inorder(data, 0, null, false, false);

  const nodes = Array.from(nodeMap.values());

  // 连线:父→子,isLeft/isRight 从子在父 children 中的位置取
  const links: EngineLink[] = [];
  function collectLinks(node: TreeNodeData): void {
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
