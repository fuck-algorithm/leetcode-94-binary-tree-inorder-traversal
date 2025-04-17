import { TreeNodeData } from '../../types/TreeNode';

export interface TreeDimensions {
  width: number;
  height: number;
  effectiveWidth?: number;
  effectiveHeight?: number;
}

export interface TreeRenderOptions {
  highlightedNodeId?: string | null;
  visitedNodeIds?: string[];
  stackNodeIds?: string[];
  hasStackPanel?: boolean;
} 