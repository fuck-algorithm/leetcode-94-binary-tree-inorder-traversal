import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { shiftSubtree } from './treeLayout';

/**
 * 优化树的布局，确保节点不重叠
 */
export const optimizeTreeLayout = (
  treeData: d3.HierarchyPointNode<TreeNodeData>,
  nodeSize: number,
  totalNodes: number
): void => {
  // 按深度收集节点
  const nodesByDepth: Map<number, d3.HierarchyPointNode<TreeNodeData>[]> = new Map();
  
  treeData.descendants().forEach(node => {
    if (!nodesByDepth.has(node.depth)) {
      nodesByDepth.set(node.depth, []);
    }
    nodesByDepth.get(node.depth)!.push(node);
  });
  
  // 计算最小间距
  const minSpacing = nodeSize * (totalNodes > 15 ? 4 : 6);
  
  // 从底部开始处理
  const maxDepth = Math.max(...Array.from(nodesByDepth.keys()));
  
  for (let depth = maxDepth; depth >= 0; depth--) {
    const nodes = nodesByDepth.get(depth) || [];
    
    // 先按x坐标排序
    nodes.sort((a, b) => a.x - b.x);
    
    // 确保同级节点之间有足够距离
    for (let i = 1; i < nodes.length; i++) {
      const currentNode = nodes[i];
      const prevNode = nodes[i - 1];
      const minDistance = minSpacing;
      
      if (currentNode.x - prevNode.x < minDistance) {
        const offset = minDistance - (currentNode.x - prevNode.x);
        
        // 移动当前节点及其右侧的所有节点
        for (let j = i; j < nodes.length; j++) {
          shiftSubtree(nodes[j], offset);
        }
      }
    }
    
    // 处理单侧子树的情况
    if (depth > 0) {
      nodes.forEach(node => {
        const parent = node.parent!;
        
        // 只有一个子节点的情况
        if (parent.children && parent.children.length === 1) {
          // 获取节点是左子树还是右子树的信息
          const isLeftChild = node.data.isLeftChild !== undefined 
            ? node.data.isLeftChild 
            : (parent.children![0] === node); // 默认第一个子节点为左子树
          
          const expectedX = parent.x + (isLeftChild ? -minSpacing : minSpacing);
          
          // 如果节点不在预期位置，移动它
          if (Math.abs(node.x - expectedX) > 1) {
            const shift = expectedX - node.x;
            shiftSubtree(node, shift);
          }
        }
        // 两个子节点，确保左右子树位置正确
        else if (parent.children && parent.children.length === 2) {
          const leftChild = parent.children[0];
          const rightChild = parent.children[1];
          
          // 确保左子树在父节点左侧
          if (leftChild.x >= parent.x) {
            const shift = parent.x - minSpacing - leftChild.x;
            shiftSubtree(leftChild, shift);
          }
          
          // 确保右子树在父节点右侧
          if (rightChild.x <= parent.x) {
            const shift = parent.x + minSpacing - rightChild.x;
            shiftSubtree(rightChild, shift);
          }
        }
      });
    }
  }
  
  // 调整根节点的位置，考虑栈面板宽度
  const stackPanelWidth = 280; // 栈面板的宽度
  
  // 计算树的边界
  let minX = Infinity;
  let maxX = -Infinity;
  
  treeData.descendants().forEach(node => {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
  });
  
  // 计算整体偏移量，确保树可见且不被栈面板遮挡
  const treeWidth = maxX - minX;
  const horizontalSpacing = nodeSize * (totalNodes > 15 ? 8 : 12);
  
  // 如果根节点只有右子树，向左移动整个树
  if (treeData.children && treeData.children.length === 1 && !treeData.children[0].data.isLeftChild) {
    const offset = -horizontalSpacing;
    shiftSubtree(treeData, offset);
  }
  
  // 如果树宽度较小，确保有足够的水平空间
  if (treeWidth < horizontalSpacing * 2) {
    // 调整整个树的位置，向左偏移
    const offset = -stackPanelWidth / 8;
    shiftSubtree(treeData, offset);
  }
}; 