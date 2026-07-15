// src/theme/colors.ts

/**
 * 扁平化配色 token 系统
 * 所有组件通过此模块获取颜色，禁止在组件内硬编码 hex 值
 */

/** 语义化色板：扁平、饱和度适中、对比明确 */
export const palette = {
  // 主色调
  primary: '#4F46E5',       // 靛蓝 - 主操作 / 代码高亮行
  primaryDark: '#3730A3',

  // 节点状态色
  nodeDefault: '#64748B',   // 石板灰 - 未访问
  nodeCurrent: '#EF4444',   // 红 - 正在访问（current/highlighted）
  nodeVisited: '#10B981',   // 翠绿 - 已访问
  nodeInStack: '#F59E0B',   // 琥珀 - 在栈中
  nodePopped: '#94A3B8',    // 浅灰 - 已弹出

  // 连接线与边
  linkDefault: '#94A3B8',
  linkLeft: '#10B981',      // 左子树连线 - 绿
  linkRight: '#EF4444',     // 右子树连线 - 红

  // 操作 badge 配色
  action: {
    push: '#10B981',        // 入栈 - 绿
    pop: '#EF4444',         // 出栈 - 红
    visit: '#F59E0B',       // 访问 - 琥珀
    moveRight: '#8B5CF6',   // 右移 - 紫
    init: '#6366F1',        // 初始化 - 靛
  } as const,

  // 背景 / 表面
  bgApp: '#0F172A',         // 深色应用背景（取代过淡的 #f5f7fa）
  bgSurface: '#1E293B',     // 卡片表面
  bgSurfaceAlt: '#334155',  // 次级表面
  bgCode: '#0B1120',        // 代码面板深底
  bgHighlightLine: 'rgba(79, 70, 229, 0.28)', // 代码当前行高亮

  // 文字
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textOnColor: '#FFFFFF',

  // 边框
  border: '#334155',
  borderActive: '#4F46E5',
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
  if (isCurrent) return palette.primaryDark;
  if (isVisited) return '#047857';
  if (isInStack) return '#B45309';
  return '#475569';
}
