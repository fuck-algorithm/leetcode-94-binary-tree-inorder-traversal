# 质量门禁

本仓库按算法可视化 skill 的 B1–B7 与 AC-001–AC-023 验收。当前处于 M4 整改阶段；未通过的门禁必须保持 FAIL，不得以文档或占位脚本代替功能/测试。

## 提交门禁

- `npm run lint`
- `npm run type-check`
- `npm run build`
- `npm run test:unit`
- `npm run test:coverage`（lines/functions ≥60%，branches ≥50%）
- `npm run test:e2e`（15 项 Playwright 必过集合）
- `npm run qa:guard`

## 发布门禁

GitHub Actions 位于 `.github/workflows/deploy.yml`，在 `main` 推送或手动触发后执行安装、qa:guard、lint、type-check、单测、覆盖率、Playwright Chromium E2E 与 build，再使用 Pages 官方 artifact 流程发布。Workflow 配置存在不代表线上部署已触发或完成；须查看对应 Actions run。

## 当前状态

本地执行结果与已知差距记录在 `ACCEPTANCE_REPORT_TEMPLATE.md`。现有 E2E 虽有 15 项，但仍不覆盖 Skill 完整验收矩阵；AC-023 keyed join / 动效教学层、完整视口空间预算及多项 Blocking 产品能力未实现。B1–B7 不满足时结论保持 FAIL，不得仅凭 workflow / 基础测试将报告改为 PASS。
