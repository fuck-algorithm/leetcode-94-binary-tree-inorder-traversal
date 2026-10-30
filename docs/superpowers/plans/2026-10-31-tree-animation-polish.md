# 二叉树遍历动画视觉优化计划

**目标：**让中序遍历动画状态更易读、过渡更柔和且可追踪，不改遍历算法或页面主布局。

**架构：**`TreeVisualization` 继续把输入树、当前节点、已访问节点和栈节点传给 D3 renderer；renderer 将 SVG 建为一次性分层结构，节点/边/边标签按稳定语义 ID keyed join，通过短命名 transition 更新状态、位置与退场。独立的 `treeMotionLayout.ts` 对中序槽位坐标按实际容器尺寸缩放居中，避免大视口内容跑出 SVG。CSS 承担低幅度状态呼吸及 reduced-motion 关闭。栈面板保持 React 渲染，仅对状态更新增加克制的过渡。

**技术栈：**D3 7、React 19、TypeScript、Vitest 5、Playwright 1.64。

**风险与缓解：**D3 的旧过渡可能在快速跳步留下残影；每次帧更新显式 interrupt 命名 transition，退场结束回调移除，并以快速跳步 E2E 回归。SVG 首次渲染和无数据树需安全处理。reduced-motion 下仍即时更新 DOM 状态。

## 任务

### Task 1：重构树 SVG 渲染

**依赖：**无。修改 `src/utils/tree/treeRenderer.ts` 与 `src/theme/colors.ts`，添加 `tests/unit/utils/treeRenderer.test.ts`。保留现有 `renderTree` 调用接口和中序布局；将背景装饰性渐变改为深石墨/松针绿表面、青绿连接线、克制的 current/visited/stack 状态；节点、边、文字标签及图例分层且通过稳定 ID join；transition 从 220–280ms token 取值，退出元素可靠清理，系统减少动态效果时设为 0ms。

验证：针对第一次绘制、第二帧相同 ID 更新、退场清理、MOTION token 与 reduced-motion 编写 DOM 单测；运行 `npm run test:unit` 与 `npm run type-check`。已完成，tree renderer 覆盖了结构复用与状态更新。

### Task 2：统一树节点与栈面板动效

**依赖：**Task 1。修改 `src/components/TreeVisualization/styles.css` 与 `src/components/StackPanel.css`，增加低对比状态底色、current 细环/单次呼吸、stack 边框信号和简短 transform/opacity 过渡；使用 `@media (prefers-reduced-motion: reduce)` 关闭 CSS 动画与过渡。对栈项使用稳定节点 ID key，避免索引复合 key 造成状态重挂载。

验证：检查样式中 reduced-motion 规则、状态文本对比和 CSS 选择器命中；运行 `npm run lint`。已完成，lint exit 0（保留原有 8 条 React Hooks warnings）。

### Task 3：浏览器视觉回归与证据

**依赖：**Task 1、Task 2。扩展 `tests/e2e/acceptance.spec.ts`：验证切帧后节点 ID 不变且状态正确、连续快速跳步无重复节点/边、reduced-motion 仍更新状态；用 Playwright 在 1920×1080、1366×768 打开目标树并截图复核无溢出/图例可读。

验证：运行 `npm run test:all`，留存 1920×1080 与 1366×768 临时截图；不得因基础用例全绿将未实现的完整 Skill 验收误标为 PASS。已完成，14 项单测、17 项 E2E、覆盖率与生产构建通过；完整 AC 仍为 FAIL，见 `docs/ANIMATION_SPEC.md`。
