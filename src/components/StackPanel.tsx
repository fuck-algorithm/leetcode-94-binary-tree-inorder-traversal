// src/components/StackPanel.tsx
import { palette } from '../theme/colors';
import './StackPanel.css';

interface StackPanelProps {
  stack: string[];
  stackVals: number[];
  currentVal: number | null;
  action: 'push' | 'pop' | 'visit' | 'move_right';
  description: string;
  result: number[];
}

const ACTION_META: Record<
  StackPanelProps['action'],
  { label: string; color: string; icon: string }
> = {
  push: { label: '入栈 PUSH', color: palette.action.push, icon: '⬇' },
  pop: { label: '出栈 POP', color: palette.action.pop, icon: '⬆' },
  visit: { label: '访问 VISIT', color: palette.action.visit, icon: '●' },
  move_right: { label: '转向右子树', color: palette.action.moveRight, icon: '→' },
};

function getPhase(description: string): string {
  if (description.includes('初始化')) return '初始化';
  if (description.includes('开始遍历') || description.includes('根节点')) return '访问根节点';
  if (description.includes('左子')) return '遍历左子树';
  if (description.includes('加入结果')) return '访问当前节点';
  if (description.includes('右子')) return '遍历右子树';
  if (description.includes('遍历完成')) return '结束遍历';
  return '遍历中';
}

export default function StackPanel({
  stack,
  stackVals,
  currentVal,
  action,
  description,
  result,
}: StackPanelProps) {
  const meta = ACTION_META[action] ?? ACTION_META.visit;
  const phase = getPhase(description);

  return (
    <div className="stack-panel">
      <div className="sp-header">
        <span className="sp-title">stk 栈状态</span>
        <span
          className="sp-action-badge"
          style={{ backgroundColor: meta.color }}
        >
          {meta.icon} {meta.label}
        </span>
      </div>

      <div className="sp-phase-row">
        <span className="sp-phase-label">当前阶段</span>
        <span className="sp-phase-value">{phase}</span>
      </div>

      <div className="sp-stack-area">
        <div className="sp-stack-label">栈顶 ↑</div>
        <div className="sp-stack-list">
          {stackVals.length === 0 ? (
            <div className="sp-empty">栈为空 (empty)</div>
          ) : (
            stackVals
              .map((val, idx) => {
                const isTop = idx === stackVals.length - 1;
                return (
                  <div
                    key={`${stack[idx]}-${idx}`}
                    className={`sp-stack-item ${isTop ? 'sp-top' : ''}`}
                  >
                    <span className="sp-item-val">{val}</span>
                    {isTop && <span className="sp-top-tag">TOP</span>}
                  </div>
                );
              })
              .reverse()
          )}
        </div>
        <div className="sp-stack-label">栈底 ↓</div>
      </div>

      <div className="sp-current-row">
        <span className="sp-current-label">current 指针</span>
        <span
          className={`sp-current-val ${currentVal === null ? 'sp-null' : ''}`}
        >
          {currentVal !== null ? currentVal : 'null'}
        </span>
      </div>

      <div className="sp-desc">{description}</div>

      <div className="sp-result-row">
        <span className="sp-result-label">result 结果</span>
        <span className="sp-result-val">
          [{result.join(', ')}]
        </span>
      </div>
    </div>
  );
}
