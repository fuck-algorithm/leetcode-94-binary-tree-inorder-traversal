import React from 'react';
import './StackVisualization.css';

interface StackVisualizationProps {
  stack: number[];
  currentNode: number | null;
  action: 'push' | 'pop' | 'visit' | 'move_right';
  description: string;
}

const StackVisualization: React.FC<StackVisualizationProps> = ({ 
  stack, 
  currentNode, 
  action,
  description 
}) => {
  return (
    <div className="stack-visualization">
      <h3>栈状态</h3>
      <div className="stack-container">
        {stack.length === 0 ? (
          <div className="empty-stack">栈为空</div>
        ) : (
          <>
            <div className="stack-elements">
              {stack.map((element, index) => (
                <div 
                  key={`${element}-${index}`} 
                  className="stack-element"
                >
                  {element}
                </div>
              )).reverse()}
            </div>
            <div className="stack-top-label">栈顶</div>
          </>
        )}
      </div>
      
      <div className="current-node">
        <h4>当前节点</h4>
        {currentNode !== null ? (
          <div className="node-value">{currentNode}</div>
        ) : (
          <div className="node-null">null</div>
        )}
      </div>
      
      <div className="operation-info">
        <div className={`action-badge ${action}`}>
          {action === 'push' && '入栈'}
          {action === 'pop' && '出栈'}
          {action === 'visit' && '访问'}
          {action === 'move_right' && '右移'}
        </div>
        <div className="operation-description">{description}</div>
      </div>
    </div>
  );
};

export default StackVisualization; 