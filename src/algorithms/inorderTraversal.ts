import { TreeNode } from "../types/TreeNode";

// 递归实现二叉树的中序遍历
export function inorderTraversalRecursive(root: TreeNode | null): number[] {
  const result: number[] = [];
  
  function inorder(node: TreeNode | null) {
    if (!node) return;
    
    // 左子树
    inorder(node.left);
    
    // 根节点
    result.push(node.val);
    
    // 右子树
    inorder(node.right);
  }
  
  inorder(root);
  return result;
}

// 迭代实现二叉树的中序遍历
export function inorderTraversalIterative(root: TreeNode | null): number[] {
  const result: number[] = [];
  const stack: TreeNode[] = [];
  let current = root;
  
  while (current || stack.length) {
    // 一直遍历到最左边的节点
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    // 处理当前节点
    current = stack.pop()!;
    result.push(current.val);
    
    // 处理右子树
    current = current.right;
  }
  
  return result;
}

// 带栈状态跟踪的迭代中序遍历
export interface TraversalStep {
  stack: number[]; // 当前栈中节点的值
  current: number | null; // 当前正在处理的节点值
  result: number[]; // 当前的结果数组
  action: 'push' | 'pop' | 'visit' | 'move_right'; // 当前的操作类型
  description: string; // 操作的描述
}

export function inorderTraversalWithSteps(root: TreeNode | null): TraversalStep[] {
  const steps: TraversalStep[] = [];
  const result: number[] = [];
  const stack: TreeNode[] = [];
  let current = root;
  
  // 初始状态
  steps.push({
    stack: [],
    current: current?.val || null,
    result: [...result],
    action: 'visit',
    description: '开始遍历，当前节点是根节点'
  });
  
  while (current || stack.length) {
    // 一直遍历到最左边的节点
    while (current) {
      // 记录入栈操作
      stack.push(current);
      steps.push({
        stack: stack.map(node => node.val),
        current: current.val,
        result: [...result],
        action: 'push',
        description: `将节点 ${current.val} 入栈，继续向左遍历`
      });
      
      current = current.left;
      
      // 如果有左子节点，记录移动操作
      if (current) {
        steps.push({
          stack: stack.map(node => node.val),
          current: current.val,
          result: [...result],
          action: 'visit',
          description: `移动到左子节点 ${current.val}`
        });
      } else {
        // 没有左子节点，记录空节点
        steps.push({
          stack: stack.map(node => node.val),
          current: null,
          result: [...result],
          action: 'visit',
          description: '到达最左边，左子节点为空'
        });
      }
    }
    
    // 处理当前节点
    const node = stack.pop()!;
    steps.push({
      stack: stack.map(n => n.val),
      current: node.val,
      result: [...result],
      action: 'pop',
      description: `从栈中弹出节点 ${node.val}`
    });
    
    result.push(node.val);
    steps.push({
      stack: stack.map(n => n.val),
      current: node.val,
      result: [...result],
      action: 'visit',
      description: `访问节点 ${node.val}，将其加入结果`
    });
    
    // 处理右子树
    current = node.right;
    
    // 记录向右移动的操作
    if (current) {
      steps.push({
        stack: stack.map(n => n.val),
        current: current.val,
        result: [...result],
        action: 'move_right',
        description: `移动到右子节点 ${current.val}`
      });
    } else {
      steps.push({
        stack: stack.map(n => n.val),
        current: null,
        result: [...result],
        action: 'move_right',
        description: '右子节点为空，回到栈处理'
      });
    }
  }
  
  // 结束状态
  steps.push({
    stack: [],
    current: null,
    result: [...result],
    action: 'visit',
    description: '遍历完成'
  });
  
  return steps;
}

// 获取中序遍历的过程中的每一步状态 (用于可视化动画)
export function getInorderTraversalSteps(root: TreeNode | null): { node: TreeNode | null; result: number[] }[] {
  const steps: { node: TreeNode | null; result: number[] }[] = [];
  const result: number[] = [];
  
  function inorder(node: TreeNode | null) {
    if (!node) {
      steps.push({ node: null, result: [...result] });
      return;
    }
    
    // 访问左子树前记录当前状态
    steps.push({ node, result: [...result] });
    
    // 左子树
    inorder(node.left);
    
    // 访问根节点并记录状态
    result.push(node.val);
    steps.push({ node, result: [...result] });
    
    // 右子树
    inorder(node.right);
    
    // 访问完整个子树后记录状态
    steps.push({ node, result: [...result] });
  }
  
  inorder(root);
  return steps;
} 