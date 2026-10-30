import * as d3 from 'd3'
import type { TreeNodeData } from '../../types/TreeNode'
import type { TreeDimensions, TreeRenderOptions } from './treeTypes'
import { layoutTreeForMotion } from './treeMotionLayout'
import { palette } from '../../theme/colors'

export const MOTION = { enter: 220, update: 260, exit: 180 } as const
export const LEGEND = [
  { id: 'current', color: palette.nodeCurrent, text: '当前节点' },
  { id: 'visited', color: palette.nodeVisited, text: '已访问' },
  { id: 'stack', color: palette.nodeInStack, text: '等待回溯' },
  { id: 'idle', color: palette.nodeDefault, text: '未访问' },
]

function transitionDuration(kind: keyof typeof MOTION): number {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : MOTION[kind]
}

function prepareLayers(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
  let defs = svg.select<SVGDefsElement>('defs')
  if (defs.empty()) defs = svg.append('defs')
  const marker = defs.selectAll<SVGMarkerElement, string>('#tree-arrow').data(['tree-arrow']).join('marker')
    .attr('id', 'tree-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 9).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
  marker.selectAll('path').data([null]).join('path').attr('d', 'M0,-4L9,0L0,4')
    .attr('fill', palette.linkDefault)

  const root = svg.selectAll<SVGGElement, string>('g.tree-motion-root').data(['tree']).join('g')
    .attr('class', 'tree-motion-root')
  const layer = (className: string) => root.selectAll<SVGGElement, string>(`g.${className}`).data([className]).join('g').attr('class', className)
  return { root, edges: layer('layer-edges'), nodes: layer('layer-nodes'), labels: layer('layer-labels'), legend: layer('layer-legend') }
}

function fadeExit<T extends d3.BaseType, Datum>(selection: d3.Selection<T, Datum, SVGGElement, unknown>, duration: number) {
  selection.interrupt('exit').interrupt('update').transition('exit').duration(duration)
    .attr('opacity', 0).on('end', function () { d3.select(this).remove() })
}

export const renderTree = (
  svgElement: SVGSVGElement,
  data: TreeNodeData,
  dimensions: TreeDimensions,
  options: TreeRenderOptions,
): void => {
  const { highlightedNodeId, visitedNodeIds = [], stackNodeIds = [], hasStackPanel = false } = options
  const svg = d3.select(svgElement)
  const layout = layoutTreeForMotion(data, {
    ...dimensions,
    effectiveWidth: Math.max(160, (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? 220 : 0)),
  })
  const { root, edges, nodes, labels, legend } = prepareLayers(svg)
  const { minX, maxX, minY, maxY } = layout.bounds
  const effectiveWidth = Math.max(100, (dimensions.effectiveWidth || dimensions.width) - (hasStackPanel ? 220 : 0))
  const effectiveHeight = Math.max(100, dimensions.effectiveHeight || dimensions.height)
  const scale = Math.min(effectiveWidth / (maxX - minX), effectiveHeight / (maxY - minY)) * 0.88 || 1
  const translateX = effectiveWidth / 2 - ((minX + maxX) / 2) * scale
  const translateY = effectiveHeight / 2 - ((minY + maxY) / 2) * scale
  const reduced = transitionDuration('update') === 0
  root.interrupt('update')
  root.attr('transform', `translate(${translateX},${translateY}) scale(${scale})`)

  const edgeData = layout.edges
  const edgeJoin = edges.selectAll<SVGGElement, (typeof edgeData)[number]>('g.tree-edge').data(edgeData, (d) => d.id)
  fadeExit(edgeJoin.exit(), transitionDuration('exit'))
  const edgeEnter = edgeJoin.enter().append('g').attr('class', 'tree-edge').attr('data-edge-id', (d) => d.id).attr('opacity', 0)
  edgeEnter.append('path').attr('class', 'tree-link').attr('fill', 'none').attr('stroke-linecap', 'round')
    .attr('marker-end', 'url(#tree-arrow)')
  const edgeMerged = edgeEnter.merge(edgeJoin as typeof edgeEnter)
  edgeMerged.interrupt('exit').attr('data-edge-id', (d) => d.id)
  const edgePath = edgeMerged.select('path').attr('stroke', (d) => d.isLeft ? palette.linkLeft : d.isRight ? palette.linkRight : palette.linkDefault)
    .attr('stroke-width', 1.8 / scale).attr('stroke-opacity', 0.68)
  const edgePathValue = (d: (typeof edgeData)[number]) => {
    const sx = d.source.x, sy = d.source.y + layout.nodeRadius * 0.82
    const tx = d.target.x, ty = d.target.y - layout.nodeRadius * 0.82
    const midY = (sy + ty) / 2
    return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`
  }
  if (reduced) edgePath.attr('d', edgePathValue)
  else edgePath.transition('update').duration(transitionDuration('update')).ease(d3.easeCubicOut).attr('d', edgePathValue)
  if (reduced) edgeMerged.attr('opacity', 1)
  else edgeMerged.transition('update').duration(transitionDuration('update')).attr('opacity', 1)

  const nodeJoin = nodes.selectAll<SVGGElement, (typeof layout.nodes)[number]>('g.node').data(layout.nodes, (d) => d.id)
  fadeExit(nodeJoin.exit(), transitionDuration('exit'))
  const nodeEnter = nodeJoin.enter().append('g').attr('class', 'node').attr('data-node-id', (d) => d.id)
    .attr('opacity', 0).attr('transform', (d) => `translate(${d.x},${d.y}) scale(0.94)`)
    .attr('data-entering', 'true')
  nodeEnter.append('circle').attr('class', 'node-halo').attr('r', layout.nodeRadius + 6)
  nodeEnter.append('rect').attr('class', 'node-body')
  nodeEnter.append('text').attr('class', 'node-value').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
  const rectWidth = layout.nodeRadius * 2.35
  const rectHeight = layout.nodeRadius * 1.8
  const nodeMerged = nodeEnter.merge(nodeJoin as typeof nodeEnter).interrupt('exit')
    .attr('data-node-id', (d) => d.id)
    .attr('data-status', (d) => highlightedNodeId === d.id ? 'current' : visitedNodeIds.includes(d.id) ? 'visited' : stackNodeIds.includes(d.id) ? 'stack' : 'idle')
    .classed('current', (d) => highlightedNodeId === d.id)
    .classed('visited', (d) => visitedNodeIds.includes(d.id))
    .classed('stack', (d) => stackNodeIds.includes(d.id))
  nodeMerged.select('circle.node-halo').attr('r', layout.nodeRadius + 6)
  nodeMerged.select('rect.node-body').attr('x', -rectWidth / 2).attr('y', -rectHeight / 2)
    .attr('width', rectWidth).attr('height', rectHeight).attr('rx', Math.max(7, layout.nodeRadius * 0.28))
  nodeMerged.select('text.node-value').attr('font-size', Math.max(11, Math.min(15, layout.nodeRadius * 0.72))).text((d) => String(d.val))
  if (reduced) nodeMerged.attr('opacity', 1).attr('transform', (d) => `translate(${d.x},${d.y})`)
  else nodeMerged.transition('update')
    .duration((_, index, group) => d3.select(group[index]).attr('data-entering') ? MOTION.enter : MOTION.update)
    .ease(d3.easeCubicOut).attr('opacity', 1)
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .on('end', function () { d3.select(this).attr('data-entering', null) })

  const labelData = edgeData.map((edge) => ({ id: edge.id, text: edge.isLeft ? '左' : '右', x: edge.source.x + (edge.target.x - edge.source.x) * 0.58, y: edge.source.y + (edge.target.y - edge.source.y) * 0.58 }))
  const labelJoin = labels.selectAll<SVGTextElement, (typeof labelData)[number]>('text.edge-label').data(labelData, (d) => d.id)
  labelJoin.exit().transition('exit').duration(transitionDuration('exit')).attr('opacity', 0).on('end', function () { d3.select(this).remove() })
  const labelEnter = labelJoin.enter().append('text').attr('class', 'edge-label').attr('opacity', 0).attr('text-anchor', 'middle')
  const labelMerged = labelEnter.merge(labelJoin as typeof labelEnter).interrupt('exit').text((d) => d.text)
    .attr('font-size', Math.max(9, 10 / scale)).attr('fill', palette.textSecondary)
  if (reduced) labelMerged.attr('x', (d) => d.x).attr('y', (d) => d.y).attr('opacity', 1)
  else labelMerged.transition('update').duration(transitionDuration('update')).attr('x', (d) => d.x).attr('y', (d) => d.y).attr('opacity', 1)

  const legendItems = legend.selectAll<SVGGElement, (typeof LEGEND)[number]>('g.legend-item').data(LEGEND, (d) => d.id).join(
    (enter) => {
      const group = enter.append('g').attr('class', 'legend-item')
      group.append('circle').attr('r', 4)
      group.append('text').attr('x', 9).attr('y', 3).attr('font-size', 10)
      return group
    },
    (update) => update,
    (exit) => exit.remove(),
  )
  const legendWidth = Math.max(92, ...LEGEND.map((item) => item.text.length * 10 + 28))
  const legendHeight = LEGEND.length * 19 + 12
  const legendX = Math.max(8, effectiveWidth - legendWidth - 12)
  const legendY = 12
  legend.attr('transform', `translate(${legendX},${legendY})`)
  legend.selectAll<SVGRectElement, string>('rect.legend-backdrop').data(['backdrop']).join('rect')
    .attr('class', 'legend-backdrop').attr('width', legendWidth).attr('height', legendHeight).attr('rx', 8)
  legendItems.attr('transform', (_, index) => `translate(12,${16 + index * 19})`)
    .select('text').attr('text-anchor', 'start')
  legendItems.select('circle').attr('cx', 4).attr('fill', (d) => d.color)
  legendItems.select('text').attr('fill', palette.textSecondary).text((d) => d.text)

  // Keep reduced-motion state updates immediate while preserving every status signal.
  if (reduced) svg.selectAll('.node').interrupt()
}
