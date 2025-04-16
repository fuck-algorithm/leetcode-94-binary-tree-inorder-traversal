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
  stack: string[]; // 当前栈中节点的ID
  stackVals: number[]; // 当前栈中节点的值（用于显示）
  currentId: string | null; // 当前正在处理的节点ID
  currentVal: number | null; // 当前正在处理的节点值
  result: number[]; // 当前的结果数组
  action: 'push' | 'pop' | 'visit' | 'move_right'; // 当前的操作类型
  description: string; // 操作的描述
  visitedIds: string[]; // 已访问节点的ID列表
}

export function inorderTraversalWithSteps(root: TreeNode | null): TraversalStep[] {
  const steps: TraversalStep[] = [];
  const result: number[] = [];
  const stack: TreeNode[] = [];
  const visitedIds: string[] = []; // 跟踪已访问的节点ID
  let current = root;
  
  // 步骤1：初始化
  steps.push({
    stack: [],
    stackVals: [],
    currentId: null,
    currentVal: null,
    result: [],
    visitedIds: [],
    action: 'visit',
    description: '初始化：展示二叉树结构、空栈和空结果'
  });
  
  // 如果根节点为空，直接返回
  if (!root) {
    steps.push({
      stack: [],
      stackVals: [],
      currentId: null,
      currentVal: null,
      result: [],
      visitedIds: [],
      action: 'visit',
      description: '树为空，遍历结束'
    });
    return steps;
  }
  
  // 步骤2：访问根节点
  steps.push({
    stack: [],
    stackVals: [],
    currentId: root.id,
    currentVal: root.val,
    result: [],
    visitedIds: [],
    action: 'visit',
    description: '开始遍历，当前节点是根节点'
  });
  
  // 主遍历过程
  current = root; // 确保从根节点开始
  while (current || stack.length) {
    // 一直遍历到最左边的节点
    while (current) {
      // 将当前节点入栈
      stack.push(current);
      steps.push({
        stack: stack.map(node => node.id),
        stackVals: stack.map(node => node.val),
        currentId: current.id,
        currentVal: current.val,
        result: [...result],
        visitedIds: [...visitedIds],
        action: 'push',
        description: `将节点 ${current.val} (ID: ${current.id.substring(0, 6)}...) 入栈，准备遍历左子树`
      });
      
      // 检查是否有左子节点
      if (current.left) {
        // 记录当前节点，方便调试
        const parentNode = current;
        
        // 有左子节点，移动到左子节点
        current = current.left;
        steps.push({
          stack: stack.map(node => node.id),
          stackVals: stack.map(node => node.val),
          currentId: current.id,
          currentVal: current.val,
          result: [...result],
          visitedIds: [...visitedIds],
          action: 'visit',
          description: `访问节点 ${parentNode.val} (ID: ${parentNode.id.substring(0, 6)}...) 的左子节点 ${current.val} (ID: ${current.id.substring(0, 6)}...)`
        });
      } else {
        // 没有左子节点，记录空节点
        steps.push({
          stack: stack.map(node => node.id),
          stackVals: stack.map(node => node.val),
          currentId: current.id,
          currentVal: current.val,
          result: [...result],
          visitedIds: [...visitedIds],
          action: 'visit',
          description: `节点 ${current.val} (ID: ${current.id.substring(0, 6)}...) 的左子树为空，准备访问当前节点`
        });
        break; // 退出内层循环，处理当前节点
      }
    }
    
    // 从栈中弹出节点并访问
    const node = stack.pop()!;
    steps.push({
      stack: stack.map(n => n.id),
      stackVals: stack.map(n => n.val),
      currentId: node.id,
      currentVal: node.val,
      result: [...result],
      visitedIds: [...visitedIds],
      action: 'pop',
      description: `从栈中弹出节点 ${node.val} (ID: ${node.id.substring(0, 6)}...)，准备访问`
    });
    
    // 访问当前节点，加入结果
    result.push(node.val);
    visitedIds.push(node.id); // 记录已访问的节点ID
    steps.push({
      stack: stack.map(n => n.id),
      stackVals: stack.map(n => n.val),
      currentId: node.id,
      currentVal: node.val,
      result: [...result],
      visitedIds: [...visitedIds],
      action: 'visit',
      description: `访问节点 ${node.val} (ID: ${node.id.substring(0, 6)}...)，将其加入结果`
    });
    
    // 检查是否有右子节点
    if (node.right) {
      // 有右子节点，移动到右子节点
      current = node.right;
      steps.push({
        stack: stack.map(n => n.id),
        stackVals: stack.map(n => n.val),
        currentId: current.id,
        currentVal: current.val,
        result: [...result],
        visitedIds: [...visitedIds],
        action: 'move_right',
        description: `访问节点 ${node.val} (ID: ${node.id.substring(0, 6)}...) 的右子节点 ${current.val} (ID: ${current.id.substring(0, 6)}...)`
      });
    } else {
      // 没有右子节点
      current = null;
      if (stack.length > 0) {
        steps.push({
          stack: stack.map(n => n.id),
          stackVals: stack.map(n => n.val),
          currentId: null,
          currentVal: null,
          result: [...result],
          visitedIds: [...visitedIds],
          action: 'move_right',
          description: `节点 ${node.val} (ID: ${node.id.substring(0, 6)}...) 的右子树为空，回溯到上一个节点`
        });
      } else {
        steps.push({
          stack: [],
          stackVals: [],
          currentId: null,
          currentVal: null,
          result: [...result],
          visitedIds: [...visitedIds],
          action: 'move_right',
          description: `节点 ${node.val} (ID: ${node.id.substring(0, 6)}...) 的右子树为空，栈已空，准备结束遍历`
        });
      }
    }
  }
  
  // 步骤8：结束遍历
  steps.push({
    stack: [],
    stackVals: [],
    currentId: null,
    currentVal: null,
    result: [...result],
    visitedIds: [...visitedIds],
    action: 'visit',
    description: `遍历完成，结果为 [${result.join(', ')}]`
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