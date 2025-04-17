import React from 'react';
import './TreeInputExamples.css';

interface TreeInputExamplesProps {
  treeInput: string;
  onTreeInputChange: (value: string) => void;
  onBuildTree: () => void;
  onGenerateRandomTree: () => void;
}

const TreeInputExamples: React.FC<TreeInputExamplesProps> = ({
  treeInput,
  onTreeInputChange,
  onBuildTree,
  onGenerateRandomTree
}) => {
  
  const useExample = (example: string) => {
    onTreeInputChange(example);
    onBuildTree();
  };
  
  return (
    <div className="tree-input-panel">
      <div className="tree-input-row">
        <div className="tree-input-wrapper">
          <label htmlFor="treeInput">树：</label>
          <div className="tree-input-container">
            <input
              id="treeInput"
              type="text"
              value={treeInput}
              onChange={(e) => onTreeInputChange(e.target.value)}
              placeholder="输入数组表示的二叉树"
            />
            <button className="build-button" onClick={onBuildTree}>
              构建
            </button>
          </div>
        </div>
        
        <div className="tree-examples">
          <button
            className="random-button"
            onClick={onGenerateRandomTree}
            title="生成随机二叉树"
          >
            <span className="random-icon">🔄</span>随机
          </button>
          <button
            className="example-button"
            onClick={() => useExample('[1,null,2,3]')}
            title="[1,null,2,3]"
          >
            例1
          </button>
          <button
            className="example-button"
            onClick={() => useExample('[5,4,7,3,null,2,null,-1,null,9]')}
            title="[5,4,7,3,null,2,null,-1,null,9]"
          >
            例2
          </button>
          <button
            className="example-button"
            onClick={() => useExample('[1,2,3,4,5,6,7]')}
            title="[1,2,3,4,5,6,7]"
          >
            例3
          </button>
        </div>
      </div>
    </div>
  );
};

export default TreeInputExamples; 