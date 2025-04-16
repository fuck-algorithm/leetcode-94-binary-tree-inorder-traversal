import { useState, useEffect, useRef } from 'react';
import TreeVisualization from './TreeVisualization';
import StackVisualization from './StackVisualization';
import { TreeNode, TreeNodeData, arrayToTree, treeToD3Format } from '../types/TreeNode';
import { inorderTraversalRecursive, inorderTraversalIterative, inorderTraversalWithSteps, TraversalStep } from '../algorithms/inorderTraversal';
import './BinaryTreeInorderTraversal.css';

export default function BinaryTreeInorderTraversal() {
  const [treeInput, setTreeInput] = useState<string>('[1,null,2,3]');
  const [treeData, setTreeData] = useState<TreeNodeData | null>(null);
  const [result, setResult] = useState<number[]>([]);
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [method, setMethod] = useState<'recursive' | 'iterative'>('iterative');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1000);
  const [traversalSteps, setTraversalSteps] = useState<TraversalStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showStack, setShowStack] = useState<boolean>(true);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const autoPlayTimerRef = useRef<number | null>(null);

  // 自动播放功能
  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      // 暂停自动播放
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      setIsAutoPlaying(false);
    } else {
      // 开始自动播放
      setIsAutoPlaying(true);
      autoPlayTimerRef.current = setInterval(() => {
        // 如果到达最后一步，循环回到第一步
        if (currentStep >= traversalSteps.length - 1) {
          resetSteps();
        } else {
          goToNextStep();
        }
      }, animationSpeed);
    }
  };
  
  // 当动画速度改变时，如果正在自动播放，更新计时器
  useEffect(() => {
    if (isAutoPlaying && autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = setInterval(() => {
        // 如果到达最后一步，循环回到第一步
        if (currentStep >= traversalSteps.length - 1) {
          resetSteps();
        } else {
          goToNextStep();
        }
      }, animationSpeed);
    }
  }, [animationSpeed]);
  
  // 清理自动播放计时器
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, []);
  
  // 当遍历步骤改变时，如果正在自动播放，重置计时器
  useEffect(() => {
    if (isAutoPlaying) {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
      setCurrentStep(0);
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= traversalSteps.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, animationSpeed);
    }
  }, [traversalSteps]);

  // 解析输入并构建树
  const buildTree = () => {
    // 如果正在自动播放，先暂停
    if (isAutoPlaying) {
      toggleAutoPlay();
    }
    
    try {
      setError(null);
      // 重置访问状态
      setVisitedNodeIds([]);
      setCurrentNodeId(null);
      setIsAnimating(false); // 确保不在动画状态
      setCurrentStep(0); // 重置步骤
      
      // 移除不必要的空格
      const cleanedInput = treeInput.trim();
      
      // 检查是否是有效的数组格式
      if (!cleanedInput.startsWith('[') || !cleanedInput.endsWith(']')) {
        throw new Error('输入必须是有效的数组格式，例如 [1,null,2,3]');
      }
      
      // 解析输入
      const inputContent = cleanedInput.slice(1, -1);
      let parsedArray: (number | null)[];
      
      if (inputContent.trim() === '') {
        parsedArray = [];
      } else {
        parsedArray = inputContent.split(',').map(item => {
          const trimmedItem = item.trim();
          return trimmedItem === 'null' ? null : parseInt(trimmedItem, 10);
        });
      }
      
      // 构建树
      const newRoot = arrayToTree(parsedArray);
      setRoot(newRoot);
      
      // 转换为D3格式
      const d3Data = treeToD3Format(newRoot);
      setTreeData(d3Data);
      
      // 初始化状态
      if (newRoot) {
        // 对于递归方法，直接显示结果
        if (method === 'recursive') {
          const traversalResult = inorderTraversalRecursive(newRoot);
          setResult(traversalResult);
        } 
        // 对于迭代方法，设置步骤
        else {
          const steps = inorderTraversalWithSteps(newRoot);
          setTraversalSteps(steps);
          setCurrentStep(0); // 重置步骤
          
          // 设置初始状态
          if (steps.length > 0) {
            const firstStep = steps[0];
            setCurrentNodeId(firstStep.currentId);
            setResult([]);
            setVisitedNodeIds([]);
          }
        }
      } else {
        // 如果树为空，也需要重置其他状态
        setTraversalSteps([]);
        setResult([]);
      }
      
    } catch (err) {
      setError((err as Error).message);
      // 发生错误时也需要重置状态
      setTraversalSteps([]);
      setResult([]);
      setVisitedNodeIds([]);
      setCurrentNodeId(null);
    }
  };

  // 前进到下一步
  const goToNextStep = () => {
    if (currentStep < traversalSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // 更新当前节点和结果
      const step = traversalSteps[nextStep];
      setCurrentNodeId(step.currentId);
      setResult([...step.result]);
      
      // 使用步骤中记录的已访问节点列表
      setVisitedNodeIds([...step.visitedIds]);
    }
    // 如果已经在最后一步，可以循环回到第一步
    else if (traversalSteps.length > 0) {
      resetSteps();
    }
  };

  // 返回到上一步
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // 更新当前节点和结果
      const step = traversalSteps[prevStep];
      setCurrentNodeId(step.currentId);
      setResult([...step.result]);
      
      // 使用步骤中记录的已访问节点列表
      setVisitedNodeIds([...step.visitedIds]);
    }
    // 如果已经在第一步，可以循环到最后一步
    else if (traversalSteps.length > 0) {
      // 跳到最后一步
      completeAllSteps();
    }
  };

  // 重置到初始状态
  const resetSteps = () => {
    // 即使已经在初始状态，也可以重新设置
    setCurrentStep(0);
    setVisitedNodeIds([]);
    if (traversalSteps.length > 0) {
      const firstStep = traversalSteps[0];
      setCurrentNodeId(firstStep.currentId);
      setResult([]);
    }
  };

  // 完成全部步骤
  const completeAllSteps = () => {
    if (traversalSteps.length > 0) {
      const lastStep = traversalSteps.length - 1;
      setCurrentStep(lastStep);
      
      // 更新到最终状态
      const step = traversalSteps[lastStep];
      setCurrentNodeId(step.currentId);
      setResult([...step.result]);
      
      // 使用步骤中记录的已访问节点列表
      setVisitedNodeIds([...step.visitedIds]);
    }
  };

  // 生成随机树数据
  const generateRandomTree = () => {
    // 随机决定树的节点数量 (5-25)
    const nodeCount = Math.floor(Math.random() * 21) + 5;
    
    // 创建一个数组来存储树节点
    const treeArray: (number | null)[] = [];
    
    // 生成根节点 (1-100 范围内的随机数值)
    treeArray.push(Math.floor(Math.random() * 100) + 1);
    
    // 计算可能的最大深度
    const maxDepth = Math.ceil(Math.log2(nodeCount + 1));
    // 计算完全二叉树在这个深度下的最大节点数
    const maxPossibleNodes = Math.pow(2, maxDepth) - 1;
    
    // 为剩余可能的位置生成节点或null
    for (let i = 1; i < maxPossibleNodes; i++) {
      // 当前位置的父节点
      const parentIndex = Math.floor((i - 1) / 2);
      
      // 如果父节点是null，子节点也应该是null
      if (parentIndex < treeArray.length && treeArray[parentIndex] === null) {
        treeArray.push(null);
      } else {
        // 计算当前深度
        const currentDepth = Math.floor(Math.log2(i + 1));
        // 根据深度调整生成节点的概率 (越深层的节点，null的概率越高)
        const nullProbability = 0.1 + (currentDepth / maxDepth) * 0.3;
        
        // 生成null或实际节点的概率
        const isNull = Math.random() < nullProbability;
        
        if (isNull || treeArray.length >= nodeCount) {
          treeArray.push(null);
        } else {
          // 生成一个随机值 (1-100)
          treeArray.push(Math.floor(Math.random() * 100) + 1);
        }
      }
    }
    
    // 去除尾部的null，使数组更简洁
    while (treeArray.length > 0 && treeArray[treeArray.length - 1] === null) {
      treeArray.pop();
    }
    
    // 确保至少有根节点
    if (treeArray.length === 0) {
      treeArray.push(Math.floor(Math.random() * 100) + 1);
    }
    
    // 更新输入
    setTreeInput(`[${treeArray.map(val => val === null ? 'null' : val).join(',')}]`);
  };

  // 示例数据
  const useExample = (exampleNum: number) => {
    switch (exampleNum) {
      case 1:
        setTreeInput('[1,null,2,3]');
        break;
      case 2:
        setTreeInput('[]');
        break;
      case 3:
        setTreeInput('[1]');
        break;
      default:
        break;
    }
  };

  // 修改方法变更的useEffect
  useEffect(() => {
    if (root) {
      // 重置访问状态
      setVisitedNodeIds([]);
      setCurrentNodeId(null);
      
      // 只有迭代方法支持手动模式
      if (method === 'iterative') {
        const steps = inorderTraversalWithSteps(root);
        setTraversalSteps(steps);
        setCurrentStep(0);
        
        // 设置初始状态
        if (steps.length > 0) {
          const firstStep = steps[0];
          setCurrentNodeId(firstStep.currentId);
          setResult([]);
        }
      } else {
        // 如果是递归方法，就显示完整结果
        const traversalResult = inorderTraversalRecursive(root);
        setResult(traversalResult);
      }
    }
  }, [method]);

  // 修改初始化组件的useEffect
  useEffect(() => {
    // 组件加载时，自动构建树
    buildTree();
  }, []);

  // 当输入变更时构建树
  useEffect(() => {
    buildTree();
  }, [treeInput]);

  // 获取当前步骤的栈状态
  const getCurrentStackState = () => {
    if (traversalSteps.length === 0 || currentStep >= traversalSteps.length) {
      return {
        stack: [],
        stackVals: [],
        currentId: null,
        currentVal: null,
        action: 'visit' as const,
        description: '未开始遍历'
      };
    }
    
    return traversalSteps[currentStep];
  };

  // 获取步骤进度
  const getStepProgress = () => {
    if (traversalSteps.length === 0) return '0 / 0';
    return `${currentStep + 1} / ${traversalSteps.length}`;
  };

  return (
    <div className="binary-tree-inorder-traversal">
      <h1>二叉树的中序遍历</h1>
      
      <div className="problem-description">
        <p>给定一个二叉树的根节点 root ，返回它的 中序 遍历结果。</p>
        <p>中序遍历按照 左-根-右 的顺序访问树中的节点。</p>
      </div>
      
      <div className="input-section">
        <div className="input-row">
          <div className="input-controls">
            <label htmlFor="tree-input">树：</label>
            <input 
              id="tree-input" 
              type="text" 
              value={treeInput} 
              onChange={(e) => setTreeInput(e.target.value)}
            />
            <button onClick={buildTree}>构建</button>
          </div>
          
          <div className="examples">
            <button onClick={() => useExample(1)}>示例1</button>
            <button onClick={() => useExample(2)}>示例2</button>
            <button onClick={() => useExample(3)}>示例3</button>
            <button onClick={generateRandomTree} className="random-button">随机</button>
          </div>
        </div>
        
        <div className="control-row">
          <div className="method-selection">
            <label>算法：</label>
            <label>
              <input 
                type="radio" 
                value="recursive" 
                checked={method === 'recursive'} 
                onChange={() => setMethod('recursive')}
              />
              递归
            </label>
            <label>
              <input 
                type="radio" 
                value="iterative" 
                checked={method === 'iterative'} 
                onChange={() => setMethod('iterative')}
              />
              迭代
            </label>
            
            {method === 'iterative' && (
              <label className="stack-toggle">
                <input 
                  type="checkbox" 
                  checked={showStack} 
                  onChange={() => setShowStack(!showStack)}
                />
                显示栈
              </label>
            )}
          </div>
          
          <div className="animation-controls">
            <label>
              速度：
              <input 
                type="range" 
                min="200" 
                max="2000" 
                step="100"
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
              />
              {animationSpeed}ms
            </label>
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className={`visualization-wrapper ${method === 'iterative' && showStack ? 'with-stack' : ''}`}>
        <div className="visualization-container">
          {treeData && (
            <TreeVisualization 
              data={treeData} 
              width={window.innerWidth > 768 ? 
                Math.min(window.innerWidth * 0.8, 1000) : 
                window.innerWidth - 20} 
              height={window.innerHeight * 0.6}
              highlightedNodeId={currentNodeId}
              visitedNodeIds={visitedNodeIds}
              stackNodeIds={getCurrentStackState().stack}
            />
          )}
        </div>
        
        {method === 'iterative' && showStack && (
          <div className="stack-container-wrapper">
            <StackVisualization 
              stack={getCurrentStackState().stack}
              stackVals={getCurrentStackState().stackVals}
              currentId={getCurrentStackState().currentId}
              currentVal={getCurrentStackState().currentVal}
              action={getCurrentStackState().action}
              description={getCurrentStackState().description}
            />
          </div>
        )}
      </div>
      
      <div className="controls-results-wrapper">
        <div className="manual-controls">
          <div className="step-progress">
            <span className="progress-icon">📊</span>
            <span>步骤: {getStepProgress()}</span>
          </div>
          
          <div className="progress-bar-container">
            <span className="progress-step">{currentStep + 1}</span>
            <input 
              type="range"
              min="0"
              max={traversalSteps.length > 0 ? traversalSteps.length - 1 : 0}
              value={currentStep}
              onChange={(e) => {
                const step = parseInt(e.target.value);
                setCurrentStep(step);
                
                // 更新节点状态和结果
                if (traversalSteps.length > 0) {
                  const targetStep = traversalSteps[step];
                  setCurrentNodeId(targetStep.currentId);
                  setResult([...targetStep.result]);
                  
                  // 更新已访问节点
                  const visitedNodeIdsUpToCurrentStep = new Set<string>();
                  for (let i = 0; i <= step; i++) {
                    const s = traversalSteps[i];
                    if (s.action === 'visit' && s.currentId !== null && s.visitedIds.includes(s.currentId)) {
                      visitedNodeIdsUpToCurrentStep.add(s.currentId);
                    }
                  }
                  setVisitedNodeIds(Array.from(visitedNodeIdsUpToCurrentStep));
                }
              }}
              className="step-progress-bar"
              style={{
                '--min': 0,
                '--max': traversalSteps.length > 0 ? traversalSteps.length - 1 : 0,
                '--value': currentStep
              } as React.CSSProperties}
            />
            <span className="progress-step">{traversalSteps.length}</span>
          </div>
          
          <div className="animation-status">
            <div className="current-phase">
              {traversalSteps[currentStep]?.description || '准备开始遍历'}
            </div>
          </div>
          
          <div className="step-buttons">
            <button 
              onClick={resetSteps} 
              className="control-button reset-button"
              title="重置到初始状态"
            >
              <span className="button-icon">⏮️</span> 重置
            </button>
            <button 
              onClick={goToPreviousStep} 
              className="control-button prev-button"
              title="返回上一步"
            >
              <span className="button-icon">◀️</span> 上一步
            </button>
            
            <button 
              onClick={toggleAutoPlay} 
              className={`control-button ${isAutoPlaying ? "pause-button" : "play-button"}`}
              title={isAutoPlaying ? "暂停自动播放" : "开始自动播放"}
            >
              <span className="button-icon">{isAutoPlaying ? "⏸️" : "▶️▶️"}</span> 
              {isAutoPlaying ? "暂停" : "自动"}
            </button>
            
            <button 
              onClick={goToNextStep} 
              className="control-button next-button"
              title="前进到下一步"
            >
              <span className="button-icon">▶️</span> 下一步
            </button>
            <button 
              onClick={completeAllSteps} 
              className="control-button end-button"
              title="跳到最终结果"
            >
              <span className="button-icon">⏩</span> 结束
            </button>
          </div>
          
          <div className="step-description">
            {getCurrentStackState().description}
          </div>
        </div>

        <div className="result-section">
          <h2>遍历结果</h2>
          <div className="result-array">
            {result.length === 0 ? (
              <span>[]</span>
            ) : (
              <span>[{result.join(', ')}]</span>
            )}
          </div>
          
          <div className="script-info">
            <h3>中序遍历步骤</h3>
            <ol className="traversal-steps">
              <li className={currentStep < 1 ? 'current-step' : 'completed-step'}>初始化</li>
              <li className={currentStep >= 1 && currentStep < 3 ? 'current-step' : (currentStep >= 3 ? 'completed-step' : '')}>访问根节点</li>
              <li className={currentStep >= 3 && !result.length ? 'current-step' : (result.length ? 'completed-step' : '')}>遍历左子树</li>
              <li className={result.length > 0 && result.length < traversalSteps[traversalSteps.length-1]?.result.length ? 'current-step' : (currentStep === traversalSteps.length-1 ? 'completed-step' : '')}>访问节点</li>
              <li className={currentStep >= traversalSteps.length-3 && currentStep < traversalSteps.length-1 ? 'current-step' : (currentStep === traversalSteps.length-1 ? 'completed-step' : '')}>遍历右子树</li>
              <li className={currentStep === traversalSteps.length-1 ? 'current-step' : ''}>完成遍历</li>
            </ol>
          </div>
        </div>
      </div>

      {method === 'recursive' && (
        <div className="warning-message">
          注意：递归方式下无法逐步查看执行过程
        </div>
      )}
    </div>
  );
} 