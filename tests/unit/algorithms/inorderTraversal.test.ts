import { describe, expect, it } from 'vitest'
import { arrayToTree } from '../../../src/types/TreeNode'
import {
  inorderTraversalIterative,
  inorderTraversalIterativeWithSteps,
  inorderTraversalRecursive,
  inorderTraversalRecursiveWithSteps,
} from '../../../src/algorithms/inorderTraversal'
import { enrichStepsWithDebug } from '../../../src/algorithms/inorderTraversalCodeSteps'

describe('inorder traversal', () => {
  it.each([
    ['iterative', inorderTraversalIterative],
    ['recursive', inorderTraversalRecursive],
  ] as const)('%s visits nodes in left-root-right order', (_, traversal) => {
    expect(traversal(arrayToTree([1, null, 2, 3]))).toEqual([1, 3, 2])
    expect(traversal(null)).toEqual([])
  })

  it('keeps the iterative step snapshots consistent with the result', () => {
    const root = arrayToTree([1, null, 2, 3])
    const steps = inorderTraversalIterativeWithSteps(root)
    const finalStep = steps.at(-1)

    expect(finalStep?.result).toEqual([1, 3, 2])
    expect(new Set(steps.map((step) => step.currentId).filter(Boolean)).size).toBe(3)
    expect(steps.every((step) => Array.isArray(step.stackVals) && Array.isArray(step.visitedIds))).toBe(true)
  })

  it('keeps the recursive step snapshots consistent with the result', () => {
    const root = arrayToTree([1, null, 2, 3])
    const steps = inorderTraversalRecursiveWithSteps(root)

    expect(steps.at(-1)?.result).toEqual([1, 3, 2])
    expect(steps.some((step) => step.action === 'push')).toBe(true)
    expect(steps.some((step) => step.action === 'pop')).toBe(true)
  })

  it('maps debug state to valid code lines and preserves variable snapshots', () => {
    const root = arrayToTree([1, null, 2, 3])
    const steps = inorderTraversalIterativeWithSteps(root)
    const debugSteps = enrichStepsWithDebug(steps, 'iterative', root)

    expect(debugSteps.every((step) => step.codeLine >= 1 && step.codeLine <= 15)).toBe(true)
    expect(debugSteps.every((step) => step.variables.some((variable) => variable.name === 'result'))).toBe(true)
  })
})
