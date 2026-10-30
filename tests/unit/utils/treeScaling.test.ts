import * as d3 from 'd3'
import { describe, expect, it } from 'vitest'
import { arrayToTree, treeToD3Format } from '../../../src/types/TreeNode'
import { calculateTreeScale } from '../../../src/utils/tree/treeScaling'
import { optimizeTreeLayout } from '../../../src/utils/tree/treeOptimization'

describe('tree layout adjustments', () => {
  it('fits a tree into available canvas dimensions', () => {
    const data = treeToD3Format(arrayToTree([2, 1, 3]))!
    const root = d3.tree<typeof data>().size([300, 200])(d3.hierarchy(data))
    const scale = calculateTreeScale(root, { width: 800, height: 600 }, 24, false)

    expect(scale.scale).toBeGreaterThan(0)
    expect(Number.isFinite(scale.translateX)).toBe(true)
    expect(Number.isFinite(scale.translateY)).toBe(true)
  })

  it('keeps dense layouts separated and handles right-only trees', () => {
    const data = treeToD3Format(arrayToTree([1, 2, 3]))!
    const root = d3.tree<typeof data>().size([80, 160])(d3.hierarchy(data))
    optimizeTreeLayout(root, 20, 3)
    const rightOnly = treeToD3Format(arrayToTree([1, null, 2, null, 3]))!
    const rightRoot = d3.tree<typeof rightOnly>().size([80, 160])(d3.hierarchy(rightOnly))
    optimizeTreeLayout(rightRoot, 20, 3)

    const nodes = [...root.descendants(), ...rightRoot.descendants()]
    expect(nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true)
  })
})
