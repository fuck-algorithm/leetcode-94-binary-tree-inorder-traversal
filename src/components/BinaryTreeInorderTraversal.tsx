import { useState, useEffect } from 'react';
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
  const [currentNode, setCurrentNode] = useState<number | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1000);
  const [traversalSteps, setTraversalSteps] = useState<TraversalStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showStack, setShowStack] = useState<boolean>(true);
  const [manualMode, setManualMode] = useState<boolean>(false);

  // 解析输入并构建树
  const buildTree = () => {
    try {
      setError(null);
      // 重置访问状态
      setVisitedNodes([]);
      setCurrentNode(null);
      
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
      
      // 执行遍历并获取结果
      const traversalResult = method === 'recursive' 
        ? inorderTraversalRecursive(newRoot) 
        : inorderTraversalIterative(newRoot);
      setResult(traversalResult);
      
      // 如果使用迭代方法，计算步骤
      if (method === 'iterative') {
        const steps = inorderTraversalWithSteps(newRoot);
        setTraversalSteps(steps);
        setCurrentStep(0);
        
        // 设置初始状态
        if (steps.length > 0) {
          const firstStep = steps[0];
          setCurrentNode(firstStep.current);
          setResult([]);
          setVisitedNodes([]);
        }
      }
      
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // 执行遍历
  const executeTraversal = () => {
    if (!root) {
      setError('请先构建树');
      return;
    }
    
    // 重置访问状态
    setVisitedNodes([]);
    setCurrentNode(null);
    
    const traversalResult = method === 'recursive' 
      ? inorderTraversalRecursive(root) 
      : inorderTraversalIterative(root);
    setResult(traversalResult);
    
    // 如果使用迭代方法，计算步骤
    if (method === 'iterative') {
      const steps = inorderTraversalWithSteps(root);
      setTraversalSteps(steps);
      setCurrentStep(0);
      
      // 设置初始状态
      if (steps.length > 0) {
        const firstStep = steps[0];
        setCurrentNode(firstStep.current);
        setResult([]);
      }
    }
  };

  // 执行动画
  const startAnimation = async () => {
    if (!root) {
      setError('请先构建树');
      return;
    }
    
    setIsAnimating(true);
    setManualMode(false);
    setResult([]);
    setVisitedNodes([]);
    
    if (method === 'recursive') {
      // 递归方式的动画
      const traversalResult = inorderTraversalRecursive(root);
      
      // 找到遍历顺序中的每个节点，并逐个高亮显示
      for (let i = 0; i < traversalResult.length; i++) {
        // 设置当前高亮节点
        setCurrentNode(traversalResult[i]);
        
        // 更新结果数组
        setResult(prev => [...prev, traversalResult[i]]);
        
        // 等待一定时间
        await new Promise(resolve => setTimeout(resolve, animationSpeed));
        
        // 将节点标记为已访问
        setVisitedNodes(prev => [...prev, traversalResult[i]]);
      }
      
      setIsAnimating(false);
      setCurrentNode(null);
    } else {
      // 迭代方式的动画，使用步骤
      const steps = inorderTraversalWithSteps(root);
      setTraversalSteps(steps);
      
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        const step = steps[i];
        
        // 更新当前节点和结果
        setCurrentNode(step.current);
        setResult([...step.result]);
        
        // 标记已访问的节点
        // 只在result中的节点才是已经完全访问并记录结果的节点
        if (step.action === 'visit' && step.current !== null && step.result.includes(step.current)) {
          setVisitedNodes(prev => {
            if (!prev.includes(step.current!)) {
              return [...prev, step.current!];
            }
            return prev;
          });
        }
        
        // 等待一定时间
        await new Promise(resolve => setTimeout(resolve, animationSpeed));
      }
      
      setIsAnimating(false);
    }
  };

  // 初始化手动模式
  const startManualMode = () => {
    if (!root) {
      setError('请先构建树');
      return;
    }

    if (method === 'recursive') {
      setError('手动模式仅支持迭代实现');
      return;
    }
    
    // 重置并准备手动模式
    setManualMode(true);
    setIsAnimating(false);
    setCurrentStep(0);
    setVisitedNodes([]);
    
    // 计算遍历步骤
    const steps = inorderTraversalWithSteps(root);
    setTraversalSteps(steps);
    
    // 设置初始状态
    if (steps.length > 0) {
      const firstStep = steps[0];
      setCurrentNode(firstStep.current);
      setResult([]);
    }
  };

  // 前进到下一步
  const goToNextStep = () => {
    if (currentStep < traversalSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // 更新当前节点和结果
      const step = traversalSteps[nextStep];
      setCurrentNode(step.current);
      setResult([...step.result]);
      
      // 标记已访问的节点
      if (step.action === 'visit' && step.current !== null && step.result.includes(step.current)) {
        setVisitedNodes(prev => {
          if (!prev.includes(step.current!)) {
            return [...prev, step.current!];
          }
          return prev;
        });
      }
    }
  };

  // 返回到上一步
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // 更新当前节点和结果
      const step = traversalSteps[prevStep];
      setCurrentNode(step.current);
      setResult([...step.result]);
      
      // 处理已访问节点的状态
      // 回退时需要重新计算已访问节点集合，以匹配当前步骤的状态
      const visitedNodesUpToCurrentStep = new Set<number>();
      
      // 遍历所有步骤直到当前步骤，找出已访问的节点
      for (let i = 0; i <= prevStep; i++) {
        const s = traversalSteps[i];
        if (s.action === 'visit' && s.current !== null && s.result.includes(s.current)) {
          visitedNodesUpToCurrentStep.add(s.current);
        }
      }
      
      setVisitedNodes(Array.from(visitedNodesUpToCurrentStep));
    }
  };

  // 重置到初始状态
  const resetSteps = () => {
    setCurrentStep(0);
    setVisitedNodes([]);
    if (traversalSteps.length > 0) {
      const firstStep = traversalSteps[0];
      setCurrentNode(firstStep.current);
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
      setCurrentNode(step.current);
      setResult([...step.result]);
      
      // 收集所有已访问的节点
      const allVisitedNodes = new Set<number>();
      traversalSteps.forEach(s => {
        if (s.action === 'visit' && s.current !== null && s.result.includes(s.current)) {
          allVisitedNodes.add(s.current);
        }
      });
      
      setVisitedNodes(Array.from(allVisitedNodes));
    }
  };

  // 生成随机树数据
  const generateRandomTree = () => {
    // 随机决定树的节点数量 (3-10)
    const nodeCount = Math.floor(Math.random() * 8) + 3;
    
    // 创建一个数组来存储树节点
    const treeArray: (number | null)[] = [];
    
    // 生成根节点 (1-100 范围内的随机数值)
    treeArray.push(Math.floor(Math.random() * 100) + 1);
    
    // 为剩余可能的位置生成节点或null
    for (let i = 1; i < Math.pow(2, Math.ceil(Math.log2(nodeCount))) - 1; i++) {
      // 当前位置的父节点
      const parentIndex = Math.floor((i - 1) / 2);
      
      // 如果父节点是null，子节点也应该是null
      if (parentIndex < treeArray.length && treeArray[parentIndex] === null) {
        treeArray.push(null);
      } else {
        // 70%的概率生成一个节点，30%的概率为null
        const isNull = Math.random() > 0.7;
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

  // 改变方法时重新计算
  useEffect(() => {
    if (root) {
      executeTraversal();
    }
  }, [method]);

  // 当输入变更时构建树
  useEffect(() => {
    buildTree();
  }, [treeInput]);

  // 获取当前步骤的栈状态
  const getCurrentStackState = () => {
    if (traversalSteps.length === 0 || currentStep >= traversalSteps.length) {
      return {
        stack: [],
        current: null,
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
        <div className="input-controls">
          <label htmlFor="tree-input">树的数组表示：</label>
          <input 
            id="tree-input" 
            type="text" 
            value={treeInput} 
            onChange={(e) => setTreeInput(e.target.value)}
            disabled={isAnimating || manualMode}
          />
          <button onClick={buildTree} disabled={isAnimating || manualMode}>构建树</button>
        </div>
        
        <div className="examples">
          <button onClick={() => useExample(1)} disabled={isAnimating || manualMode}>示例 1: [1,null,2,3]</button>
          <button onClick={() => useExample(2)} disabled={isAnimating || manualMode}>示例 2: []</button>
          <button onClick={() => useExample(3)} disabled={isAnimating || manualMode}>示例 3: [1]</button>
          <button onClick={generateRandomTree} disabled={isAnimating || manualMode} className="random-button">随机生成</button>
        </div>
        
        <div className="method-selection">
          <label>算法实现方式：</label>
          <label>
            <input 
              type="radio" 
              value="recursive" 
              checked={method === 'recursive'} 
              onChange={() => setMethod('recursive')}
              disabled={isAnimating || manualMode}
            />
            递归
          </label>
          <label>
            <input 
              type="radio" 
              value="iterative" 
              checked={method === 'iterative'} 
              onChange={() => setMethod('iterative')}
              disabled={isAnimating || manualMode}
            />
            迭代
          </label>
          
          {method === 'iterative' && (
            <label className="stack-toggle">
              <input 
                type="checkbox" 
                checked={showStack} 
                onChange={() => setShowStack(!showStack)}
                disabled={isAnimating || manualMode}
              />
              显示栈状态
            </label>
          )}
        </div>
        
        <div className="animation-controls">
          <label>
            动画速度：
            <input 
              type="range" 
              min="200" 
              max="2000" 
              step="100"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
              disabled={isAnimating || manualMode}
            />
            {animationSpeed}ms
          </label>
        </div>
        
        <div className="actions">
          <button onClick={executeTraversal} disabled={isAnimating || manualMode}>执行遍历</button>
          <button onClick={startAnimation} disabled={isAnimating || manualMode}>
            {isAnimating ? '动画进行中...' : '动画演示'}
          </button>
          {method === 'iterative' && (
            <button 
              onClick={startManualMode} 
              disabled={isAnimating || manualMode}
              className="manual-button"
            >
              手动控制
            </button>
          )}
        </div>
        
        {manualMode && (
          <div className="manual-controls">
            <div className="step-progress">
              步骤: {getStepProgress()}
            </div>
            <div className="step-buttons">
              <button onClick={resetSteps} disabled={isAnimating || currentStep === 0}>
                重置
              </button>
              <button onClick={goToPreviousStep} disabled={isAnimating || currentStep === 0}>
                上一步
              </button>
              <button onClick={goToNextStep} disabled={isAnimating || currentStep === traversalSteps.length - 1}>
                下一步
              </button>
              <button onClick={completeAllSteps} disabled={isAnimating || currentStep === traversalSteps.length - 1}>
                结束
              </button>
              <button onClick={() => setManualMode(false)} className="exit-button">
                退出手动模式
              </button>
            </div>
            <div className="step-description">
              {getCurrentStackState().description}
            </div>
          </div>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className={`visualization-wrapper ${method === 'iterative' && showStack ? 'with-stack' : ''}`}>
        <div className="visualization-container">
          {treeData && (
            <TreeVisualization 
              data={treeData} 
              width={600} 
              height={400}
              highlightedNode={currentNode}
              visitedNodes={visitedNodes}
            />
          )}
        </div>
        
        {method === 'iterative' && showStack && (
          <div className="stack-container-wrapper">
            <StackVisualization 
              stack={getCurrentStackState().stack}
              currentNode={getCurrentStackState().current}
              action={getCurrentStackState().action}
              description={getCurrentStackState().description}
            />
          </div>
        )}
      </div>
      
      <div className="result-section">
        <h2>遍历结果：</h2>
        <div className="result-array">
          {result.length === 0 ? (
            <span>[]</span>
          ) : (
            <span>[{result.join(', ')}]</span>
          )}
        </div>
      </div>
    </div>
  );
} 