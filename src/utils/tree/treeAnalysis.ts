import { TreeNodeData } from '../../types/TreeNode';

/**
 * 计算树的深度
 */
export const determineTreeDepth = (node: TreeNodeData | null): number => {
  if (!node) return 0;
  if (!node.children || node.children.length === 0) return 1;
  
  let maxChildDepth = 0;
  node.children.forEach(child => {
    const childDepth = determineTreeDepth(child);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  });
  
  return maxChildDepth + 1;
};

/**
 * 计算树的节点数量
 */
export const countNodes = (node: TreeNodeData): number => {
  if (!node) return 0;
  let count = 1; // 当前节点
  if (node.children) {
    node.children.forEach(child => {
      count += countNodes(child);
    });
  }
  return count;
}; 