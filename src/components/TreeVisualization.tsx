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
  
  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(rect.width, 100);
      const newHeight = Math.max(rect.height, 100);
      
      // 使用完整的空间，设置少量的内边距以避免节点被裁剪
      const effectiveWidth = newWidth - 20;
      const effectiveHeight = newHeight - 20;
      
      setDimensions({
        width: newWidth,
        height: newHeight,
        effectiveWidth,
        effectiveHeight
      });
    };
    
    // 初始更新
    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
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
    
    // 使用工具函数渲染树
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
    >
      <svg 
        ref={svgRef} 
        width="100%" 
        height="100%" 
        className="tree-visualization-svg"
      />
    </div>
  );
} 