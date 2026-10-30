import type { TreeNodeData } from '../../types/TreeNode'
import type { TreeDimensions } from './treeTypes'

export interface MotionTreeNode {
  id: string
  val: number
  x: number
  y: number
  depth: number
  isLeftChild: boolean
  isRightChild: boolean
  parentId: string | null
}

export interface MotionTreeEdge {
  id: string
  source: MotionTreeNode
  target: MotionTreeNode
  isLeft: boolean
  isRight: boolean
}

export function layoutTreeForMotion(data: TreeNodeData, dimensions: TreeDimensions) {
  let count = 0
  const countNodes = (node: TreeNodeData): void => {
    count += 1
    node.children?.forEach(countNodes)
  }
  countNodes(data)
  const width = dimensions.effectiveWidth || dimensions.width
  const height = dimensions.effectiveHeight || dimensions.height
  const nodeRadius = Math.min(Math.max(14, width / (Math.sqrt(count) * 4)), 24)
  const pitch = nodeRadius * 2.5 + 34
  const levelGap = nodeRadius * 3 + 26
  const nodes: MotionTreeNode[] = []
  const byId = new Map<string, MotionTreeNode>()
  let inorderIndex = 0

  const visit = (node: TreeNodeData, depth: number, parentId: string | null, isLeftChild: boolean, isRightChild: boolean) => {
    const children = node.children ?? []
    if (children[0]) visit(children[0], depth + 1, node.nodeId, true, false)
    const item = {
      id: node.nodeId,
      val: node.val,
      x: inorderIndex++ * pitch,
      y: depth * levelGap,
      depth,
      isLeftChild,
      isRightChild,
      parentId,
    }
    nodes.push(item)
    byId.set(item.id, item)
    if (children[1]) visit(children[1], depth + 1, node.nodeId, false, true)
  }
  visit(data, 0, null, false, false)

  const edges: MotionTreeEdge[] = []
  const collectEdges = (node: TreeNodeData): void => {
    node.children?.forEach((child, index) => {
      const source = byId.get(node.nodeId)!
      const target = byId.get(child.nodeId)!
      edges.push({ id: `${source.id}->${target.id}`, source, target, isLeft: index === 0, isRight: index === 1 })
      collectEdges(child)
    })
  }
  collectEdges(data)

  const pad = nodeRadius + 20
  const minX = Math.min(...nodes.map((node) => node.x)) - pad
  const maxX = Math.max(...nodes.map((node) => node.x)) + pad
  const minY = Math.min(...nodes.map((node) => node.y)) - pad
  const maxY = Math.max(...nodes.map((node) => node.y)) + pad
  const structureWidth = Math.max(1, maxX - minX)
  const structureHeight = Math.max(1, maxY - minY)
  const scale = Math.min(width / structureWidth, height / structureHeight) * 0.78
  const offsetX = (width - structureWidth * scale) / 2 - minX * scale
  const offsetY = (height - structureHeight * scale) / 2 - minY * scale
  nodes.forEach((node) => {
    node.x = node.x * scale + offsetX
    node.y = node.y * scale + offsetY
  })
  return { nodes, edges, bounds: { minX: 0, maxX: width, minY: 0, maxY: height }, nodeRadius: nodeRadius * scale }
}
