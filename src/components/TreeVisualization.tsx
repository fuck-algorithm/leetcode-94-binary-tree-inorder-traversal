import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TreeNodeData } from '../types/TreeNode';

interface TreeVisualizationProps {
  data: TreeNodeData | null;
  width: number;
  height: number;
  highlightedNodeId?: string | null;  // 修改为使用节点ID
  visitedNodeIds?: string[];  // 修改为使用节点ID列表
  stackNodeIds?: string[];    // 修改为使用节点ID列表
}

export default function TreeVisualization({ data, width, height, highlightedNodeId, visitedNodeIds = [], stackNodeIds = [] }: TreeVisualizationProps) {
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
    
    // 修改动态计算节点大小和间距的方法，以更好地利用可用空间
    const dynamicNodeSize = () => {
      // 计算基于节点数量和容器尺寸的节点大小
      // 对于节点较少的树，允许节点更大
      const baseSize = Math.min(
        dimensions.width / (Math.pow(totalNodes, 0.5)), 
        dimensions.height / (depth * 2)
      );
      
      // 根据节点数量调整大小
      const sizeAdjustment = Math.min(1, 1.5 / Math.sqrt(totalNodes));
      
      // 确保节点大小合理
      return Math.min(Math.max(baseSize * sizeAdjustment, 18), 35);
    };
    
    const nodeSize = dynamicNodeSize();
    
    // 计算树的布局尺寸，充分利用容器空间
    const treeWidth = dimensions.width - nodeSize * 2;
    const treeHeight = dimensions.height - nodeSize * 2;
    
    // 创建树形布局，使用调整后的尺寸和间距
    const treeLayout = d3.tree<TreeNodeData>()
      .size([treeWidth, treeHeight])
      .nodeSize([
        nodeSize * (totalNodes > 15 ? 6 : 8), // 水平间距
        nodeSize * (totalNodes > 15 ? 4 : 5)  // 垂直间距
      ]);
    
    // 转换数据为d3层次结构并应用布局
    const root = d3.hierarchy(data);
    
    // 确保左右子树的区分，即使只有一个子节点
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
    
    // 确保在x方向上更好地分散节点
    const nodes = treeData.descendants();
    const links = treeData.links();
    
    // 更强大的子树移动函数，可以平移整个子树
    function shiftSubtree(node: d3.HierarchyPointNode<TreeNodeData>, shiftAmount: number) {
      if (!node) return;
      
      // 移动当前节点
      node.x += shiftAmount;
      
      // 递归移动所有子节点
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          shiftSubtree(child, shiftAmount);
        });
      }
    }
    
    // 优化重叠问题的处理
    function optimizeTreeLayout(rootNode: d3.HierarchyPointNode<TreeNodeData>) {
      // 自底向上处理每一层节点
      const nodesByDepth: d3.HierarchyPointNode<TreeNodeData>[][] = [];
      
      // 按层收集节点
      rootNode.descendants().forEach(node => {
        const depth = node.depth;
        if (!nodesByDepth[depth]) {
          nodesByDepth[depth] = [];
        }
        nodesByDepth[depth].push(node);
      });
      
      // 从叶子节点开始处理
      for (let depth = nodesByDepth.length - 1; depth > 0; depth--) {
        const nodesAtDepth = nodesByDepth[depth];
        
        // 对每层的节点，按x坐标排序
        nodesAtDepth.sort((a, b) => a.x - b.x);
        
        // 处理可能的重叠
        for (let i = 1; i < nodesAtDepth.length; i++) {
          const currentNode = nodesAtDepth[i];
          const prevNode = nodesAtDepth[i - 1];
          
          // 计算最小所需间距 (根据树的大小动态调整)
          const minSpacing = nodeSize * (totalNodes > 15 ? 3 : 4);
          
          // 检查是否需要调整
          if (currentNode.x - prevNode.x < minSpacing) {
            // 需要右移当前节点及其子树
            const shift = minSpacing - (currentNode.x - prevNode.x);
            shiftSubtree(currentNode, shift);
          }
        }
      }
      
      // 确保左右子树的平衡
      nodesByDepth.forEach(nodesAtDepth => {
        nodesAtDepth.forEach(node => {
          if (node.children && node.children.length === 2) {
            const leftChild = node.children[0];
            const rightChild = node.children[1];
            
            // 确保左子节点在父节点左侧，右子节点在父节点右侧
            if (leftChild.x >= node.x) {
              const shift = (node.x - nodeSize) - leftChild.x;
              shiftSubtree(leftChild, shift);
            }
            
            if (rightChild.x <= node.x) {
              const shift = (node.x + nodeSize) - rightChild.x;
              shiftSubtree(rightChild, shift);
            }
          }
        });
      });
    }
    
    // 应用优化
    optimizeTreeLayout(treeData);
    
    // 找出节点的边界，以便缩放整个树以适应容器
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });
    
    // 计算缩放因子，确保树充分利用容器空间
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const padding = nodeSize;
    
    // 计算合适的缩放比例，以充分利用可用空间
    const scale = Math.min(
      (dimensions.width - padding * 2) / width,
      (dimensions.height - padding * 2) / height
    );
    
    // 优化缩放因子，确保树不会超出边界但又能最大限度利用空间
    // 为大型树增加额外空间，避免拥挤
    const finalScale = totalNodes > 15 ? scale * 0.9 : scale * 0.95;
    
    // 计算居中位置的偏移量
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
      .attr('stroke', '#666') // 统一使用相同的线段颜色
      .attr('stroke-width', Math.max(1, 2 / finalScale)) // 增加线宽使其更明显
      .attr('d', d3.linkVertical<d3.HierarchyPointLink<TreeNodeData>, d3.HierarchyPointNode<TreeNodeData>>()
        .x((d) => d.x)
        .y((d) => d.y)
      );
    
    // 添加左右子树标签
    nodes.forEach(node => {
      if (node.parent) {
        if ((node as any).isLeftChild) {
          g.append('text')
            .attr('x', (node.x + node.parent.x) / 2)
            .attr('y', (node.y + node.parent.y) / 2 - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', `${Math.max(9, nodeSize * 0.35) / finalScale}px`)
            .attr('fill', '#27ae60')
            .text('左');
        }
        if ((node as any).isRightChild) {
          g.append('text')
            .attr('x', (node.x + node.parent.x) / 2)
            .attr('y', (node.y + node.parent.y) / 2 - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', `${Math.max(9, nodeSize * 0.35) / finalScale}px`)
            .attr('fill', '#e74c3c')
            .text('右');
        }
        // 为唯一子节点添加标签
        if (node.parent.children && node.parent.children.length === 1) {
          const label = (node as any).isLeftChild ? '左' : '右';
          const color = (node as any).isLeftChild ? '#27ae60' : '#e74c3c';
          g.append('text')
            .attr('x', (node.x + node.parent.x) / 2)
            .attr('y', (node.y + node.parent.y) / 2 - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', `${Math.max(9, nodeSize * 0.35) / finalScale}px`)
            .attr('fill', color)
            .text(label);
        }
      }
    });
    
    // 创建节点组
    const nodeGroups = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: d3.HierarchyPointNode<TreeNodeData>) => `translate(${d.x}, ${d.y})`);
    
    // 添加左右子树标识
    nodeGroups.each(function(d: any) {
      const group = d3.select(this);
      if (d.isLeftChild) {
        group.append('circle')
          .attr('r', nodeSize / finalScale * 1.1)
          .attr('fill', 'none')
          .attr('stroke', '#27ae60')
          .attr('stroke-width', 0.8 / finalScale)
          .attr('opacity', 0.3);
      }
      if (d.isRightChild) {
        group.append('circle')
          .attr('r', nodeSize / finalScale * 1.1)
          .attr('fill', 'none')
          .attr('stroke', '#e74c3c')
          .attr('stroke-width', 0.8 / finalScale)
          .attr('opacity', 0.3);
      }
    });
    
    // 添加节点圆圈
    nodeGroups.append('circle')
      .attr('r', nodeSize / finalScale)
      .attr('fill', (d: d3.HierarchyPointNode<TreeNodeData>) => {
        const nodeId = d.data.nodeId;
        
        // 当前正在访问的节点 - 黄色
        if (highlightedNodeId !== undefined && nodeId === highlightedNodeId) {
          return '#f1c40f'; // 黄色
        }
        
        // 已经访问过的节点 - 绿色
        if (visitedNodeIds.includes(nodeId)) {
          return '#2ecc71'; // 绿色
        }
        
        // 在栈中的节点 - 蓝色
        if (stackNodeIds.includes(nodeId)) {
          return '#3498db'; // 蓝色
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
        if (highlightedNodeId !== undefined && d.data.nodeId === highlightedNodeId) {
          return 'white';
        }
        if (visitedNodeIds.includes(d.data.nodeId)) {
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
      { color: '#2ecc71', text: '已访问' },
      { color: '#3498db', text: '在栈中' },
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
  }, [data, dimensions, highlightedNodeId, visitedNodeIds, stackNodeIds]);
  
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