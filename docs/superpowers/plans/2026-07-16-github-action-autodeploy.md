# GitHub Action 自动部署修复 + 合并到主分支 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修复 GitHub Action，使任何代码变更推送到 main 时自动部署 GitHub Pages；将可视化升级的 feature 分支直接合并并推送到 main；验证线上部署的是最新代码。

**Architecture:** 数据流：开发者 push origin/main → GitHub Actions `on: push: branches:[main]` 触发 → checkout/setup-node/npm ci/npm run build → JamesIves/github-pages-deploy-action 将 dist 推到 gh-pages 分支 → GitHub Pages 从 gh-pages 分支发布。本次修复 workflow（升级 action 版本 + Node 20 + 并发控制 + 手动触发兜底），再 push main 触发首次真实自动部署，最后用 GitHub API 验证 run 成功且 gh-pages 指向最新 commit。

**Tech Stack:** GitHub Actions（actions/checkout@v4, actions/setup-node@v4, JamesIves/github-pages-deploy-action@v4）, Node 20, gh CLI

**Root Cause（为什么之前没触发自动部署）:**
- workflow 文件 `deploy-to-gh-pages.yml` 在 `d64b279`（2025-04-17）**首次提交**时随该 push 一起新增。GitHub 的行为：一个 push 同时引入新 workflow 文件时，**该次 push 不会触发这个新 workflow**（workflow 必须先存在于分支默认配置中才会被后续 push 触发）。
- 随后 `754686e`→`3a81e47` 推送到 main，GitHub Actions API `actions/runs?event=push&branch=main` 返回 `total_count: 0` —— 这些推送**理应触发却未触发**。结合 Actions 权限 `enabled:true / allowed_actions:all` 正常，最可能原因：当时 workflow 文件刚加入、仓库 Actions 处于首次启用后的"冷启动"状态，或推送方式（force-push / 直接 web 提交）未满足触发条件。无论如何，**线上 gh-pages 最新部署对应 `d4165df`，是通过本地 `npm run deploy`（gh-pages npm 包）推送的，不是 Action 部署的**；`3a81e47` 及之后的代码从未自动部署，线上不是最新代码。
- 本 Plan 通过一次新的 main push（携带 workflow 修复 + 可视化升级合并）来打破冷启动，验证 Action 正常触发。

**Risks:**
- Task1 改 workflow 后该提交 push 也应触发部署——正是要验证的，若仍不触发需进一步排查 org Actions 限制（当前 API 显示无限制，风险低）
- Task2 直接 merge push 到 main（用户明确要求不用 PR）→ 缓解：先本地 build 验证通过再 push
- Task3 验证依赖 GitHub 端 Action 运行，有网络/排队延迟 → 缓解：用 gh api 轮询 run status，超时 5 分钟

---

## Task 1: 加强并修复 GitHub Action 工作流

**Depends on:** None
**Files:**
- Modify: `.github/workflows/deploy-to-gh-pages.yml:1-36`

- [ ] **Step 1: 重写 workflow — 升级 action 版本、Node 20、并发控制、手动触发兜底**
文件: `.github/workflows/deploy-to-gh-pages.yml:1-36`

```yaml
name: 部署到Github Pages

on:
  push:
    branches:
      - main  # 任何代码变更推送到 main 都触发
  workflow_dispatch: {}  # 允许在 Actions 页面手动触发，作为兜底

# 部署并发控制：同一分支新 run 开始时取消旧的正在进行的 run
concurrency:
  group: pages
  cancel-in-progress: true

# 设置GITHUB_TOKEN的权限
permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 设置Node.js环境
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 安装依赖
        run: npm ci

      - name: 构建项目
        run: npm run build

      - name: 部署到GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist     # 要部署的文件夹
          branch: gh-pages # 部署到的分支
          clean: true      # 自动清理旧文件
```

- [ ] **Step 2: 更新 DEPLOY.md 说明 — 反映"任意代码变更自动触发"与手动触发**
文件: `DEPLOY.md`（替换第 5-8 行的"工作流程说明"区块）

```markdown
当代码推送到main分支时，GitHub Actions会自动执行以下步骤：

1. 检出代码
2. 设置Node.js 20环境
3. 安装依赖（npm ci）
4. 构建项目（npm run build）
5. 将构建产物部署到gh-pages分支

> **任何代码变更**推送到 main 都会触发自动部署（不限定路径）。
> 如遇未自动触发的异常，可在仓库 Actions 页面对 "部署到Github Pages" 工作流手动点击 `Run workflow`（workflow_dispatch）作为兜底。
> 同一分支新的部署会自动取消旧的正在进行的部署（并发控制）。
```

