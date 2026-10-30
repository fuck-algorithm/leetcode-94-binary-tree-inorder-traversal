# 测试计划

## 单元测试

使用 Vitest + jsdom。算法层覆盖递归/迭代结果、空树、步骤快照和代码变量映射；布局、输入校验、动画工具和渲染层需要逐步增加独立测试。覆盖率范围由 `vitest.config.ts` 配置。

## 浏览器验收

Playwright Chromium 用例位于 `tests/e2e/acceptance.spec.ts`，共 15 项，覆盖首屏、外链、输入、代码面板、单步/快捷键、进度条、树画布、递归/迭代切换、速度与配色。启动命令为 `npm run test:e2e`，首次执行需安装 Chromium：`npm run test:e2e:install`。

## 当前覆盖缺口

当前 E2E 是针对现有 React 页面与控件的基础回归，并非 Skill 的完整验收矩阵：尚未覆盖 GitHub Star API/IndexedDB 缓存、四语言代码面板、二维码、可验证的拖拽缩放、AC-023 keyed join/reduced motion 教学层，以及 1366×768 / 1920×1080 的完整空间预算阈值。当前项目仍缺少 `features/` 与 `services/` 模块，覆盖率按现有 `src/algorithms/`、`src/utils/tree/` 测量，不能等同于模板规定的统计范围。验收报告须如实记录这些差距，不得用基础 E2E 代替完整 AC 验收。
