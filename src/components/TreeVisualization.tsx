import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TreeNodeData } from '../types/TreeNode';

interface TreeVisualizationProps {
  data: TreeNodeData | null;
  width: number;
  height: number;
  highlightedNode?: number | null;  // 当前正在访问的节点
  visitedNodes?: number[];  // 已经访问过的节点列表
  stackNodes?: number[];    // 当前在栈中的节点列表
}

export default function TreeVisualization({ data, width, height, highlightedNode, visitedNodes = [], stackNodes = [] }: TreeVisualizationProps) {
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
      .nodeSize([nodeSize * (totalNodes > 15 ? 8 : 10), nodeSize * (totalNodes > 15 ? 5 : 6)]); // 增加节点间的水平间距，增强分离度
    
    // 转换数据为d3层次结构
    const root = d3.hierarchy(data);
    
    // 确保左右子树的区分，即使只有一个子节点
    // 标记每个节点是左子树还是右子树
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
    
    // 递归移动子树的所有节点
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
    
    // 调整子树的位置，防止重叠
    function adjustTreeLayout(node: d3.HierarchyPointNode<TreeNodeData>, level: number = 0, leftOffset: number = 0) {
      if (!node) return { width: 0, x: 0 };
      
      // 当前节点的位置信息
      let nodeInfo = { 
        width: nodeSize * 4, // 增加节点的最小宽度，避免窄树节点过近
        x: node.x 
      };
      
      // 存储子树信息
      const childrenInfo: { width: number, x: number }[] = [];
      
      // 如果有子节点，递归调整子节点位置
      if (node.children && node.children.length > 0) {
        let totalChildrenWidth = 0;
        let minChildX = Infinity;
        let maxChildX = -Infinity;
        
        // 为每个子树计算宽度
        node.children.forEach((child, index) => {
          // 递归调整子树
          const childInfo = adjustTreeLayout(child, level + 1, leftOffset + totalChildrenWidth);
          childrenInfo.push(childInfo);
          
          // 更新子树总宽度
          totalChildrenWidth += childInfo.width;
          
          // 更新子树的最小和最大x坐标
          minChildX = Math.min(minChildX, childInfo.x);
          maxChildX = Math.max(maxChildX, childInfo.x);
        });
        
        // 子树总宽度应该大于或等于当前节点宽度
        nodeInfo.width = Math.max(nodeInfo.width, totalChildrenWidth);
        
        // 计算子树间的额外间距
        const siblingSpacing = nodeSize * 8; // 增加子树间距，确保明显分离
        
        // 调整所有子节点的位置，避免重叠
        if (node.children.length > 1) {
          // 确保左右子树有足够的间距
          const leftChildIndex = node.children.findIndex(child => (child as any).isLeftChild);
          const rightChildIndex = node.children.findIndex(child => (child as any).isRightChild);
          
          if (leftChildIndex !== -1 && rightChildIndex !== -1) {
            const leftChild = node.children[leftChildIndex];
            const rightChild = node.children[rightChildIndex];
            
            // 计算中心位置
            const centerX = node.x;
            
            // 确保左子树位于父节点左侧，并且有足够距离
            if (leftChild.x >= centerX - siblingSpacing) {
              const shift = (centerX - siblingSpacing) - leftChild.x;
              shiftSubtree(leftChild, shift);
            }
            
            // 确保右子树位于父节点右侧，并且有足够距离
            if (rightChild.x <= centerX + siblingSpacing) {
              const shift = (centerX + siblingSpacing) - rightChild.x;
              shiftSubtree(rightChild, shift);
            }
            
            // 检查左右子树本身是否有重叠
            if (getMaxX(leftChild) >= getMinX(rightChild) - nodeSize * 4) {
              // 左子树最右边和右子树最左边之间有重叠，需要进一步分离
              const overlapAmount = getMaxX(leftChild) - getMinX(rightChild) + nodeSize * 4;
              shiftSubtree(leftChild, -overlapAmount / 2);
              shiftSubtree(rightChild, overlapAmount / 2);
            }
          }
        }
        // 如果只有一个子节点，确保它在正确的位置
        else if (node.children.length === 1) {
          const child = node.children[0];
          const isLeft = (child as any).isLeftChild;
          
          // 计算期望的位置
          const expectedX = isLeft ? 
            node.x - siblingSpacing : 
            node.x + siblingSpacing;
          
          // 调整位置
          const shift = expectedX - child.x;
          shiftSubtree(child, shift);
        }
      }
      
      return nodeInfo;
    }
    
    // 获取子树最左侧节点的x坐标
    function getMinX(node: d3.HierarchyPointNode<TreeNodeData>): number {
      if (!node) return Infinity;
      
      let minX = node.x;
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          minX = Math.min(minX, getMinX(child));
        });
      }
      
      return minX;
    }
    
    // 获取子树最右侧节点的x坐标
    function getMaxX(node: d3.HierarchyPointNode<TreeNodeData>): number {
      if (!node) return -Infinity;
      
      let maxX = node.x;
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          maxX = Math.max(maxX, getMaxX(child));
        });
      }
      
      return maxX;
    }
    
    // 调整树的布局
    adjustTreeLayout(treeData);
    
    // 二次检查和微调，避免子树间的重叠
    function avoidOverlaps(nodes: d3.HierarchyPointNode<TreeNodeData>[]) {
      // 按层级分组节点
      const nodesByLevel: {[level: number]: d3.HierarchyPointNode<TreeNodeData>[]} = {};
      
      nodes.forEach(node => {
        const level = node.depth;
        if (!nodesByLevel[level]) {
          nodesByLevel[level] = [];
        }
        nodesByLevel[level].push(node);
      });
      
      // 对每一层的节点进行处理
      Object.keys(nodesByLevel).forEach(levelStr => {
        const level = parseInt(levelStr);
        const levelNodes = nodesByLevel[level];
        
        // 按X坐标排序
        levelNodes.sort((a, b) => a.x - b.x);
        
        // 检查相邻节点间的距离
        for (let i = 1; i < levelNodes.length; i++) {
          const prevNode = levelNodes[i-1];
          const currNode = levelNodes[i];
          
          // 最小允许的水平间距 - 增加最小距离防止重叠
          const minDistance = nodeSize * 10; // 进一步增加同层节点间距
          
          // 如果间距不足，调整位置
          if (currNode.x - prevNode.x < minDistance) {
            const shift = minDistance - (currNode.x - prevNode.x);
            
            // 检查这两个节点是否有不同的父节点
            if (prevNode.parent !== currNode.parent) {
              // 不同父节点的子树可能有交叉，需要更大的分离
              const extraShift = nodeSize * 2;
              
              // 向右移动当前节点及其后的所有节点
              for (let j = i; j < levelNodes.length; j++) {
                shiftSubtree(levelNodes[j], shift + extraShift);
              }
            } else {
              // 同一父节点下的子树，标准分离
              for (let j = i; j < levelNodes.length; j++) {
                shiftSubtree(levelNodes[j], shift);
              }
            }
          }
        }
      });
      
      // 对连线进行额外检查，防止交叉
      verifyConnections(nodes);
    }
    
    // 验证连线，确保没有交叉
    function verifyConnections(nodes: d3.HierarchyPointNode<TreeNodeData>[]) {
      const links: {
        source: d3.HierarchyPointNode<TreeNodeData>;
        target: d3.HierarchyPointNode<TreeNodeData>;
        sourceX: number;
        sourceY: number;
        targetX: number;
        targetY: number;
      }[] = [];
      
      // 收集所有的连线信息
      nodes.forEach(node => {
        if (node.parent) {
          links.push({
            source: node.parent,
            target: node,
            sourceX: node.parent.x,
            sourceY: node.parent.y,
            targetX: node.x,
            targetY: node.y
          });
        }
      });
      
      // 检查每对连线是否有交叉
      for (let i = 0; i < links.length; i++) {
        for (let j = i + 1; j < links.length; j++) {
          const link1 = links[i];
          const link2 = links[j];
          
          // 跳过有共同端点的线段
          if (link1.source === link2.source || 
              link1.source === link2.target || 
              link1.target === link2.source || 
              link1.target === link2.target) {
            continue;
          }
          
          // 检测两条线段是否相交
          if (doLinesIntersect(
            link1.sourceX, link1.sourceY, link1.targetX, link1.targetY,
            link2.sourceX, link2.sourceY, link2.targetX, link2.targetY
          )) {
            // 找到交叉线段，移动其中一个节点
            const shift = nodeSize * 5;
            
            // 决定移动哪个节点
            if (link1.target.depth > link2.target.depth) {
              // 移动深度更大的节点
              if (link1.target.x < link2.target.x) {
                shiftSubtree(link1.target, -shift);
              } else {
                shiftSubtree(link1.target, shift);
              }
            } else {
              if (link2.target.x < link1.target.x) {
                shiftSubtree(link2.target, -shift);
              } else {
                shiftSubtree(link2.target, shift);
              }
            }
          }
        }
      }
    }
    
    // 检测两条线段是否相交
    function doLinesIntersect(
      x1: number, y1: number, x2: number, y2: number, 
      x3: number, y3: number, x4: number, y4: number
    ): boolean {
      // 向量叉积
      function ccw(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): boolean {
        return (y3 - y1) * (x2 - x1) > (y2 - y1) * (x3 - x1);
      }
      
      // 判断两条线段是否相交
      return ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) && 
             ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4);
    }
    
    // 避免节点重叠
    avoidOverlaps(treeData.descendants());
    
    // 最终检查和调整，确保左右子树位置明确
    treeData.descendants().forEach(node => {
      if (node.parent) {
        const siblingSpacing = nodeSize * 9; // 进一步增加左右子树之间的间距
        
        // 如果是左子树，确保位于父节点左侧
        if ((node as any).isLeftChild) {
          // 确保x坐标小于父节点
          if (node.x >= node.parent.x - siblingSpacing/2) {
            const shift = node.parent.x - siblingSpacing - node.x;
            shiftSubtree(node, shift);
          }
        }
        
        // 如果是右子树，确保位于父节点右侧
        if ((node as any).isRightChild) {
          // 确保x坐标大于父节点
          if (node.x <= node.parent.x + siblingSpacing/2) {
            const shift = node.parent.x + siblingSpacing - node.x;
            shiftSubtree(node, shift);
          }
        }
      }
    });
    
    // 计算适当的缩放和平移
    const nodes = treeData.descendants();
    const links = treeData.links();
    
    // 添加指示线，显示是左子树还是右子树
    const leftMarker = svg.append('defs')
      .append('marker')
      .attr('id', 'left-indicator')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#27ae60'); // 左子树标记颜色
    
    const rightMarker = svg.append('defs')
      .append('marker')
      .attr('id', 'right-indicator')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#e74c3c'); // 右子树标记颜色
    
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
        const nodeVal = d.data.name;
        
        // 当前正在访问的节点 - 黄色
        if (highlightedNode !== undefined && nodeVal === highlightedNode?.toString()) {
          return '#f1c40f'; // 黄色
        }
        
        // 已经访问过的节点 - 绿色
        if (visitedNodes.map(String).includes(nodeVal)) {
          return '#2ecc71'; // 绿色
        }
        
        // 在栈中的节点 - 蓝色
        if (stackNodes.map(String).includes(nodeVal)) {
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
  }, [data, dimensions, highlightedNode, visitedNodes, stackNodes]);
  
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