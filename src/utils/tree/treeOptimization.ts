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
  
  // 计算最小间距 - 增加左侧节点的间距
  const minSpacing = nodeSize * (totalNodes > 15 ? 5 : totalNodes > 7 ? 7 : 8);
  
  // 对左侧节点使用更大的间距系数
  const leftNodeSpacingFactor = 1.4; // 为左侧节点提供额外40%的间距
  
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
      
      // 为左侧节点使用更大的间距
      let adjustedMinDistance = minSpacing;
      
      // 如果前一个节点是某个节点的左子节点，增加间距
      if ((prevNode as any).isLeftChild) {
        adjustedMinDistance *= leftNodeSpacingFactor;
      }
      
      if (currentNode.x - prevNode.x < adjustedMinDistance) {
        const offset = adjustedMinDistance - (currentNode.x - prevNode.x);
        
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
          // 判断是左子节点还是右子节点
          const isLeftChild = (node as any).isLeftChild || 
                            (parent.children[0] === node && !(node as any).isRightChild);
          
          // 为左右子节点使用不同的间距
          const expectedX = isLeftChild 
            ? parent.x - minSpacing * leftNodeSpacingFactor // 左子节点使用更大间距
            : parent.x + minSpacing;
          
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
          
          // 确保左子树在父节点左侧，使用更大间距
          if (leftChild.x >= parent.x - minSpacing * 0.5) {
            const shift = (parent.x - minSpacing * leftNodeSpacingFactor) - leftChild.x;
            shiftSubtree(leftChild, shift);
          }
          
          // 确保右子树在父节点右侧
          if (rightChild.x <= parent.x + minSpacing * 0.5) {
            const shift = (parent.x + minSpacing) - rightChild.x;
            shiftSubtree(rightChild, shift);
          }
        }
      });
    }
  }
  
  // 调整整个树的位置
  const stackPanelWidth = 280; // 栈面板的宽度
  
  // 计算树的边界
  let minX = Infinity;
  let maxX = -Infinity;
  
  treeData.descendants().forEach(node => {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
  });
  
  // 计算整体偏移量
  const treeWidth = maxX - minX;
  const horizontalSpacing = nodeSize * (totalNodes > 15 ? 8 : 12);
  
  // 确保左侧有足够空间，将整个树向右移动
  const leftMarginNeeded = Math.abs(minX) + nodeSize * 2.5;
  if (leftMarginNeeded > Math.abs(minX)) {
    // 向右偏移整个树
    const rightOffset = leftMarginNeeded - Math.abs(minX);
    treeData.descendants().forEach(node => {
      node.x += rightOffset;
    });
  }
  
  // 如果根节点只有右子树，向左移动整个树
  if (treeData.children && treeData.children.length === 1 && (treeData.children[0] as any).isRightChild) {
    const offset = -horizontalSpacing;
    shiftSubtree(treeData, offset);
  }
  
  // 最后，确保树没有太靠左
  const treeCenter = (minX + maxX) / 2;
  if (treeCenter < 0 && Math.abs(treeCenter) > stackPanelWidth / 10) {
    // 稍微向右移动整个树
    const centeringOffset = Math.min(Math.abs(treeCenter) * 0.7, stackPanelWidth / 8);
    treeData.descendants().forEach(node => {
      node.x += centeringOffset;
    });
  }
}; 