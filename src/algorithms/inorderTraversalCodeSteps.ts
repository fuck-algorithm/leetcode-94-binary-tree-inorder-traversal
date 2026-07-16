import { TreeNode } from '../types/TreeNode';
import { TraversalStep } from './inorderTraversal';

/**
 * AC 代码行号映射（1-based），对应迭代的 AC 题解
 * 1: function inorderTraversal(root) {
 * 2:   const result = [];
 * 3:   const stack = [];
 * 4:   let current = root;
 * 5:   while (current || stack.length) {
 * 6:     while (current) {
 * 7:       stack.push(current);
 * 8:       current = current.left;
 * 9:     }
 * 10:    current = stack.pop();
 * 11:    result.push(current.val);
 * 12:    current = current.right;
 * 13:  }
 * 14:  return result;
 * 15: }
 */
export const ITERATIVE_CODE_LINES = [
  'function inorderTraversal(root) {',
  '  const result = [];',
  '  const stack = [];',
  '  let current = root;',
  '  while (current || stack.length) {',
  '    while (current) {',
  '      stack.push(current);',
  '      current = current.left;',
  '    }',
  '    current = stack.pop();',
  '    result.push(current.val);',
  '    current = current.right;',
  '  }',
  '  return result;',
  '}',
];

/** 递归版 AC 代码行号映射 */
export const RECURSIVE_CODE_LINES = [
  'function inorderTraversal(root) {',
  '  const result = [];',
  '  function dfs(node) {',
  '    if (!node) return;',
  '    dfs(node.left);',
  '    result.push(node.val);',
  '    dfs(node.right);',
  '  }',
  '  dfs(root);',
  '  return result;',
  '}',
];

/** Debug 变量内存视图项 */
export interface DebugVariable {
  name: string;
  value: string;
  type: 'node' | 'array' | 'number' | 'null';
  highlight?: boolean;
}

/** 调用栈帧 */
export interface CallStackFrame {
  functionName: string;
  nodeVal: number | null;
  depth: number;
  line: number;
}

/** 扩展的 Debug 步骤：在原 TraversalStep 上增加代码/内存/调用栈信息 */
export interface DebugTraversalStep extends TraversalStep {
  /** 当前高亮的 AC 代码行号（1-based） */
  codeLine: number;
  /** 当前可见的变量内存值 */
  variables: DebugVariable[];
  /** 当前调用栈 */
  callStack: CallStackFrame[];
}

/**
 * 将基础 TraversalStep[] 增强为 DebugTraversalStep[]
 * 根据 action 与 description 推断当前代码行、变量内存快照与调用栈。
 */
export function enrichStepsWithDebug(
  baseSteps: TraversalStep[],
  method: 'recursive' | 'iterative',
  root: TreeNode | null,
): DebugTraversalStep[] {
  return baseSteps.map((step) => {
    const isRec = method === 'recursive';
    let codeLine = 1;
    let callStack: CallStackFrame[] = [];

    if (step.action === 'push') {
      codeLine = isRec ? 5 : 7;
    } else if (step.action === 'pop') {
      codeLine = isRec ? 8 : 10;
    } else if (step.action === 'visit') {
      if (step.description.includes('加入结果')) {
        codeLine = isRec ? 6 : 11;
      } else if (step.description.includes('初始化')) {
        codeLine = 1;
      } else if (step.description.includes('左子节点') || step.description.includes('左子树')) {
        codeLine = isRec ? 5 : 8;
      } else {
        codeLine = isRec ? 4 : 6;
      }
    } else if (step.action === 'move_right') {
      codeLine = isRec ? 7 : 12;
    }

    // 调用栈：用 step.stackVals 反推帧
    callStack = step.stackVals.map((val, idx) => ({
      functionName: isRec ? 'dfs' : 'inorderTraversal',
      nodeVal: val,
      depth: idx + 1,
      line: codeLine,
    }));
    if (callStack.length === 0) {
      callStack = [{ functionName: 'inorderTraversal', nodeVal: null, depth: 0, line: codeLine }];
    }

    const variables: DebugVariable[] = [
      { name: 'root', value: root ? 'root' : 'null', type: root ? 'node' : 'null' },
      {
        name: 'current',
        value: step.currentVal !== null ? String(step.currentVal) : 'null',
        type: step.currentVal !== null ? 'node' : 'null',
        highlight: step.action === 'visit' || step.action === 'push',
      },
      {
        name: 'stack',
        value: step.stackVals.length
          ? `[${step.stackVals.map((v) => v).join(', ')}]`
          : '[]',
        type: 'array',
      },
      {
        name: 'result',
        value: step.result.length ? `[${step.result.join(', ')}]` : '[]',
        type: 'array',
        highlight: step.description.includes('加入结果'),
      },
    ];

    return { ...step, codeLine, variables, callStack };
  });
}

export function getCodeLines(method: 'recursive' | 'iterative'): string[] {
  return method === 'recursive' ? RECURSIVE_CODE_LINES : ITERATIVE_CODE_LINES;
}
