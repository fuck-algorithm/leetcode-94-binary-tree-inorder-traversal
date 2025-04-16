// 树节点类型定义
interface TreeNode {
  id: number;
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

// 基础树示例
export const basicTree: TreeNode = {
  id: 1,
  val: 1,
  left: {
    id: 2,
    val: 2,
    left: null,
    right: null
  },
  right: {
    id: 3,
    val: 3,
    left: null,
    right: null
  }
};

// 左倾斜树示例
export const leftSkewedTree: TreeNode = {
  id: 1,
  val: 1,
  left: {
    id: 2,
    val: 2,
    left: {
      id: 3,
      val: 3,
      left: null,
      right: null
    },
    right: null
  },
  right: null
};

// 右倾斜树示例
export const rightSkewedTree: TreeNode = {
  id: 1,
  val: 1,
  left: null,
  right: {
    id: 2,
    val: 2,
    left: null,
    right: {
      id: 3,
      val: 3,
      left: null,
      right: null
    }
  }
};

// 复杂树示例
export const complexTree: TreeNode = {
  id: 1,
  val: 1,
  left: {
    id: 2,
    val: 2,
    left: {
      id: 4,
      val: 4,
      left: null,
      right: null
    },
    right: null
  },
  right: {
    id: 3,
    val: 3,
    left: null,
    right: {
      id: 5,
      val: 5,
      left: null,
      right: null
    }
  }
};

// 新增一个适合演示中序遍历的示例树
export const demoTree: TreeNode = {
  id: 1,
  val: 1,
  left: {
    id: 2,
    val: 2,
    left: {
      id: 4,
      val: 4,
      left: null,
      right: null
    },
    right: {
      id: 5,
      val: 5,
      left: null,
      right: null
    }
  },
  right: {
    id: 3,
    val: 3,
    left: {
      id: 6,
      val: 6,
      left: null,
      right: null
    },
    right: {
      id: 7,
      val: 7,
      left: null,
      right: null
    }
  }
};

// 导出树的示例
export const treeExamples = [
  {
    name: "示例1: 简单树",
    tree: basicTree
  },
  {
    name: "示例2: 左倾树",
    tree: leftSkewedTree
  },
  {
    name: "示例3: 右倾树",
    tree: rightSkewedTree
  },
  {
    name: "示例4: 完整二叉树",
    tree: demoTree
  },
  {
    name: "示例5: 复杂树",
    tree: complexTree
  }
]; 