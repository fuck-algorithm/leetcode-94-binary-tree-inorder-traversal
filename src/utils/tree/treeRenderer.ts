import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { TreeDimensions, TreeRenderOptions } from './treeTypes';
import { countNodes } from './treeAnalysis';
import { calculateNodeSize } from './treeLayout';
import { optimizeTreeLayout } from './treeOptimization';
import { calculateTreeScale } from './treeScaling';

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
  
  // 计算有效宽度，考虑栈面板，但减少边距
  const stackPanelWidth = 280; // 始终考虑栈面板的宽度
  const effectiveWidth = (dimensions.effectiveWidth || dimensions.width) - stackPanelWidth;
  const effectiveHeight = dimensions.effectiveHeight || dimensions.height;
  
  // 计算树的布局尺寸，增加利用率
  const treeWidth = effectiveWidth - nodeSize;
  const treeHeight = effectiveHeight * 0.95 - nodeSize; // 增加垂直利用率
  
  // 创建树形布局
  const treeLayout = d3.tree<TreeNodeData>()
    .size([treeWidth, treeHeight])
    .nodeSize([
      nodeSize * (totalNodes > 15 ? 7 : 10), // 减少水平间距
      nodeSize * (totalNodes > 15 ? 3.5 : 4.5)  // 减少垂直间距
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
  
  // 获取节点和连接线
  const nodes = treeData.descendants();
  const links = treeData.links();
  
  // 优化树布局
  optimizeTreeLayout(treeData, nodeSize, totalNodes);
  
  // 计算缩放比例
  const { scale: finalScale, translateX, translateY } = calculateTreeScale(
    treeData, dimensions, nodeSize, hasStackPanel
  );
  
  // 创建根容器并应用变换
  const g = svg.append('g')
    .attr('transform', `translate(${translateX}, ${translateY}) scale(${finalScale})`);
  
  // 绘制连接线
  g.selectAll('.link')
    .data(links)
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#666') // 统一使用相同的线段颜色
    .attr('stroke-width', Math.max(1, 2 / finalScale)) // 增加线宽使其更明显
    .attr('d', d3.linkVertical<d3.HierarchyPointLink<TreeNodeData>, d3.HierarchyPointNode<TreeNodeData>>()
      .x((d) => d.x)
      .y((d) => d.y)
    );
  
  // 绘制节点
  const nodeGroups = g.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', d => {
      let classes = 'node';
      
      // 添加已访问节点的高亮
      if (visitedNodeIds && visitedNodeIds.includes(d.data.nodeId || '')) {
        classes += ' visited';
      }
      
      // 添加当前节点的高亮
      if (highlightedNodeId === d.data.nodeId) {
        classes += ' current';
      }
      
      // 添加栈中节点的高亮
      if (stackNodeIds && stackNodeIds.includes(d.data.nodeId || '')) {
        classes += ' stack';
      }
      
      return classes;
    })
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
  
  // 使用不同的节点尺寸
  const circleRadius = totalNodes === 1 
    ? nodeSize * 0.8       // 单节点树使用较小的半径
    : (totalNodes <= 5 
        ? nodeSize * 0.9   // 小型树
        : nodeSize);       // 中大型树
  
  // 绘制节点圆形
  nodeGroups.append('circle')
    .attr('r', circleRadius)
    .attr('fill', d => {
      // 根据节点状态设置不同的颜色
      if (highlightedNodeId === d.data.nodeId) {
        return '#e74c3c'; // 当前访问的节点 - 红色
      } else if (visitedNodeIds && visitedNodeIds.includes(d.data.nodeId || '')) {
        return '#3498db'; // 已访问节点 - 蓝色
      } else if (stackNodeIds && stackNodeIds.includes(d.data.nodeId || '')) {
        return '#f39c12'; // 栈中节点 - 橙色
      }
      return '#95a5a6'; // 默认颜色 - 灰色
    })
    .attr('stroke', d => {
      // 根据节点状态设置边框颜色
      if (highlightedNodeId === d.data.nodeId) {
        return '#c0392b'; // 当前节点的边框 - 深红色
      } else if (visitedNodeIds && visitedNodeIds.includes(d.data.nodeId || '')) {
        return '#2980b9'; // 已访问节点的边框 - 深蓝色
      } else if (stackNodeIds && stackNodeIds.includes(d.data.nodeId || '')) {
        return '#d35400'; // 栈中节点的边框 - 深橙色
      }
      return '#7f8c8d'; // 默认边框颜色 - 深灰色
    })
    .attr('stroke-width', d => 
      highlightedNodeId === d.data.nodeId ? 
        Math.max(2, 3 / finalScale) : // 当前节点的边框更粗
        Math.max(1, 1.5 / finalScale)
    );
  
  // 绘制节点文本标签
  nodeGroups.append('text')
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('font-size', Math.max(12, Math.min(14, 14 / finalScale)))
    .text(d => d.data.val !== null ? d.data.val : 'null')
    .attr('fill', '#fff');
  
  // 为边添加标签 (左/右)
  g.selectAll('.edge-label')
    .data(links)
    .enter()
    .append('text')
    .attr('class', 'edge-label')
    .attr('x', d => (d.source.x + d.target.x) / 2)
    .attr('y', d => (d.source.y + d.target.y) / 2 - 5)
    .attr('text-anchor', 'middle')
    .attr('font-size', Math.max(10, 10 / finalScale))
    .text(d => {
      // 显示左/右标签
      if ((d.target as any).isLeftChild) {
        return '左';
      } else if ((d.target as any).isRightChild) {
        return '右';
      }
      return '';
    })
    .attr('fill', d => {
      // 左子树标签使用绿色，右子树标签使用红色
      if ((d.target as any).isLeftChild) {
        return '#27ae60';
      } else if ((d.target as any).isRightChild) {
        return '#e74c3c';
      }
      return '#7f8c8d';
    });
  
  // 添加图例 - 移到右上角
  const legendFontSize = Math.max(9, Math.min(12, effectiveWidth / 60));
  const legendSize = Math.max(10, Math.min(12, effectiveWidth / 50));
  const legendSpacing = legendSize * 1.5;
  
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${effectiveWidth - legendSize * 10}, 5)`);
  
  // 图例项
  const legendItems = [
    { color: '#95a5a6', text: '未访问' },
    { color: '#e74c3c', text: '正在访问' },
    { color: '#3498db', text: '已访问' },
    { color: '#f39c12', text: '在栈中' },
    { color: '#666', textLeft: '左', textRight: '右', text: '左/右子树' }
  ];
  
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
        .attr('rx', 3)
        .attr('stroke', '#333')
        .attr('stroke-width', 1);
    }
    
    legendItem.append('text')
      .attr('x', legendSize + 5)
      .attr('y', legendSize * 0.8)
      .attr('font-size', `${legendFontSize}px`)
      .text(item.text);
  });
}; 