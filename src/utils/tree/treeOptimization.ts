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
  
  // 计算最小间距 - 增加节点间距，特别是对于小型树
  const minSpacing = nodeSize * (totalNodes > 15 ? 5.5 : totalNodes > 7 ? 7.5 : 9.5);
  
  // 为左侧节点提供更大的间距系数
  const leftNodeSpacingFactor = 1.65; // 为左侧节点提供额外65%的间距
  const rightNodeSpacingFactor = 1.2; // 为右侧节点提供额外20%的间距
  
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
      
      // 根据节点类型使用不同的间距
      let adjustedMinDistance = minSpacing;
      
      // 如果前一个节点是某个节点的左子节点，增加间距
      if ((prevNode as any).isLeftChild) {
        adjustedMinDistance *= leftNodeSpacingFactor;
      }
      
      // 如果当前节点是某个节点的右子节点，也适当增加间距
      if ((currentNode as any).isRightChild) {
        adjustedMinDistance *= rightNodeSpacingFactor;
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
            : parent.x + minSpacing * rightNodeSpacingFactor; // 右子节点也使用调整后的间距
          
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
          if (leftChild.x >= parent.x - minSpacing * 0.6) {
            const shift = (parent.x - minSpacing * leftNodeSpacingFactor) - leftChild.x;
            shiftSubtree(leftChild, shift);
          }
          
          // 确保右子树在父节点右侧
          if (rightChild.x <= parent.x + minSpacing * 0.6) {
            const shift = (parent.x + minSpacing * rightNodeSpacingFactor) - rightChild.x;
            shiftSubtree(rightChild, shift);
          }
        }
      });
    }
  }
  
  // 添加重叠检测和调整
  const detectAndFixOverlap = () => {
    // 获取所有节点
    const allNodes = treeData.descendants();
    const minNodeDistance = nodeSize * 2.5; // 节点间的最小距离
    
    // 检查每对节点是否重叠
    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i];
      for (let j = i + 1; j < allNodes.length; j++) {
        const otherNode = allNodes[j];
        
        // 只检查不在同一垂直线上的节点（相同深度的不同子树）
        if (Math.abs(node.y - otherNode.y) < nodeSize * 1.5) {
          const xDistance = Math.abs(node.x - otherNode.x);
          
          // 如果水平距离太小，可能会发生重叠
          if (xDistance < minNodeDistance) {
            // 计算需要移动的距离
            const offset = minNodeDistance - xDistance + nodeSize * 0.2;
            
            // 将右侧节点向右移动
            if (node.x < otherNode.x) {
              shiftSubtree(otherNode, offset);
            } else {
              shiftSubtree(node, offset);
            }
          }
        }
      }
    }
  };
  
  // 运行重叠检测和修复（进行两轮以处理连锁反应）
  detectAndFixOverlap();
  detectAndFixOverlap();
  
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
  // const treeWidth = maxX - minX; // 暂未使用
  const horizontalSpacing = nodeSize * (totalNodes > 15 ? 8 : 12);
  
  // 确保左侧有足够空间，将整个树向右移动
  const leftMarginNeeded = Math.abs(minX) + nodeSize * 3.5;
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
  
  // 最终再进行一次重叠检测
  detectAndFixOverlap();
}; 