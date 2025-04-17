import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { TreeDimensions } from './treeTypes';

/**
 * 计算树的缩放和平移，以最大化利用可用空间并避免左侧节点遮挡
 */
export const calculateTreeScale = (
  rootNode: d3.HierarchyPointNode<TreeNodeData>,
  dimensions: TreeDimensions,
  nodeSize: number,
  hasStackPanel = false
): { scale: number; translateX: number; translateY: number } => {
  // 计算树的边界，为左侧节点添加额外的边距
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  
  rootNode.descendants().forEach(node => {
    // 为左侧节点添加额外的边距，避免遮挡
    const leftExtraMargin = (node as any).isLeftChild ? nodeSize * 0.5 : 0;
    minX = Math.min(minX, node.x - nodeSize - leftExtraMargin);
    maxX = Math.max(maxX, node.x + nodeSize);
    minY = Math.min(minY, node.y - nodeSize);
    maxY = Math.max(maxY, node.y + nodeSize);
  });
  
  // 计算树的实际宽度和高度
  const treeWidth = maxX - minX;
  const treeHeight = maxY - minY;
  
  // 检查树是否偏向左侧
  const isLeftHeavy = Math.abs(minX) > maxX;
  
  // 计算有效维度，考虑栈面板和是否偏左
  const stackPanelWidth = hasStackPanel ? 220 : 0;
  
  // 如果树偏左，为左侧预留更多空间
  const leftMarginExtra = isLeftHeavy ? nodeSize * 3 : 0;
  
  // 根据栈面板和树的偏向性，计算有效宽度
  const effectiveWidth = (dimensions.effectiveWidth || dimensions.width) - 
                        (hasStackPanel ? stackPanelWidth : 4) - leftMarginExtra;
  
  const effectiveHeight = (dimensions.effectiveHeight || dimensions.height) - 4;
  
  // 计算缩放比例，确保树完全适应可用空间
  const scaleX = effectiveWidth / treeWidth;
  const scaleY = effectiveHeight / treeHeight;
  
  // 使用更接近1的比例，提供更自然的显示效果
  const scale = Math.min(scaleX, scaleY) * 0.98; // 略微减小以提供更多边距
  
  // 计算基本平移
  const centerX = (effectiveWidth / 2);
  const centerY = (effectiveHeight / 2);
  
  // 根据树的结构优化平移
  let translateX;
  
  if (isLeftHeavy) {
    // 如果树偏左，确保左侧有足够空间
    translateX = centerX - ((maxX + minX) / 2) * scale + leftMarginExtra / 2;
  } else {
    // 正常居中，但为栈面板调整
    const stackOffset = hasStackPanel ? (stackPanelWidth / 3) : 0;
    translateX = centerX - ((maxX + minX) / 2) * scale - stackOffset;
  }
  
  const translateY = centerY - ((maxY + minY) / 2) * scale;
  
  // 确保translateX不会太小，防止树被推到太左边
  translateX = Math.max(translateX, nodeSize * 1.5);
  
  return {
    scale,
    translateX,
    translateY
  };
}; 