import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TreeVisualization from './TreeVisualization';
import StackPanel from './StackPanel';
import CodeDebugPanel from './CodeDebugPanel';
import TreeInputExamples from './TreeInputExamples';
import { TreeNode, TreeNodeData, arrayToTree, treeToD3Format } from '../types/TreeNode';
import { inorderTraversalWithSteps, TraversalStep } from '../algorithms/inorderTraversal';
import {
  enrichStepsWithDebug,
  DebugTraversalStep,
} from '../algorithms/inorderTraversalCodeSteps';
import './BinaryTreeInorderTraversal.css';

// 保存到localStorage的键名
const STORAGE_KEYS = {
  ANIMATION_SPEED: 'btit_animation_speed',
  TRAVERSAL_METHOD: 'btit_traversal_method'
};

// 速度控制配置
const SPEED_CONFIG = {
  MIN: 100, // 最快速度（毫秒）
  MAX: 5000, // 最慢速度（毫秒）
  DEFAULT: 500, // 默认速度（毫秒）
  STEP: 100 // 滑块步长
};

// 添加可视化底部控制组件
interface VisualizationBottomControlsProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  traversalSteps: any[]; // 根据实际类型修改
  setCurrentNodeId: (id: string | null) => void;
  setResult: (result: any[]) => void; // 根据实际类型修改
  setVisitedNodeIds: (ids: string[]) => void;
}

