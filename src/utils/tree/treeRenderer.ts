import * as d3 from 'd3';
import { TreeNodeData } from '../../types/TreeNode';
import { TreeDimensions, TreeRenderOptions, LegendItem } from './treeTypes';
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
      nodeSize * (totalNodes > 15 ? 4.5 : totalNodes > 7 ? 6.0 : 7.5), 
      // 垂直间距 - 稍微增加，提高层级区分度
      nodeSize * (totalNodes > 15 ? 2.8 : totalNodes > 7 ? 3.2 : 3.8)
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
  
  // 计算缩放比例，提高利用率
  const { scale: finalScale, translateX, translateY } = calculateTreeScale(
    treeData, dimensions, nodeSize, hasStackPanel
  );
  
  // 创建根容器并应用变换
  const g = svg.append('g')
    .attr('transform', `translate(${translateX}, ${translateY}) scale(${finalScale})`);
  
  // 绘制连接线，使用适合于缩放的线宽
  g.selectAll('.link')
    .data(links)
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#666') 
    .attr('stroke-width', Math.max(1, 1.5 / finalScale)) // 根据缩放调整线宽
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
  const circleRadius = nodeSize * (totalNodes <= 3 ? 0.8 : 
                                   totalNodes <= 10 ? 0.75 : 
                                   totalNodes <= 20 ? 0.7 : 0.65);
  
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
        Math.max(2, 2.5 / finalScale) : // 当前节点的边框更粗
        Math.max(1, 1.5 / finalScale)   // 根据缩放调整边框宽度
    );
  
  // 绘制节点文本标签，根据节点数量调整大小
  const fontSize = Math.max(10, Math.min(14, 14 / finalScale)) * 
                   (totalNodes > 15 ? 0.85 : 1);
  
  nodeGroups.append('text')
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('font-size', fontSize)
    .text(d => d.data.val !== null ? d.data.val : 'null')
    .attr('fill', '#fff');
  
  // 为边添加标签 (左/右)，大树时隐藏以减少视觉混乱
  if (totalNodes <= 25) {
    g.selectAll('.edge-label')
      .data(links)
      .enter()
      .append('text')
      .attr('class', 'edge-label')
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2 - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', Math.max(8, 8 / finalScale) * (totalNodes > 15 ? 0.8 : 1))
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