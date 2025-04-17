import type { TreeNodeData } from '../../types/TreeNode';

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

// 图例项接口，支持普通图例和左右子树图例
export interface LegendItem {
  color: string;
  text: string;
  textLeft?: string;
  textRight?: string;
} 