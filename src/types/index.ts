export interface TreeNodeData {
  key: string;
  value: number | null;
  x?: number;
  y?: number;
  highlighted?: boolean;
  visited?: boolean;
  isLeftChild?: boolean;
  isRightChild?: boolean;
} 