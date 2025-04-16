import React from 'react';
import './StackVisualization.css';

interface StackVisualizationProps {
  stack: string[];  // 节点ID
  stackVals: number[]; // 节点值
  currentId: string | null;
  currentVal: number | null;
  action: 'push' | 'pop' | 'visit' | 'move_right';
  description: string;
}

const StackVisualization: React.FC<StackVisualizationProps> = ({ 
  stack, 
  stackVals,
  currentId, 
  currentVal,
  action,
  description 
}) => {
  // 根据操作类型获取对应的图标和描述
  const getActionInfo = () => {
    switch (action) {
      case 'push':
        return { icon: '⬇️', text: '入栈' };
      case 'pop':
        return { icon: '⬆️', text: '出栈' };
      case 'visit':
        return { icon: '👁️', text: '访问' };
      case 'move_right':
        return { icon: '➡️', text: '右移' };
      default:
        return { icon: '❓', text: '未知' };
    }
  };

  const { icon, text } = getActionInfo();

  // 计算当前步骤的阶段
  const getStepPhase = () => {
    if (description.includes('初始化')) return '初始化';
    if (description.includes('开始遍历')) return '访问根节点';
    if (description.includes('左子树') || description.includes('左子节点')) return '遍历左子树';
    if (description.includes('将其加入结果')) return '访问当前节点';
    if (description.includes('右子节点') || description.includes('右子树')) return '遍历右子树';
    if (description.includes('遍历完成')) return '结束遍历';
    return '遍历中';
  };

  const stepPhase = getStepPhase();

  return (
    <div className="stack-visualization">
      <h3>栈状态</h3>
      
      <div className="step-phase">
        <span className="phase-label">当前阶段:</span>
        <span className="phase-value">{stepPhase}</span>
      </div>
      
      <div className="stack-container">
        {stackVals.length === 0 ? (
          <div className="empty-stack">栈为空</div>
        ) : (
          <>
            <div className="stack-elements">
              {stackVals.map((element, index) => (
                <div 
                  key={`${stack[index]}`} 
                  className={`stack-element ${index === stackVals.length - 1 ? 'stack-top' : ''}`}
                  title={`ID: ${stack[index].substring(0, 6)}...`}
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
        {currentVal !== null ? (
          <div className="node-value" title={`ID: ${currentId?.substring(0, 6)}...`}>
            {currentVal}
          </div>
        ) : (
          <div className="node-null">null</div>
        )}
      </div>
      
      <div className="operation-info">
        <div className={`action-badge ${action}`}>
          <span className="action-icon">{icon}</span>
          <span>{text}</span>
        </div>
        <div className="operation-description">{description}</div>
      </div>
    </div>
  );
};

export default StackVisualization; 