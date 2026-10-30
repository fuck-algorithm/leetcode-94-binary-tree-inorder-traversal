# Playwright 验收用例

严格按 skill 的 `references/06-playwright-acceptance-matrix.md` 实现并保持 E2E-001–E2E-015 ID 不变：

1. E2E-001 首屏与 1920×1080 / 1366×768 空间预算
2. E2E-002 标题、Hot 100、GitHub 外链
3. E2E-003 非法输入不改变演示，合法输入重算
4. E2E-004 样例和随机树
5. E2E-005 代码语言记忆
6. E2E-006 步骤、代码、变量、画布焦点同步
7. E2E-007 Left/Right/Space/R 快捷键
8. E2E-008 进度条拖拽
9. E2E-009 画布平移与缩放
10. E2E-010 思路弹窗
11. E2E-011 解法切换与独立状态
12. E2E-012 社群二维码浮层比例
13. E2E-013 速度偏好记忆
14. E2E-014 GitHub Star 缓存与失败回退
15. E2E-015 禁止紫色 token

当前清单是测试规划而非测试实现；`test:e2e` 必须在真实 Playwright 文件完成后才能返回 0。
