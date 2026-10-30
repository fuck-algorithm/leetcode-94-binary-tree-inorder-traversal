import { describe, expect, it } from 'vitest'
import * as d3 from 'd3'
import { arrayToTree, treeToD3Format } from '../../../src/types/TreeNode'
import { countNodes, determineTreeDepth } from '../../../src/utils/tree/treeAnalysis'
import { layoutTree } from '../../../src/utils/tree/treeEngine'
import { calculateNodeSize, shiftSubtree } from '../../../src/utils/tree/treeLayout'

describe('tree layout utilities', () => {
  it('counts nodes and depth for populated and empty trees', () => {
    const root = treeToD3Format(arrayToTree([1, 2, 3, 4]))
    expect(root).not.toBeNull()
    expect(countNodes(root!)).toBe(4)
    expect(determineTreeDepth(root)).toBe(3)
    expect(determineTreeDepth(null)).toBe(0)
  })

  it('creates stable inorder coordinates with left and right links', () => {
    const data = treeToD3Format(arrayToTree([2, 1, 3]))!
    const layout = layoutTree(data, { width: 900, height: 600 }, false)
    const left = layout.nodes.find((node) => node.isLeftChild)
    const root = layout.nodes.find((node) => node.depth === 0)
    const right = layout.nodes.find((node) => node.isRightChild)

    expect(left?.x).toBeLessThan(root!.x)
    expect(right?.x).toBeGreaterThan(root!.x)
    expect(layout.links).toHaveLength(2)
    expect(layout.bounds.maxX).toBeGreaterThan(layout.bounds.minX)
  })

  it('calculates a readable node size and shifts a whole subtree', () => {
    const data = treeToD3Format(arrayToTree([1, 2, 3]))!
    const size = calculateNodeSize(data, { width: 800, height: 500 })
    const hierarchy = d3.tree<typeof data>().size([100, 100])(d3.hierarchy(data))
    const before = hierarchy.x

    shiftSubtree(hierarchy, 20)
    expect(size).toBeGreaterThan(0)
    expect(hierarchy.x).toBeGreaterThan(before)
  })
})
