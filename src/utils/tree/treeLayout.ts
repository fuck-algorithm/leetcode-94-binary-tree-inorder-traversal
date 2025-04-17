import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { TreeDimensions } from './treeTypes';
import { countNodes, determineTreeDepth } from './treeAnalysis';

/**
 * 动态计算节点大小
 */
export const calculateNodeSize = (data: TreeNodeData, dimensions: TreeDimensions): number => {
  const totalNodes = countNodes(data);
  const depth = determineTreeDepth(data);
  const effectiveWidth = dimensions.effectiveWidth || dimensions.width;
  const effectiveHeight = dimensions.effectiveHeight || dimensions.height;
  
  // 单节点树的特殊处理
  if (totalNodes === 1) {
    return Math.min(effectiveWidth, effectiveHeight) * 0.06; // 单节点时使用更合理的大小
  }
  
  // 计算基于节点数量和容器尺寸的节点大小
  // 对于节点较少的树，允许节点更大
  const baseSize = Math.min(
    effectiveWidth / (Math.pow(totalNodes, 0.5) * 2), 
    effectiveHeight / (depth * 2)
  );
  
  // 根据节点数量调整大小
  const sizeAdjustment = Math.min(1, 1.5 / Math.sqrt(totalNodes));
  
  // 确保节点大小合理
  return Math.min(Math.max(baseSize * sizeAdjustment, 18), 30);
};

/**
 * 移动子树中的所有节点
 */
export const shiftSubtree = (node: d3.HierarchyPointNode<TreeNodeData>, shiftX: number): void => {
  node.x += shiftX;
  // 增加偏移量以确保节点间隔更加明显
  if (shiftX > 0) {
    // 如果是向右移动，增加额外的空间
    shiftX += 5;
  } else if (shiftX < 0) {
    // 如果是向左移动，增加额外的空间
    shiftX -= 5;
  }
  
  if (node.children) {
    node.children.forEach(child => shiftSubtree(child, shiftX));
  }
}; 