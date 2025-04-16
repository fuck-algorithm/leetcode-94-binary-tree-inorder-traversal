import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TreeNodeData } from '../types/TreeNode';

interface TreeVisualizationProps {
  data: TreeNodeData | null;
  width: number;
  height: number;
  highlightedNode?: number | null;  // 当前正在访问的节点
  visitedNodes?: number[];  // 已经访问过的节点列表
}

export default function TreeVisualization({ data, width, height, highlightedNode, visitedNodes = [] }: TreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  
  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ 
        width: Math.max(rect.width, 300), 
        height: Math.max(rect.height, 200) 
      });
    };
    
    // 初始更新
    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    
    // 添加窗口resize事件监听，处理窗口大小变化
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // 当dimensions变化时重新绘制树
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    // 清除之前的内容
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);
    
    // 获取树的节点数量，用于动态调整节点大小
    const countNodes = (node: TreeNodeData): number => {
      if (!node) return 0;
      let count = 1; // 当前节点
      if (node.children) {
        node.children.forEach(child => {
          count += countNodes(child);
        });
      }
      return count;
    };
    
    const totalNodes = countNodes(data);
    const depth = determineTreeDepth(data);
    
    // 动态计算节点大小和间距
    const dynamicNodeSize = () => {
      // 基于节点数量和容器尺寸计算合适的节点大小
      // 当节点很多时，节点应该更小
      const baseSize = Math.min(
        dimensions.width / (Math.pow(totalNodes, 0.6)), 
        dimensions.height / (depth * 2.5)
      );
      
      // 节点数量阈值，用于调整大小范围
      const sizeAdjustment = totalNodes > 20 ? 0.8 : 1;
      
      return Math.min(Math.max(baseSize * sizeAdjustment, 15), 30); // 限制最小和最大尺寸
    };
    
    const nodeSize = dynamicNodeSize();
    
    // 计算树的宽度，根据节点数量和容器尺寸
    const treeWidth = dimensions.width - nodeSize * 2;
    const treeHeight = dimensions.height - nodeSize * 2;
    
    // 创建树形布局
    const treeLayout = d3.tree<TreeNodeData>()
      .size([treeWidth, treeHeight])
      .nodeSize([nodeSize * (totalNodes > 15 ? 2.2 : 3), nodeSize * (totalNodes > 15 ? 3 : 4)]); // 根据节点数量调整节点间距
    
    // 转换数据为d3层次结构
    const root = d3.hierarchy(data);
    const treeData = treeLayout(root);
    
    // 计算适当的缩放和平移
    const nodes = treeData.descendants();
    const links = treeData.links();
    
    // 找出节点的边界
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });
    
    // 计算缩放因子和偏移量，确保树适合容器
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const padding = nodeSize;
    
    const scale = Math.min(
      (dimensions.width - padding * 2) / width,
      (dimensions.height - padding * 2) / height
    );
    
    // 为大型树调整缩放比例
    const finalScale = totalNodes > 15 ? scale * 0.8 : scale;
    
    const translateX = (dimensions.width - width * finalScale) / 2 - minX * finalScale;
    const translateY = padding - minY * finalScale;
    
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
      .attr('stroke', '#999')
      .attr('stroke-width', Math.max(1, 1.5 / finalScale)) // 根据缩放调整线宽
      .attr('d', d3.linkVertical<d3.HierarchyPointLink<TreeNodeData>, d3.HierarchyPointNode<TreeNodeData>>()
        .x((d) => d.x)
        .y((d) => d.y)
      );
    
    // 创建节点组
    const nodeGroups = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: d3.HierarchyPointNode<TreeNodeData>) => `translate(${d.x}, ${d.y})`);
    
    // 添加节点圆圈
    nodeGroups.append('circle')
      .attr('r', nodeSize / finalScale)
      .attr('fill', (d: d3.HierarchyPointNode<TreeNodeData>) => {
        const nodeVal = d.data.name;
        
        // 当前正在访问的节点 - 黄色
        if (highlightedNode !== undefined && nodeVal === highlightedNode?.toString()) {
          return '#f1c40f'; // 黄色
        }
        
        // 已经访问过的节点 - 绿色
        if (visitedNodes.map(String).includes(nodeVal)) {
          return '#2ecc71'; // 绿色
        }
        
        // 还未访问的节点 - 灰色
        return '#95a5a6'; // 灰色
      })
      .attr('stroke', '#333')
      .attr('stroke-width', Math.max(1, 1.5 / finalScale)); // 根据缩放调整线宽
    
    // 添加节点文本
    const fontSize = totalNodes > 15 ? 
      Math.max(10, nodeSize * 0.4) / finalScale : 
      Math.max(12, nodeSize * 0.5) / finalScale;
      
    nodeGroups.append('text')
      .attr('dy', '.3em')
      .attr('text-anchor', 'middle')
      .attr('font-size', `${fontSize}px`)
      .attr('font-weight', 'bold')
      .attr('fill', (d: d3.HierarchyPointNode<TreeNodeData>) => {
        // 为高亮节点使用白色文本，提高可读性
        if (highlightedNode !== undefined && d.data.name === highlightedNode?.toString()) {
          return 'white';
        }
        if (visitedNodes.map(String).includes(d.data.name)) {
          return 'white';
        }
        return 'white';
      })
      .text((d: d3.HierarchyPointNode<TreeNodeData>) => d.data.name);
    
    // 添加图例 - 移到右上角
    const legendFontSize = Math.max(9, Math.min(12, dimensions.width / 60));
    const legendSize = Math.max(10, Math.min(12, dimensions.width / 50));
    const legendSpacing = legendSize * 1.5;
    
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${dimensions.width - legendSize * 10}, 5)`);
    
    // 图例项
    const legendItems = [
      { color: '#95a5a6', text: '未访问' },
      { color: '#f1c40f', text: '正在访问' },
      { color: '#2ecc71', text: '已访问' }
    ];
    
    // 绘制图例
    legendItems.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * legendSpacing})`);
      
      legendItem.append('rect')
        .attr('width', legendSize)
        .attr('height', legendSize)
        .attr('fill', item.color)
        .attr('rx', 3)
        .attr('stroke', '#333')
        .attr('stroke-width', 1);
      
      legendItem.append('text')
        .attr('x', legendSize + 5)
        .attr('y', legendSize * 0.8)
        .attr('font-size', `${legendFontSize}px`)
        .text(item.text);
    });
    
  }, [data, dimensions, highlightedNode, visitedNodes]);
  
  // 计算树的深度
  const determineTreeDepth = (node: TreeNodeData | null): number => {
    if (!node) return 0;
    if (!node.children || node.children.length === 0) return 1;
    
    let maxChildDepth = 0;
    node.children.forEach(child => {
      const childDepth = determineTreeDepth(child);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    });
    
    return maxChildDepth + 1;
  };
  
  return (
    <div ref={containerRef} className="tree-visualization" style={{ width: '100%', height: '100%' }}>
      <svg 
        ref={svgRef} 
        width={dimensions.width} 
        height={dimensions.height} 
        style={{ overflow: 'visible' }}>
      </svg>
    </div>
  );
} 