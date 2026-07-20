// src/theme/colors.ts

/**
 * 多色相扁平化配色 token 系统
 * 每个功能区域用一个主色相，色相间形成节奏但同属一套扁平色板（Tailwind 500/600 级）。
 * CSS 变量（--c-*）在 index.css :root 中同步，组件 CSS 引用 var(--c-*) 而非硬编码 hex。
 */

export const palette = {
  // 主操作色
  primary: '#6366F1',       // 靛蓝 - 主操作 / 代码高亮行  =var(--c-indigo)
  primaryDark: '#4F46E5',

  // 区域主色相（新增，按功能区分）
  cyan: '#06B6D4',          // 青 - 标题/返回链接       =var(--c-cyan)
  cyanDark: '#0891B2',
  indigo: '#6366F1',        // 靛 - 输入区/构建按钮     =var(--c-indigo)
  indigoDark: '#4F46E5',
  pink: '#EC4899',          // 粉 - 步骤进度条          =var(--c-pink)
  pinkDark: '#DB2777',
  emerald: '#10B981',       // 翠绿 - 播放/随机/操作     =var(--c-emerald)
  emeraldDark: '#059669',
  amber: '#F59E0B',         // 琥珀 - 栈/访问           =var(--c-amber)
  amberDark: '#D97706',

  // 节点状态色（保留 key，微调更鲜艳以适配多色背景）
  nodeDefault: '#64748B',   // 石板灰 - 未访问
  nodeCurrent: '#EF4444',   // 红 - 正在访问
  nodeVisited: '#10B981',   // 翠绿 - 已访问
  nodeInStack: '#F59E0B',   // 琥珀 - 在栈中
  nodePopped: '#94A3B8',    // 浅灰 - 已弹出

  // 连接线与边（保留）
  linkDefault: '#94A3B8',
  linkLeft: '#10B981',      // 左子树连线 - 绿
  linkRight: '#EF4444',     // 右子树连线 - 红

  // 操作 badge 配色（保留）
  action: {
    push: '#10B981',        // 入栈 - 绿
    pop: '#EF4444',         // 出栈 - 红
    visit: '#F59E0B',       // 访问 - 琥珀
    moveRight: '#EC4899',   // 右移 - 粉(原紫,移除紫色配色)
    init: '#6366F1',        // 初始化 - 靛
  } as const,

  // 背景 / 表面（深底单一做视觉锚，表面分层）
  bgApp: '#0B1220',         // 深色应用背景  =var(--c-bg)（比上轮 #0F172A 更深更冷）
  bgAppDeep: '#070B14',      // 更深底（代码面板）
  bgSurface: '#1E293B',     // 卡片表面      =var(--c-surface)
  bgSurfaceAlt: '#334155',  // 次级表面      =var(--c-surface-alt)
  bgCode: '#0B1120',        // 代码面板深底
  bgHighlightLine: 'rgba(99, 102, 241, 0.28)', // 代码当前行高亮（随 primary 更新）

  // 文字（保留）
  textPrimary: '#F8FAFC',    // =var(--c-text)
  textSecondary: '#94A3B8',  // =var(--c-text-secondary)
  textMuted: '#64748B',      // =var(--c-text-muted)
  textOnColor: '#FFFFFF',    // =var(--c-text-on-color)

  // 边框（保留，borderActive 随 primary 更新）
  border: '#334155',         // =var(--c-border)
  borderActive: '#6366F1',   // =var(--c-border-active)
} as const;

/** 节点状态 → 填充色（供 treeRenderer 使用） */
export function nodeFillColor(
  isCurrent: boolean,
  isVisited: boolean,
  isInStack: boolean,
): string {
  if (isCurrent) return palette.nodeCurrent;
  if (isVisited) return palette.nodeVisited;
  if (isInStack) return palette.nodeInStack;
  return palette.nodeDefault;
}

/** 节点状态 → 边框色 */
export function nodeStrokeColor(
  isCurrent: boolean,
  isVisited: boolean,
  isInStack: boolean,
): string {
  if (isCurrent) return palette.pinkDark;
  if (isVisited) return '#047857';
  if (isInStack) return palette.amberDark;
  return '#475569';
}
