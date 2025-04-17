# 二叉树中序遍历可视化

<div align="center">

![GitHub license](https://img.shields.io/github/license/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal)
![GitHub stars](https://img.shields.io/github/stars/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal)
![GitHub forks](https://img.shields.io/github/forks/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal)
![GitHub issues](https://img.shields.io/github/issues/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal)

</div>

<p align="center">
  <img src="assets/images/tree-demo.png" alt="二叉树中序遍历演示" width="800" />
</p>

## 📖 项目简介

这是一个交互式的二叉树中序遍历可视化工具，帮助学习者理解二叉树中序遍历算法的实现原理和执行过程。本项目实现了 [LeetCode 94. 二叉树的中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/) 问题的可视化解答。

通过动态展示二叉树的遍历过程，包括节点访问顺序、栈的变化和结果数组的构建，学习者能够直观地理解"左-根-右"的中序遍历模式。

## ✨ 核心特性

- 🌲 **直观的树结构可视化**：使用D3.js渲染二叉树，清晰展示节点关系
- 🔄 **递归和迭代双实现**：提供递归和迭代两种方式的中序遍历实现
- 📊 **详细步骤追踪**：记录并展示遍历过程中的每个细节步骤
- 📚 **栈状态可视化**：直观展示遍历过程中栈的变化情况
- 🎮 **交互式控制**：支持单步执行、自动播放、速度调节等控制功能
- 🎯 **节点高亮**：高亮显示当前访问的节点、已访问节点和栈中节点
- 🎲 **随机树生成**：一键生成随机二叉树进行学习和测试
- 📱 **响应式设计**：适配不同屏幕大小，提供良好的移动设备体验

## 🚀 在线体验

访问 [https://fuck-algorithm.github.io/leetcode-94-binary-tree-inorder-traversal/](https://fuck-algorithm.github.io/leetcode-94-binary-tree-inorder-traversal/) 即可在线体验本项目。

## 📦 本地安装与运行

### 前置条件

- Node.js 16.0.0 或更高版本
- npm 7.0.0 或更高版本

### 安装步骤

1. 克隆仓库

```bash
git clone https://github.com/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal.git
cd leetcode-94-binary-tree-inorder-traversal
```

2. 安装依赖

```bash
npm install
```

3. 启动开发服务器

```bash
npm run dev
```

4. 打开浏览器访问 `http://localhost:5173`

### 构建项目

```bash
npm run build
```

## 🔍 使用指南

1. **树的输入**：
   - 直接输入数组形式的树结构，如 `[1,null,2,3]`
   - 点击"生成随机树"按钮创建随机结构
   - 使用示例按钮选择预设的树结构

2. **遍历算法选择**：
   - 选择"递归"或"迭代"方法实现中序遍历

3. **控制遍历过程**：
   - 使用底部控制栏的按钮控制遍历过程
   - 支持"上一步"、"下一步"、"自动播放"等操作
   - 使用滑块调节自动播放速度
   - 支持键盘快捷键（← → 空格 R）控制

4. **观察结果**：
   - 树可视化区域：显示当前节点访问状态
   - 栈可视化区域：展示栈的变化
   - 结果区域：显示遍历结果数组

## 🛠️ 技术实现

本项目采用了以下技术和库：

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **可视化库**：D3.js
- **状态管理**：React Hooks
- **样式处理**：CSS Module
- **自动部署**：GitHub Actions

### 核心算法实现

<details>
<summary>点击展开查看递归实现</summary>

```typescript
export function inorderTraversalRecursive(root: TreeNode | null): number[] {
  const result: number[] = [];
  
  function inorder(node: TreeNode | null) {
    if (!node) return;
    
    // 左子树
    inorder(node.left);
    
    // 根节点
    result.push(node.val);
    
    // 右子树
    inorder(node.right);
  }
  
  inorder(root);
  return result;
}
```
</details>

<details>
<summary>点击展开查看迭代实现</summary>

```typescript
export function inorderTraversalIterative(root: TreeNode | null): number[] {
  const result: number[] = [];
  const stack: TreeNode[] = [];
  let current = root;
  
  while (current || stack.length) {
    // 一直遍历到最左边的节点
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    // 处理当前节点
    current = stack.pop()!;
    result.push(current.val);
    
    // 处理右子树
    current = current.right;
  }
  
  return result;
}
```
</details>

## 📚 项目结构

```
src/
├── algorithms/           # 算法实现
│   └── inorderTraversal.ts
├── components/           # 界面组件
│   ├── BinaryTreeInorderTraversal.tsx
│   ├── StackVisualization.tsx
│   ├── TreeInputExamples.tsx
│   └── TreeVisualization.tsx
├── types/                # 类型定义
│   └── TreeNode.ts
├── utils/                # 工具函数
│   └── tree/
│       ├── treeAnalysis.ts
│       ├── treeLayout.ts
│       ├── treeOptimization.ts
│       ├── treeRenderer.ts
│       ├── treeScaling.ts
│       └── treeTypes.ts
├── App.tsx
└── main.tsx
```

## 📌 项目规范

项目遵循以下规范确保代码质量和可维护性：

- 模块化设计，清晰的职责分离
- TypeScript 类型安全
- 组件库设计模式
- 算法实现与UI展示分离
- 详细注释和文档
- 统一的代码风格

更多细节请参考 [docs/二叉树可视化规则.md](docs/二叉树可视化规则.md)。

## 🤝 贡献

欢迎贡献代码、报告问题或提出改进建议！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与贡献。

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 📧 联系方式

如有问题或建议，请通过 GitHub Issues 联系我们。

---

<div align="center">
  <sub>Built with ❤️ by fuck-algorithm team</sub>
</div>
