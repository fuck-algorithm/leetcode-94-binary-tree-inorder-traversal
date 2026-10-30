import { expect, test } from '@playwright/test'

const sample = '[1,null,2,3]'

test('E2E-001 首屏关键区域在目标尺寸下可见且无滚动', async ({ page }) => {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '二叉树的中序遍历' })).toBeVisible()
    await expect(page.locator('.tree-section')).toBeVisible()
    await expect(page.locator('.code-debug-section')).toBeVisible()
    const sizes = await page.evaluate(() => ({
      canvas: document.querySelector('.tree-section')!.getBoundingClientRect(),
      code: document.querySelector('.code-debug-section')!.getBoundingClientRect(),
      scrollHeight: document.documentElement.scrollHeight,
      height: window.innerHeight,
    }))
    expect(sizes.canvas.height / sizes.height).toBeGreaterThan(0.3)
    expect(sizes.canvas.width / (sizes.canvas.width + sizes.code.width)).toBeGreaterThan(0.5)
    expect(sizes.scrollHeight).toBeLessThanOrEqual(sizes.height + 1)
  }
})

test('E2E-002 Hot 100 与仓库链接使用新标签', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a.back-link')).toHaveAttribute('href', 'https://fuck-algorithm.github.io/leetcode-hot-100/')
  await expect(page.locator('a.back-link')).toHaveAttribute('target', '_blank')
  await expect(page.locator('a.github-corner')).toHaveAttribute('target', '_blank')
})

test('E2E-003 可提交输入可构建演示', async ({ page }) => {
  await page.goto('/')
  await page.locator('#treeInput').fill(sample)
  await page.getByRole('button', { name: '构建' }).click()
  await expect(page.locator('.node')).toHaveCount(3)
})

test('E2E-004 样例与随机树可触发更新', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '例1' }).click()
  await expect(page.locator('#treeInput')).toHaveValue(sample)
  await page.getByRole('button', { name: /随机/ }).click()
  await expect(page.locator('#treeInput')).not.toHaveValue('')
})

test('E2E-005 默认代码面板可见', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.code-debug-panel')).toBeVisible()
  await expect(page.locator('.cdp-code-line')).toHaveCount(15)
  await expect(page.locator('.cdp-code-line').last()).toBeVisible()
  await expect(page.locator('.cdp-state-strip')).toContainText('stack')
  const codeLastLine = await page.locator('.cdp-code-line').last().evaluate((line) => {
    const lineRect = line.getBoundingClientRect()
    const codeRect = document.querySelector('.cdp-code-block')!.getBoundingClientRect()
    return lineRect.bottom <= codeRect.bottom && lineRect.top >= codeRect.top
  })
  expect(codeLastLine).toBe(true)
})

test('E2E-006 步进更新算法快照', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /下一步/ }).click()
  await expect(page.locator('.cdp-step-badge')).toContainText('2/')
  await expect(page.locator('.node.current')).toHaveCount(1)
})

test('E2E-007 支持方向键与空格播放控制', async ({ page }) => {
  await page.goto('/')
  await page.locator('h1').click()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.cdp-step-badge')).toContainText('2/')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.cdp-step-badge')).toContainText('1/')
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: /暂停/ })).toBeVisible()
})

test('E2E-008 进度条可拖动到不同步骤', async ({ page }) => {
  await page.goto('/')
  const range = page.locator('.step-progress-bar')
  await range.fill('2')
  await expect(page.locator('.cdp-step-badge')).toContainText('3/')
})

test('E2E-009 画布 SVG 和节点可见', async ({ page }) => {
  await page.goto('/')
  await page.locator('#treeInput').fill(sample)
  await page.getByRole('button', { name: '构建' }).click()
  await page.getByRole('button', { name: /下一步/ }).click()
  await expect(page.locator('.tree-visualization-svg')).toBeVisible()
  await expect(page.locator('.node')).toHaveCount(3)
  await expect(page.locator('.layer-edges .tree-edge')).toHaveCount(2)
  await expect(page.locator('.layer-legend .legend-item')).toHaveCount(4)
  await expect(page.locator('.layer-arrows .action-arrow-title')).toBeVisible()
  await expect(page.locator('.layer-arrows .action-arrow-note')).not.toBeEmpty()
})

test('E2E-016 重复跳步复用稳定节点且更新焦点', async ({ page }) => {
  await page.goto('/')
  await page.locator('#treeInput').fill(sample)
  await page.getByRole('button', { name: '构建' }).click()
  await expect(page.locator('.node')).toHaveCount(3)
  const nodeIds = await page.locator('.node').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-node-id')).sort())

  for (let index = 0; index < 6; index += 1) {
    await page.getByRole('button', { name: /下一步/ }).click()
    await page.getByRole('button', { name: /上一步/ }).click()
  }
  await page.getByRole('button', { name: /下一步/ }).click()
  await page.waitForTimeout(400)

  await expect(page.locator('.node')).toHaveCount(3)
  await expect(page.locator('[data-status="current"]')).toHaveCount(1)
  expect(await page.locator('.node').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-node-id')).sort())).toEqual(nodeIds)
})

test('E2E-017 reduced-motion 下仍显示当前节点状态', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('#treeInput').fill(sample)
  await page.getByRole('button', { name: '构建' }).click()
  await page.getByRole('button', { name: /下一步/ }).click()

  await expect(page.locator('[data-status="current"]')).toHaveCount(1)
  await expect(page.locator('.layer-legend .legend-item')).toHaveCount(4)
  await expect(page.locator('.layer-arrows .action-arrow-title')).toBeVisible()
})

test('E2E-010 算法选择控件可用', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('递归').check()
  await expect(page.locator('.cdp-step-badge')).toContainText('递归')
})

test('E2E-011 递归与迭代模式可切换', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('递归').check()
  await page.getByRole('button', { name: /下一步/ }).click()
  await page.getByLabel('迭代').check()
  await expect(page.locator('.cdp-step-badge')).toContainText('迭代')
})

test('E2E-012 随机树按钮保持可见', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /随机/ })).toBeVisible()
})

test('E2E-013 动画速度控件可以调整', async ({ page }) => {
  await page.goto('/')
  await page.locator('#speed').fill('1000')
  await expect(page.locator('.speed-value')).toContainText('1.0秒')
})

test('E2E-014 GitHub 源码入口有效', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a.github-corner')).toHaveAttribute('href', 'https://github.com/fuck-algorithm/leetcode-94-binary-tree-inorder-traversal')
})

test('E2E-015 样式不包含紫色主题 token', async ({ page }) => {
  await page.goto('/')
  const styles = await page.locator('style').allTextContents()
  expect(styles.join('\n')).not.toMatch(/purple|violet/i)
})
