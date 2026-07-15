import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { TreeDimensions, TreeRenderOptions, LegendItem } from './treeTypes';
import { countNodes } from './treeAnalysis';
import { calculateNodeSize, shiftSubtree } from './treeLayout';
import { optimizeTreeLayout } from './treeOptimization';
import { layoutTree, EngineLayout } from './treeEngine';
import { palette, nodeStrokeColor } from '../../theme/colors';

/**
 * 渲染二叉树
 */
export const renderTree = (
  svgElement: SVGSVGElement,
  data: TreeNodeData,
  dimensions: TreeDimensions,
  options: TreeRenderOptions
): void => {
  const { highlightedNodeId, visitedNodeIds = [], stackNodeIds = [], hasStackPanel = false } = options;
  
  // 清除之前的内容
  d3.select(svgElement).selectAll('*').remove();
  
  const svg = d3.select(svgElement);
  const totalNodes = countNodes(data);
  const nodeSize = calculateNodeSize(data, dimensions);
  
  // 计算有效宽度，考虑栈面板，更大化利用空间
  const stackPanelWidth = hasStackPanel ? 220 : 0; // 根据是否有栈面板调整宽度
  const effectiveWidth = (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? stackPanelWidth : 0);
  const effectiveHeight = dimensions.effectiveHeight || dimensions.height;
  
  // 计算树的布局尺寸，提高利用率
  const treeWidth = effectiveWidth * 0.98; // 利用更多水平空间
  const treeHeight = effectiveHeight * 0.98; // 利用更多垂直空间
  
  // 创建树形布局，动态调整节点间距
  const treeLayout = d3.tree<TreeNodeData>()
    .size([treeWidth, treeHeight])
    .nodeSize([
      // 水平间距 - 为不同大小的树提供适合的间距
      // 更大的间距有助于避免节点遮挡
      nodeSize * (totalNodes > 15 ? 5.5 : totalNodes > 7 ? 7.0 : 8.5), 
      // 垂直间距 - 稍微增加，提高层级区分度
      nodeSize * (totalNodes > 15 ? 3.0 : totalNodes > 7 ? 3.5 : 4.0)
    ]);
  
  // 转换数据为d3层次结构并应用布局
  const root = d3.hierarchy(data);
  
  // 确保左右子树的区分
  root.descendants().forEach(node => {
    if (node.parent) {
      // 如果是第一个子节点，标记为左子树
      if (node.parent.children && node.parent.children[0] === node) {
        (node as any).isLeftChild = true;
      }
      // 如果是第二个子节点，标记为右子树
      else if (node.parent.children && node.parent.children[1] === node) {
        (node as any).isRightChild = true;
      }
    }
  });
  
  // 应用树形布局
  const treeData = treeLayout(root);

  // 优化树布局
  optimizeTreeLayout(treeData, nodeSize, totalNodes);
  
  // 特别处理左子节点与线的潜在重叠
  const adjustLeftRightBalance = (node: d3.HierarchyPointNode<TreeNodeData>) => {
    if (!node.children || node.children.length === 0) return;
    
    // 检测是否有左子节点
    const hasLeftChild = node.children.some(child => (child as any).isLeftChild);
    // 检测是否有右子节点
    const hasRightChild = node.children.some(child => (child as any).isRightChild);
    
    // 如果只有左子节点，增加向左的额外偏移
    if (hasLeftChild && !hasRightChild) {
      const leftChild = node.children.find(child => (child as any).isLeftChild);
      if (leftChild) {
        const extraLeftOffset = nodeSize * 1.8;
        shiftSubtree(leftChild, -extraLeftOffset);
      }
    }
    
    // 如果只有右子节点，增加向右的额外偏移
    if (!hasLeftChild && hasRightChild) {
      const rightChild = node.children.find(child => (child as any).isRightChild);
      if (rightChild) {
        const extraRightOffset = nodeSize * 1.2;
        shiftSubtree(rightChild, extraRightOffset);
      }
    }
    
    // 递归处理所有子节点
    node.children.forEach(adjustLeftRightBalance);
  };
  
  // 应用左右平衡调整
  adjustLeftRightBalance(treeData);

  // 使用绘制引擎获取结构化布局
  const engineLayout: EngineLayout = layoutTree(data, dimensions, hasStackPanel);
  const { nodes: engNodes, links: engLinks, nodeRadius: r } = engineLayout;

  // defs：渐变定义
  const defs = svg.append('defs');
  const gradDefs = [
    { id: 'grad-default', from: '#64748B', to: '#475569' },
    { id: 'grad-current', from: '#EF4444', to: '#B91C1C' },
    { id: 'grad-visited', from: '#10B981', to: '#047857' },
    { id: 'grad-stack', from: '#F59E0B', to: '#B45309' },
  ];
  gradDefs.forEach((g) => {
    const grad = defs
      .append('linearGradient')
      .attr('id', g.id)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', g.from);
    grad.append('stop').attr('offset', '100%').attr('stop-color', g.to);
  });

  // 适配缩放与平移（基于引擎 bounds）
  const boundsWidth = engineLayout.bounds.maxX - engineLayout.bounds.minX;
  const boundsHeight = engineLayout.bounds.maxY - engineLayout.bounds.minY;
  const effW =
    (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? 220 : 4);
  const effH = (dimensions.effectiveHeight || dimensions.height) - 4;
  const scale = Math.min(effW / boundsWidth, effH / boundsHeight) * 0.96 || 1;
  const cx = (engineLayout.bounds.minX + engineLayout.bounds.maxX) / 2;
  const cy = (engineLayout.bounds.minY + engineLayout.bounds.maxY) / 2;
  const translateX = effW / 2 - cx * scale - (hasStackPanel ? 110 : 0);
  const translateY = effH / 2 - cy * scale;

  const g = svg
    .append('g')
    .attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);

  // 贝塞尔连线，左右子树分别用配色 token
  g.selectAll('.link')
    .data(engLinks)
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', (d) =>
      d.isLeft ? palette.linkLeft : d.isRight ? palette.linkRight : palette.linkDefault,
    )
    .attr('stroke-width', Math.max(1.5, 2.2 / scale))
    .attr('stroke-linecap', 'round')
    .attr('d', (d) => {
      const sx = d.source.x;
      const sy = d.source.y + r;
      const tx = d.target.x;
      const ty = d.target.y - r;
      const midY = (sy + ty) / 2;
      return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
    });

  // 节点组：圆角矩形 + 阴影
  const nodeGroups = g
    .selectAll('.node')
    .data(engNodes)
    .enter()
    .append('g')
    .attr('class', (d) => {
      let cls = 'node';
      if (visitedNodeIds && visitedNodeIds.includes(d.id)) cls += ' visited';
      if (highlightedNodeId === d.id) cls += ' current';
      if (stackNodeIds && stackNodeIds.includes(d.id)) cls += ' stack';
      return cls;
    })
    .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

  const rectW = r * 2.4;
  const rectH = r * 2;

  // 阴影底
  nodeGroups
    .append('rect')
    .attr('x', -rectW / 2 + 1.5)
    .attr('y', -rectH / 2 + 2)
    .attr('width', rectW)
    .attr('height', rectH)
    .attr('rx', r * 0.45)
    .attr('ry', r * 0.45)
    .attr('fill', 'rgba(0,0,0,0.25)')
    .attr('filter', 'blur(1px)');

  // 节点主体
  nodeGroups
    .append('rect')
    .attr('x', -rectW / 2)
    .attr('y', -rectH / 2)
    .attr('width', rectW)
    .attr('height', rectH)
    .attr('rx', r * 0.45)
    .attr('ry', r * 0.45)
    .attr('fill', (d) => {
      const isCur = highlightedNodeId === d.id;
      const isVis = !!(visitedNodeIds && visitedNodeIds.includes(d.id));
      const isStk = !!(stackNodeIds && stackNodeIds.includes(d.id));
      if (isCur) return 'url(#grad-current)';
      if (isVis) return 'url(#grad-visited)';
      if (isStk) return 'url(#grad-stack)';
      return 'url(#grad-default)';
    })
    .attr('stroke', (d) =>
      nodeStrokeColor(
        highlightedNodeId === d.id,
        !!(visitedNodeIds && visitedNodeIds.includes(d.id)),
        !!(stackNodeIds && stackNodeIds.includes(d.id)),
      ),
    )
    .attr('stroke-width', (d) =>
      highlightedNodeId === d.id
        ? Math.max(2.5, 3 / scale)
        : Math.max(1.2, 1.8 / scale),
    );

  // 节点文本
  const fontSize = Math.max(11, Math.min(15, 15 / scale));
  nodeGroups
    .append('text')
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('font-size', fontSize)
    .attr('font-weight', '700')
    .attr('fill', palette.textOnColor)
    .text((d) => (d.val !== null ? d.val : 'null'));
  
  // 为边添加标签 (左/右)，大树时隐藏以减少视觉混乱
  if (totalNodes <= 25) {
    g.selectAll('.edge-label')
      .data(engLinks)
      .enter()
      .append('text')
      .attr('class', 'edge-label')
      .attr('x', (d) => (d.source.x + d.target.x) / 2)
      .attr('y', (d) => (d.source.y + d.target.y) / 2 - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', Math.max(8, 8 / scale) * (totalNodes > 15 ? 0.8 : 1))
      .text((d) => {
        // 显示左/右标签
        if (d.isLeft) {
          return '左';
        } else if (d.isRight) {
          return '右';
        }
        return '';
      })
      .attr('fill', (d) => {
        // 左子树标签使用绿色，右子树标签使用红色
        if (d.isLeft) {
          return '#27ae60';
        } else if (d.isRight) {
          return '#e74c3c';
        }
        return '#7f8c8d';
      });
  }
  
  // 添加图例 - 移到右上角
  const legendFontSize = Math.max(8, Math.min(10, effectiveWidth / 80));
  const legendSize = Math.max(8, Math.min(10, effectiveWidth / 70));
  const legendSpacing = legendSize * 1.5;
  
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${effectiveWidth - legendSize * 9}, 2)`);
  
  // 图例项
  const legendItems: LegendItem[] = [
    { color: '#95a5a6', text: '未访问' },
    { color: '#e74c3c', text: '正在访问' },
    { color: '#3498db', text: '已访问' },
    { color: '#f39c12', text: '在栈中' },
  ];
  
  // 当节点数量较少时才显示左右子树图例
  if (totalNodes <= 25) {
    legendItems.push({ color: '#666', textLeft: '左', textRight: '右', text: '左/右子树' });
  }
  
  // 绘制图例
  legendItems.forEach((item, i) => {
    const legendItem = legend.append('g')
      .attr('transform', `translate(0, ${i * legendSpacing})`);
    
    if (item.textLeft && item.textRight) {
      // 为左右子树添加组合图例
      legendItem.append('line')
        .attr('x1', 0)
        .attr('y1', legendSize / 2)
        .attr('x2', legendSize)
        .attr('y2', legendSize / 2)
        .attr('stroke', item.color)
        .attr('stroke-width', 1.5);
      
      // 添加左右标识文字
      legendItem.append('text')
        .attr('x', legendSize / 4)
        .attr('y', legendSize / 2 - 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${legendFontSize * 0.8}px`)
        .attr('fill', '#27ae60')
        .text(item.textLeft);
      
      legendItem.append('text')
        .attr('x', legendSize * 3 / 4)
        .attr('y', legendSize / 2 - 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${legendFontSize * 0.8}px`)
        .attr('fill', '#e74c3c')
        .text(item.textRight);
    } else {
      legendItem.append('rect')
        .attr('width', legendSize)
        .attr('height', legendSize)
        .attr('fill', item.color)
        .attr('rx', 2)
        .attr('ry', 2);
        
      legendItem.append('text')
        .attr('x', legendSize + 5)
        .attr('y', legendSize / 2)
        .attr('dominant-baseline', 'central')
        .attr('font-size', `${legendFontSize}px`)
        .text(item.text);
    }
  });
}; 