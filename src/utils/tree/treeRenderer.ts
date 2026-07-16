import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { TreeDimensions, TreeRenderOptions, LegendItem } from './treeTypes';
import { countNodes } from './treeAnalysis';
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

  // 计算有效宽度，考虑栈面板，更大化利用空间
  const stackPanelWidth = hasStackPanel ? 220 : 0;
  const effectiveWidth = (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? stackPanelWidth : 0);

  // 使用绘制引擎获取结构化布局（bounds 已含节点半径边距）
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

  // 适配缩放与平移（基于引擎 bounds，bounds 已含节点半径边距，配合留白不再溢出）
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