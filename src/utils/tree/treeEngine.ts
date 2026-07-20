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

  // 用 .size([W,H]) 让 d3 把树映射到 [0,W]×[0,H] 范围(根顶部居中 x=W/2、y=0,
  // 与渲染器 x=水平/y=垂直假设一致),坐标贴合容器不再散落/压扁。
  // .separation((a,b)=>1) 强制同层节点均匀分布——加大非同胞 separation 反而把左右
  // 子树推远、压缩子树内部同胞间距(底层节点被挤重叠),均匀=1 才能保证底层不重叠。
  // 上一轮用 .nodeSize([r*8,r*3.8]) 间距过大(7节点 bounds 宽 906>容器 800,scale 拉伸变形),已弃用。
  const treeLayout = d3
    .tree<TreeNodeData>()
    .size([effectiveWidth * 0.92, effectiveHeight * 0.9])
    .separation(() => 1);

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

  // bounds 纳入节点矩形半宽(rectW/2 = r*1.2),使 scale 计算预留矩形边距,避免矩形溢出/遮挡
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
