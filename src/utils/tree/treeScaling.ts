import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { TreeDimensions } from './treeTypes';

/**
 * 计算树的缩放和平移，以适应指定的尺寸
 */
export const calculateTreeScale = (
  rootNode: d3.HierarchyPointNode<TreeNodeData>,
  dimensions: TreeDimensions,
  nodeSize: number,
  hasStackPanel = false
): { scale: number; translateX: number; translateY: number } => {
  // 计算树的边界
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  
  rootNode.descendants().forEach(node => {
    minX = Math.min(minX, node.x - nodeSize);
    maxX = Math.max(maxX, node.x + nodeSize);
    minY = Math.min(minY, node.y - nodeSize);
    maxY = Math.max(maxY, node.y + nodeSize);
  });
  
  // 计算树的实际宽度和高度
  const treeWidth = maxX - minX;
  const treeHeight = maxY - minY;
  
  // 计算有效维度，考虑栈面板，但减少额外边距
  const stackPanelWidth = hasStackPanel ? 280 : 10; // 减少非栈面板情况下的边距
  const effectiveWidth = (dimensions.effectiveWidth || dimensions.width) - stackPanelWidth;
  const effectiveHeight = (dimensions.effectiveHeight || dimensions.height) - nodeSize; // 减少垂直边距
  
  // 计算缩放比例，确保树完全适应可用空间
  const scaleX = effectiveWidth / treeWidth;
  const scaleY = effectiveHeight / treeHeight;
  const scale = Math.min(scaleX, scaleY) * 0.95; // 留出5%的边距，而不是之前的10%
  
  // 计算平移，使树居中
  // 向左调整以腾出栈面板空间
  const centerX = (effectiveWidth / 2);
  const centerY = (effectiveHeight / 2);
  
  // 移动树的位置，避免被栈面板覆盖
  const translateX = centerX - ((maxX + minX) / 2) * scale - (stackPanelWidth / 4);
  const translateY = centerY - ((maxY + minY) / 2) * scale + nodeSize / 2; // 减少垂直偏移
  
  return {
    scale,
    translateX,
    translateY
  };
}; 