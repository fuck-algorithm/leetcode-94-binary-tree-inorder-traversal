import { useEffect, useRef, useState } from 'react';
import { TreeNodeData } from '../types/TreeNode';
import { renderTree } from '../utils/tree/treeRenderer';
import './TreeVisualization/styles.css';

interface TreeVisualizationProps {
  data: TreeNodeData | null;
  width?: number;
  height?: number;
  highlightedNodeId?: string | null;
  visitedNodeIds?: string[];
  stackNodeIds?: string[];
}

export default function TreeVisualization({ 
  data, 
  width = 800, 
  height = 600, 
  highlightedNodeId, 
  visitedNodeIds = [], 
  stackNodeIds = [] 
}: TreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ 
    width, 
    height,
    effectiveWidth: width,
    effectiveHeight: height
  });
  
  // 监听容器大小变化并最大化利用空间
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(rect.width, 100);
      const newHeight = Math.max(rect.height, 100);
      
      // 最大化利用可用空间，几乎不设置内边距
      const effectiveWidth = newWidth - 5;
      const effectiveHeight = newHeight - 5;
      
      setDimensions({
        width: newWidth,
        height: newHeight,
        effectiveWidth,
        effectiveHeight
      });
    };
    
    // 初始更新
    updateDimensions();
    
    const resizeObserver = new ResizeObserver(() => {
      // 使用requestAnimationFrame减少过度重绘
      window.requestAnimationFrame(updateDimensions);
    });
    resizeObserver.observe(containerRef.current);
    
    // 添加窗口resize事件监听
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // 当数据或尺寸变化时渲染树
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    // 使用工具函数渲染树并传递栈面板信息
    renderTree(svgRef.current, data, dimensions, {
      highlightedNodeId,
      visitedNodeIds,
      stackNodeIds,
      hasStackPanel: stackNodeIds && stackNodeIds.length > 0
    });
    
  }, [data, dimensions, highlightedNodeId, visitedNodeIds, stackNodeIds]);
  
  return (
    <div 
      ref={containerRef} 
      className="tree-visualization-container"
      style={{ width: '100%', height: '100%' }}
    >
      <svg 
        ref={svgRef} 
        width="100%" 
        height="100%" 
        className="tree-visualization-svg"
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
} 