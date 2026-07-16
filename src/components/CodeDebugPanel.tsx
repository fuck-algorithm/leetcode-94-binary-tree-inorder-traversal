// src/components/CodeDebugPanel.tsx
import { palette } from '../theme/colors';
import {
  DebugTraversalStep,
  getCodeLines,
} from '../algorithms/inorderTraversalCodeSteps';
import './CodeDebugPanel.css';

interface CodeDebugPanelProps {
  method: 'recursive' | 'iterative';
  currentStep: DebugTraversalStep | null;
  totalSteps: number;
  stepIndex: number;
}

export default function CodeDebugPanel({
  method,
  currentStep,
  totalSteps,
  stepIndex,
}: CodeDebugPanelProps) {
  const codeLines = getCodeLines(method);
  const activeLine = currentStep?.codeLine ?? 1;

  // 先判空再渲染调用栈，避免 `.map().reverse()` 的潜在类型/可读性问题。
  // callStack 仅在 currentStep 为 null 时缺失；map 返回新数组，reverse 它是安全的原地操作。
  const callStackFrames =
    currentStep && currentStep.callStack.length > 0
      ? currentStep.callStack
          .map((frame, idx) => {
            const isTop = idx === currentStep.callStack.length - 1;
            return (
              <div
                key={idx}
                className={`cdp-frame ${isTop ? 'cdp-frame-top' : ''}`}
              >
                <span className="cdp-frame-fn">{frame.functionName}</span>
                <span className="cdp-frame-arg">
                  (node={frame.nodeVal ?? '∅'})
                </span>
                <span className="cdp-frame-depth">d={frame.depth}</span>
              </div>
            );
          })
          .reverse()
      : null;

  return (
    <div className="code-debug-panel">
      <div className="cdp-header">
        <span className="cdp-title">▸ AC 代码 Debug</span>
        <span className="cdp-step-badge">
          {method === 'recursive' ? '递归' : '迭代'} · step {stepIndex + 1}/{totalSteps}
        </span>
      </div>

      <div className="cdp-code-block">
        {codeLines.map((line, idx) => {
          const lineNo = idx + 1;
          const isActive = lineNo === activeLine;
          return (
            <div
              key={lineNo}
              className={`cdp-code-line ${isActive ? 'cdp-active' : ''}`}
            >
              <span className="cdp-line-no">{lineNo}</span>
              <code className="cdp-line-text">{line || ' '}</code>
              {isActive && <span className="cdp-marker">▶</span>}
            </div>
          );
        })}
      </div>

      <div className="cdp-section">
        <div className="cdp-section-title" style={{ color: palette.textSecondary }}>
          变量内存
        </div>
        <div className="cdp-var-grid">
          {currentStep?.variables.map((v) => (
            <div
              key={v.name}
              className={`cdp-var-cell ${v.highlight ? 'cdp-var-highlight' : ''}`}
            >
              <span className="cdp-var-name">{v.name}</span>
              <span className={`cdp-var-value cdp-type-${v.type}`}>{v.value}</span>
            </div>
          )) ?? null}
        </div>
      </div>

      <div className="cdp-section">
        <div className="cdp-section-title" style={{ color: palette.textSecondary }}>
          调用栈
        </div>
        <div className="cdp-callstack">
          {callStackFrames}
          <div className="cdp-stack-base">▲ 栈底</div>
        </div>
      </div>
    </div>
  );
}
