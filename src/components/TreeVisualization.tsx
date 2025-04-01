import { useEffect, useRef } from 'react';
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
  
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    // 清除之前的内容
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);
    
    // 创建树形布局
    const treeLayout = d3.tree<TreeNodeData>()
      .size([width - 100, height - 100])
      .nodeSize([70, 70]);
    
    // 转换数据为d3层次结构
    const root = d3.hierarchy(data);
    const treeData = treeLayout(root);
    
    // 绘制连接线
    const links = svg.append('g')
      .attr('transform', `translate(50, 50)`)
      .selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .attr('d', d3.linkVertical<d3.HierarchyPointLink<TreeNodeData>, d3.HierarchyPointNode<TreeNodeData>>()
        .x((d) => d.x)
        .y((d) => d.y)
      );
    
    // 创建节点组
    const nodes = svg.append('g')
      .attr('transform', `translate(50, 50)`)
      .selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: d3.HierarchyPointNode<TreeNodeData>) => `translate(${d.x}, ${d.y})`);
    
    // 添加节点圆圈
    nodes.append('circle')
      .attr('r', 25)
      .attr('fill', (d: d3.HierarchyPointNode<TreeNodeData>) => {
        const nodeVal = d.data.name;
        
        // 当前正在访问的节点 - 黄色
        if (highlightedNode !== undefined && nodeVal === highlightedNode?.toString()) {
          return '#f1c40f'; // 黄色
        }
        
        // 已经访问过的节点 - 红色
        if (visitedNodes.map(String).includes(nodeVal)) {
          return '#e74c3c'; // 红色
        }
        
        // 还未访问的节点 - 绿色
        return '#2ecc71'; // 绿色
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5);
    
    // 添加节点文本
    nodes.append('text')
      .attr('dy', '.3em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
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
    
    // 添加图例
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 120}, 20)`);
    
    // 图例项
    const legendItems = [
      { color: '#2ecc71', text: '未访问' },
      { color: '#f1c40f', text: '正在访问' },
      { color: '#e74c3c', text: '已访问' }
    ];
    
    // 绘制图例
    legendItems.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);
      
      legendItem.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color)
        .attr('rx', 3)
        .attr('stroke', '#333')
        .attr('stroke-width', 1);
      
      legendItem.append('text')
        .attr('x', 25)
        .attr('y', 12)
        .attr('font-size', '12px')
        .text(item.text);
    });
    
  }, [data, width, height, highlightedNode, visitedNodes]);
  
  return (
    <div className="tree-visualization">
      <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        style={{ overflow: 'visible' }}>
      </svg>
    </div>
  );
} 