- [ ] **Step 3: 验证 workflow YAML 语法合法**
Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy-to-gh-pages.yml')); print('YAML OK')"`
Expected:
  - Exit code: 0
  - Output contains: "YAML OK"

- [ ] **Step 4: 提交**
Run: `git add .github/workflows/deploy-to-gh-pages.yml DEPLOY.md && git commit -m "ci: 升级gh-pages部署workflow至Node20+actions v4并加手动触发与并发控制"`

---

## Task 2: 合并可视化升级到 main 并推送触发部署

**Depends on:** Task 1
**Files:**
- 无文件改动（git 操作：本地 main 已合并 feature 分支，本 Task 推送 + 提交 workflow 修复）

- [ ] **Step 1: 确认本地 main 已包含可视化升级合并 + build 通过**
Run: `git branch --show-current && git log --oneline -2 && npm run build`
Expected:
  - Output contains: "main"
  - Output contains: "merge: 可视化全面升级"
  - Exit code: 0
  - Output contains: "built in"

（注：本地 main 已在 Plan 编写阶段执行 `git merge --no-ff feature/visualization-upgrade` 合并为 `9ce17ee`，build 已验证通过。）

- [ ] **Step 2: 推送 main 到 origin — 触发 GitHub Action 自动部署**
Run: `git push origin main`
Expected:
  - Exit code: 0
  - Output contains: "remote: " 或 "To github.com:fuck-algorithm/..."（推送成功）
  - Output does NOT contain: "error: failed to push" 或 "! [rejected]"

（此 push 携带 workflow 修复 + 可视化升级合并，将触发 Task1 修复后的首次真实自动部署。）

- [ ] **Step 3: 验证 push 后远程 main 与本地一致**
Run: `git log --oneline origin/main -2`
Expected:
  - Exit code: 0
  - Output contains: "merge: 可视化全面升级" 和 "ci: 升级gh-pages部署workflow"

---

## Task 3: 验证 Action 自动运行且线上部署最新代码

**Depends on:** Task 2
**Files:** 无（纯验证：GitHub API 轮询）

- [ ] **Step 1: 轮询 GitHub Actions run 状态 — 确认 push 触发了部署**
Run: `for i in $(seq 1 30); do sleep 10; STATUS=$(gh api repos/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal/actions/runs --jq '.workflow_runs[0] | "\(.status) \(.conclusion) \(.head_sha[0:7]) \(.event)"' 2>/dev/null); echo "[$i] $STATUS"; case "$STATUS" in completed*) break;; esac; done`
Expected:
  - Exit code: 0
  - 最终输出包含: "completed" 和 "push" 以及本地 main HEAD 的前 7 位 sha
  - 最终输出 contains: "success"（conclusion=success）

- [ ] **Step 2: 验证 gh-pages 分支已被 Action 更新到最新 main commit**
Run: `git fetch origin gh-pages 2>&1 && git log --oneline origin/gh-pages -2`
Expected:
  - Exit code: 0
  - Output contains: "Deploying to gh-pages from @ fuck-algorithm/leetcode-94-binary-tree-inorder-traversal"（JamesIves action 的部署提交信息）
  - 部署提交的对应源 commit sha 应为本地 main HEAD（即包含 "merge: 可视化全面升级" 的那个 commit）

- [ ] **Step 3: 验证线上页面加载的是最新构建产物（含新配色/Debug面板）**
Run: `curl -s https://fuck-algorithm.github.io/leetcode-94-binary-tree-inorder-traversal/ | grep -o 'index-[A-Za-z0-9]*\.js' | head -1`
Expected:
  - Exit code: 0
  - Output 包含一个 js 文件名（如 `index-XXXXXX.js`）

对比确认：该 js 文件名应与本地 `npm run build` 产出的 `dist/assets/index-*.js` 文件名一致（同一份构建内容）。若一致，证明线上已是最新代码。

- [ ] **Step 4: 提交（如本 Plan 文档尚未入库，则提交 Plan 文档）**
Run: `git add docs/superpowers/plans/2026-07-16-github-action-autodeploy.md 2>/dev/null; git commit -m "docs: 添加GitHub Action自动部署修复实施计划" 2>/dev/null || echo "no plan doc to commit or already committed"`
Expected:
  - Exit code: 0
  - 若有新文件则提交成功；若无则输出 "no plan doc to commit or already committed"
