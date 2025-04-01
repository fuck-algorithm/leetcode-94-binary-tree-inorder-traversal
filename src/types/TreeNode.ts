export class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;

  constructor(val: number, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// 用于D3可视化的树节点接口
export interface TreeNodeData {
  name: string;
  children?: TreeNodeData[];
  highlighted?: boolean;
}

// 将LeetCode的数组表示转换为TreeNode
export function arrayToTree(arr: (number | null)[]): TreeNode | null {
  if (!arr.length || arr[0] === null) return null;
  
  const root = new TreeNode(arr[0]);
  const queue: [TreeNode, number][] = [[root, 0]];
  
  while (queue.length) {
    const [node, index] = queue.shift()!;
    
    // 计算左子节点索引
    const leftIndex = 2 * index + 1;
    if (leftIndex < arr.length && arr[leftIndex] !== null) {
      node.left = new TreeNode(arr[leftIndex] as number);
      queue.push([node.left, leftIndex]);
    }
    
    // 计算右子节点索引
    const rightIndex = 2 * index + 2;
    if (rightIndex < arr.length && arr[rightIndex] !== null) {
      node.right = new TreeNode(arr[rightIndex] as number);
      queue.push([node.right, rightIndex]);
    }
  }
  
  return root;
}

// 将TreeNode转换为D3可以使用的格式
export function treeToD3Format(root: TreeNode | null): TreeNodeData | null {
  if (!root) return null;
  
  const result: TreeNodeData = {
    name: root.val.toString(),
  };
  
  const children: TreeNodeData[] = [];
  
  if (root.left) {
    children.push(treeToD3Format(root.left)!);
  }
  
  if (root.right) {
    children.push(treeToD3Format(root.right)!);
  }
  
  if (children.length) {
    result.children = children;
  }
  
  return result;
} 