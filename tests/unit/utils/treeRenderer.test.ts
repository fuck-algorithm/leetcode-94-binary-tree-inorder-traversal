import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { arrayToTree, treeToD3Format } from '../../../src/types/TreeNode'
import { LEGEND, MOTION, renderTree } from '../../../src/utils/tree/treeRenderer'

const data = treeToD3Format(arrayToTree([2, 1, 3]))!
const dimensions = { width: 800, height: 500, effectiveWidth: 800, effectiveHeight: 500 }

function createSvg() {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg')
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('tree renderer motion', () => {
  it('uses short motion tokens and a fixed four-state legend', () => {
    expect(MOTION.enter).toBeLessThan(240)
    expect(MOTION.update).toBeLessThan(300)
    expect(MOTION.exit).toBeLessThan(MOTION.update)
    expect(LEGEND.map((item) => item.id)).toEqual(['current', 'visited', 'stack', 'idle'])
  })

  it('reuses nodes and edges by stable IDs when the active step changes', () => {
    const svg = createSvg()
    document.body.append(svg)
    renderTree(svg, data, dimensions, { highlightedNodeId: data.children?.[0].nodeId })
    const nodeBefore = svg.querySelector(`[data-node-id="${data.children?.[0].nodeId}"]`)
    const edgeBefore = svg.querySelector('[data-edge-id]')

    renderTree(svg, data, dimensions, {
      highlightedNodeId: data.nodeId,
      visitedNodeIds: [data.children?.[0].nodeId ?? ''],
    })

    expect(svg.querySelectorAll('.node')).toHaveLength(3)
    expect(svg.querySelector('[data-status="current"]')?.getAttribute('data-node-id')).toBe(data.nodeId)
    expect(svg.querySelector(`[data-node-id="${data.children?.[0].nodeId}"]`)).toBe(nodeBefore)
    expect(svg.querySelector('[data-edge-id]')).toBe(edgeBefore)
    expect(svg.querySelectorAll('[data-status="current"]')).toHaveLength(1)
    expect(svg.querySelector(`[data-node-id="${data.children?.[0].nodeId}"]`)?.getAttribute('data-status')).toBe('visited')
  })

  it('does not rebuild stable nodes or edges on repeated frames', () => {
    const svg = createSvg()
    document.body.append(svg)
    renderTree(svg, data, dimensions, { highlightedNodeId: data.nodeId })
    const nodesBefore = [...svg.querySelectorAll('.node')]
    const edgesBefore = [...svg.querySelectorAll('.tree-edge')]
    renderTree(svg, data, dimensions, { highlightedNodeId: data.children?.[0].nodeId })

    expect([...svg.querySelectorAll('.node')]).toEqual(nodesBefore)
    expect([...svg.querySelectorAll('.tree-edge')]).toEqual(edgesBefore)
  })

  it('keeps animation state updates immediate when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const svg = createSvg()
    document.body.append(svg)

    renderTree(svg, data, dimensions, {
      highlightedNodeId: data.children?.[0].nodeId,
      action: 'pop',
      narration: '回溯到父节点后继续中序遍历。',
    })
    expect(svg.querySelectorAll('[data-status="current"]')).toHaveLength(1)
    expect(svg.querySelector(`[data-node-id="${data.children?.[0].nodeId}"]`)?.getAttribute('data-status')).toBe('current')
    expect(svg.querySelector('.action-arrow-title')?.textContent).toBe('弹出回溯')
    expect(svg.querySelector('.action-arrow-note')?.textContent).toContain('回溯到父节点')
  })
})
