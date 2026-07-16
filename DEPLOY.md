# 自动部署到GitHub Pages

本项目配置了GitHub Actions自动部署工作流，可以在代码推送到main分支时自动构建并部署到GitHub Pages。

## 工作流程说明

当代码推送到main分支时，GitHub Actions会自动执行以下步骤：

1. 检出代码
2. 设置Node.js 20环境
3. 安装依赖（npm ci）
4. 构建项目（npm run build）
5. 将构建产物部署到gh-pages分支

> **任何代码变更**推送到 main 都会触发自动部署（不限定路径）。
> 如遇未自动触发的异常，可在仓库 Actions 页面对 "部署到Github Pages" 工作流手动点击 `Run workflow`（workflow_dispatch）作为兜底。
> 同一分支新的部署会自动取消旧的正在进行的部署（并发控制）。

## 配置文件

工作流配置文件位于：`.github/workflows/deploy-to-gh-pages.yml`

## 环境要求

- 项目需要在GitHub上托管
- 需要启用GitHub Pages功能，并设置为从gh-pages分支部署
- 需要为GitHub Actions提供适当的权限

## 如何开启GitHub Pages

1. 进入仓库设置 Settings > Pages
2. 在"Build and deployment"部分:
   - Source: 选择"Deploy from a branch"
   - Branch: 选择"gh-pages"和"/(root)"
3. 点击"Save"保存设置

## 本地部署测试

如果需要在本地测试部署过程，可以使用以下命令：

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 部署到gh-pages分支
npm run deploy
```

## 注意事项

- 工作流使用`JamesIves/github-pages-deploy-action@v4`动作进行部署
- 部署目标是`dist`文件夹
- 每次部署前会自动清理gh-pages分支上的旧文件

## 相关配置

- `vite.config.ts`中的`base`路径设置为项目名称，以确保在GitHub Pages子路径下正确加载资源
- `package.json`中包含预定义的部署脚本，用于本地部署测试 