const VisualizationBottomControls: React.FC<VisualizationBottomControlsProps> = ({ 
  currentStep, 
  setCurrentStep, 
  traversalSteps, 
  setCurrentNodeId, 
  setResult, 
  setVisitedNodeIds 
}) => {
  // 更新进度条背景填充
  useEffect(() => {
    const progressBar = document.querySelector('.step-progress-bar') as HTMLInputElement;
    if (progressBar) {
      const min = parseInt(progressBar.min || '0');
      const max = parseInt(progressBar.max || '100');
      const value = parseInt(progressBar.value || '0');
      const percentage = ((value - min) / (max - min)) * 100;
      progressBar.style.setProperty('--fill-percent', `${percentage}%`);
    }
  }, [currentStep, traversalSteps]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  return (
    <div className="visualization-bottom-controls">
      <div id="progressBarContainer">
        <span className="progress-step">{currentStep + 1}</span>
        <input 
          type="range"
          min="0"
          max={traversalSteps.length > 0 ? traversalSteps.length - 1 : 0}
          value={currentStep}
          onChange={handleProgressChange}
          className="step-progress-bar"
          style={{
            '--min': 0,
            '--max': traversalSteps.length > 0 ? traversalSteps.length - 1 : 0,
            '--value': currentStep
          } as React.CSSProperties}
        />
        <span className="progress-step">{traversalSteps.length}</span>
      </div>
    </div>
  );
};

export default function BinaryTreeInorderTraversal() {
  const [treeInput, setTreeInput] = useState<string>('[1,null,2,3]');
  const [treeData, setTreeData] = useState<TreeNodeData | null>(null);
  const [result, setResult] = useState<number[]>([]);
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [method, setMethod] = useState<'recursive' | 'iterative'>(() => {
    // 从localStorage获取之前保存的算法方法
    const savedMethod = localStorage.getItem(STORAGE_KEYS.TRAVERSAL_METHOD);
    return (savedMethod === 'recursive' || savedMethod === 'iterative') 
      ? savedMethod 
      : 'iterative';
  });
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState<number>(() => {
    // 从localStorage获取之前保存的动画速度
    const savedSpeed = localStorage.getItem(STORAGE_KEYS.ANIMATION_SPEED);
    return savedSpeed ? parseInt(savedSpeed, 10) : SPEED_CONFIG.DEFAULT;
  });
  const [traversalSteps, setTraversalSteps] = useState<TraversalStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const autoPlayTimerRef = useRef<number | null>(null);

  // 保存动画速度到localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANIMATION_SPEED, animationSpeed.toString());
  }, [animationSpeed]);

  // 保存算法方法到localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRAVERSAL_METHOD, method);
  }, [method]);

  // 自动播放功能
  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      // 暂停自动播放
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      setIsAutoPlaying(false);
    } else {
      // 开始自动播放
      setIsAutoPlaying(true);
      
      const playNextStep = () => {
        if (currentStep < traversalSteps.length - 1) {
          goToNextStep();
          // 继续播放下一步，使用当前动画速度
          autoPlayTimerRef.current = window.setTimeout(playNextStep, animationSpeed);
        } else {
          // 已到最后，停止播放
          setIsAutoPlaying(false);
        }
      };
      
      // 启动自动播放，使用当前动画速度
      autoPlayTimerRef.current = window.setTimeout(playNextStep, animationSpeed);
    }
  };
  
  // 当动画速度或当前步骤变化时，如果正在自动播放，需要更新计时器
  useEffect(() => {
    // 如果正在自动播放，但计时器被清除，需要重新启动
    if (isAutoPlaying && !autoPlayTimerRef.current) {
      const playNextStep = () => {
        if (currentStep < traversalSteps.length - 1) {
          goToNextStep();
          // 继续播放下一步
          autoPlayTimerRef.current = window.setTimeout(playNextStep, animationSpeed);
        } else {
          // 已到最后，停止播放
          setIsAutoPlaying(false);
        }
      };
      
      // 启动自动播放
      autoPlayTimerRef.current = window.setTimeout(playNextStep, animationSpeed);
    }
    
    // 组件卸载时清理计时器
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [isAutoPlaying, currentStep, traversalSteps.length, animationSpeed]);
  
  // 当遍历步骤改变时，如果正在自动播放，需要重置计时器
  useEffect(() => {
    if (isAutoPlaying) {
      // 清理旧计时器
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      
      // 设置新计时器
      const playNextStep = () => {
        if (currentStep < traversalSteps.length - 1) {
          goToNextStep();
          // 继续播放下一步
          autoPlayTimerRef.current = window.setTimeout(playNextStep, animationSpeed);
        } else {
          // 已到最后，停止播放
          setIsAutoPlaying(false);
        }
      };
      
      // 启动自动播放
      autoPlayTimerRef.current = window.setTimeout(playNextStep, animationSpeed);
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
      setIsAutoPlaying(false); // 确保不在动画状态
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
        // 使用带步骤的遍历函数处理递归和迭代方法
        const steps = inorderTraversalWithSteps(newRoot, method);
        setTraversalSteps(steps);
        setCurrentStep(0); // 重置步骤
        
        // 设置初始状态
        if (steps.length > 0) {
          const firstStep = steps[0];
          setCurrentNodeId(firstStep.currentId);
          setResult([]);
          setVisitedNodeIds([]);
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
      
      // 更新当前节点和结果
      const step = traversalSteps[nextStep];
      
      // 批量更新状态以避免多次渲染
      setCurrentStep(nextStep);
      setCurrentNodeId(step.currentId);
      setResult([...step.result]);
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

  // 修改方法变更的useEffect
  useEffect(() => {
    if (root) {
      // 重置访问状态
      setVisitedNodeIds([]);
      setCurrentNodeId(null);
      
      // 递归和迭代方法都支持手动模式
      const steps = inorderTraversalWithSteps(root, method);
      setTraversalSteps(steps);
      setCurrentStep(0);
      
      // 设置初始状态
      if (steps.length > 0) {
        const firstStep = steps[0];
        setCurrentNodeId(firstStep.currentId);
        setResult([]);
      }
    }
  }, [method, root]);

  // 修改初始化组件的useEffect
  useEffect(() => {
    // 组件加载时，自动生成随机树，而不是使用默认值
    generateRandomTree();
  }, []);

  // 当输入变更时构建树
  useEffect(() => {
    buildTree();
  }, [treeInput]);
  
  // 获取当前步骤的栈状态（返回 DebugTraversalStep 或 null）
  const getCurrentStackState = (): DebugTraversalStep | null => {
    if (traversalSteps.length === 0 || currentStep >= traversalSteps.length) {
      return null;
    }
    return debugSteps[currentStep] ?? null;
  };

  // debug 增强步骤（随 method/root 变化重算）
  const debugSteps: DebugTraversalStep[] = useMemo(
    () => enrichStepsWithDebug(traversalSteps, method, root),
    [traversalSteps, method, root],
  );

  // 获取步骤进度
  const getStepProgress = () => {
    if (traversalSteps.length === 0) return '0 / 0';
    return `${currentStep + 1} / ${traversalSteps.length}`;
  };

  // 更新速度控制函数
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setAnimationSpeed(newValue);
    updateRangeBackground(e.target);

    // 如果正在自动播放，需要重启计时器使用新速度
    if (isAutoPlaying && autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
      
      const playNextStep = () => {
        if (currentStep < traversalSteps.length - 1) {
          goToNextStep();
          autoPlayTimerRef.current = window.setTimeout(playNextStep, newValue);
        } else {
          setIsAutoPlaying(false);
        }
      };
      
      autoPlayTimerRef.current = window.setTimeout(playNextStep, newValue);
    }
  };

  // 更新滑块背景填充
  const updateRangeBackground = (rangeElement: HTMLInputElement) => {
    const min = parseInt(rangeElement.min) || SPEED_CONFIG.MIN;
    const max = parseInt(rangeElement.max) || SPEED_CONFIG.MAX;
    const value = parseInt(rangeElement.value);
    
    // 因为速度是反向的（值越小越快），所以填充比例需要反转
    const fillPercent = 100 - (((value - min) / (max - min)) * 100);
    rangeElement.style.setProperty('--fill-percent', `${fillPercent}%`);
  };

  // 格式化速度显示
  const formatSpeedDisplay = (ms: number): string => {
    return ms < 1000 ? `${ms}毫秒` : `${(ms / 1000).toFixed(1)}秒`;
  };

  // 在组件挂载时初始化所有滑块
  useEffect(() => {
    // 初始化拖动条背景
    const speedSlider = document.querySelector('.speed-slider') as HTMLInputElement;
    if (speedSlider) {
      updateRangeBackground(speedSlider);
      
      // 添加实时更新事件
      speedSlider.addEventListener('input', (e) => {
        updateRangeBackground(e.target as HTMLInputElement);
      });
      
      // 清理事件监听器
      return () => {
        speedSlider.removeEventListener('input', (e) => {
          updateRangeBackground(e.target as HTMLInputElement);
        });
      };
    }
  }, []);

  // 处理算法方法变更
  const handleMethodChange = (newMethod: 'recursive' | 'iterative') => {
    setMethod(newMethod);
  };

  // 处理键盘快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 如果当前有输入框被聚焦，不处理快捷键
    if (document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'TEXTAREA')) {
      return;
    }
    
    switch (e.key) {
      case 'r':
      case 'R':
        // 重置
        resetSteps();
        break;
      case 'ArrowLeft':
        // 上一步
        goToPreviousStep();
        break;
      case 'ArrowRight':
        // 下一步
        goToNextStep();
        break;
      case ' ':
        // 空格，切换自动播放
        e.preventDefault(); // 防止页面滚动
        toggleAutoPlay();
        break;
    }
  }, [resetSteps, goToPreviousStep, goToNextStep, toggleAutoPlay]);

  // 添加键盘事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="binary-tree-inorder-traversal">
      <a
        href="https://github.com/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal"
        target="_blank"
        rel="noopener noreferrer"
        className="github-corner"
        aria-label="在GitHub上查看源码"
      >
        <svg width="80" height="80" viewBox="0 0 250 250" style={{
          fill: '#151513',
          color: '#fff',
          position: 'absolute',
          top: 0,
          border: 0,
          right: 0,
          zIndex: 999
        }} aria-hidden="true">
          <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
          <path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style={{ transformOrigin: '130px 106px' }} className="octo-arm"></path>
          <path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" className="octo-body"></path>
        </svg>
      </a>
      <div className="title-container">
        <a 
          href="https://fuck-algorithm.github.io/leetcode-hot-100/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="back-link"
        >
          ← 返回LeetCode Hot 100
        </a>
        <h1>二叉树的中序遍历</h1>
      </div>
      
      <div className="problem-description">
        <p>给定一个二叉树的根节点 root ，返回它的 中序 遍历结果。</p>
        <p>中序遍历按照 左-根-右 的顺序访问树中的节点。</p>
      </div>
      
      <div className="input-section">
        <TreeInputExamples
          treeInput={treeInput}
          onTreeInputChange={setTreeInput}
          onBuildTree={buildTree}
          onGenerateRandomTree={generateRandomTree}
        />
        
        <div className="algorithm-section">
          <div className="method-selection">
            <label>
              <input 
                type="radio" 
                value="recursive" 
                checked={method === 'recursive'} 
                onChange={() => handleMethodChange('recursive')}
              />
              递归
            </label>
            <label>
              <input 
                type="radio" 
                value="iterative" 
                checked={method === 'iterative'} 
                onChange={() => handleMethodChange('iterative')}
              />
              迭代
            </label>
          </div>
          
          <div className="speed-control">
            <label htmlFor="speed">速度:</label>
            <input
              className="speed-slider"
              type="range"
              id="speed"
              min={SPEED_CONFIG.MIN}
              max={SPEED_CONFIG.MAX}
              step={SPEED_CONFIG.STEP}
              value={animationSpeed}
              onChange={handleSpeedChange}
            />
            <span className="speed-value">{formatSpeedDisplay(animationSpeed)}</span>
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className={`visualization-wrapper ${method === 'iterative' || method === 'recursive' ? 'with-stack' : ''}`}>
        <div className="visualization-container">
          <div className="tree-section">
            {treeData && (
              <div className="tree-section-content">
                <TreeVisualization
                  data={treeData}
                  highlightedNodeId={currentNodeId}
                  visitedNodeIds={visitedNodeIds}
                  stackNodeIds={getCurrentStackState()?.stack ?? []}
                />
              </div>
            )}
          </div>

          <div className="code-debug-section">
            <CodeDebugPanel
              method={method}
              currentStep={getCurrentStackState()}
              totalSteps={traversalSteps.length}
              stepIndex={currentStep}
            />
          </div>

          {(method === 'iterative' || method === 'recursive') && (
            <div className="stack-section">
              <StackPanel
                stack={getCurrentStackState()?.stack ?? []}
                stackVals={getCurrentStackState()?.stackVals ?? []}
                currentVal={getCurrentStackState()?.currentVal ?? null}
                action={getCurrentStackState()?.action ?? 'visit'}
                description={getCurrentStackState()?.description ?? '未开始遍历'}
                result={result}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* 使用新的底部控制组件 */}
      <VisualizationBottomControls
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        traversalSteps={traversalSteps}
        setCurrentNodeId={setCurrentNodeId}
        setResult={setResult}
        setVisitedNodeIds={setVisitedNodeIds}
      />
      
      <div className="controls-results-wrapper">
        <div className="manual-controls">
          <div className="step-progress">
            <span className="progress-icon">📊</span>
            <span>步骤: {getStepProgress()}</span>
          </div>
          
          <div className="step-buttons">
            <button 
              onClick={resetSteps} 
              className="control-button reset-button"
              title="重置到初始状态 (快捷键: R)"
            >
              <span className="button-icon">⏮️</span> 重置 <span className="shortcut-hint">R</span>
            </button>
            <button 
              onClick={goToPreviousStep} 
              className="control-button prev-button"
              title="返回上一步 (快捷键: ←)"
            >
              <span className="button-icon">◀️</span> 上一步 <span className="shortcut-hint">←</span>
            </button>
            
            <button 
              onClick={toggleAutoPlay} 
              className={`control-button ${isAutoPlaying ? "pause-button" : "play-button"}`}
              title={isAutoPlaying ? "暂停自动播放 (快捷键: 空格)" : "开始自动播放 (快捷键: 空格)"}
            >
              <span className="button-icon">{isAutoPlaying ? "⏸️" : "▶️▶️"}</span> 
              {isAutoPlaying ? "暂停" : "自动"} <span className="shortcut-hint">空格</span>
            </button>
            
            <button 
              onClick={goToNextStep} 
              className="control-button next-button"
              title="前进到下一步 (快捷键: →)"
            >
              <span className="button-icon">▶️</span> 下一步 <span className="shortcut-hint">→</span>
            </button>
            <button 
              onClick={completeAllSteps} 
              className="control-button end-button"
              title="跳到最终结果"
            >
              <span className="button-icon">⏩</span> 结束
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 