import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const required = [
  'docs/QUALITY_GATE.md',
  'docs/TEST_PLAN.md',
  'docs/ACCEPTANCE_CHECKLIST.md',
  'docs/ACCEPTANCE_REPORT_TEMPLATE.md',
  'docs/PROGRESSIVE_DELIVERY.md',
  'docs/PLAYWRIGHT_CASES.md',
  'docs/ANIMATION_SPEC.md',
  '.github/workflows/deploy.yml',
  'tests/unit',
]
const missing = required.filter((path) => !existsSync(join(process.cwd(), path)))
if (missing.length) {
  console.error(`QA guard failed; missing required paths:\n${missing.map((path) => `- ${path}`).join('\n')}`)
  process.exit(1)
}

const animationSpec = readFileSync(join(process.cwd(), 'docs/ANIMATION_SPEC.md'), 'utf8')
if (animationSpec.includes('TODO:')) {
  console.error('QA guard failed; docs/ANIMATION_SPEC.md still has TODO markers')
  process.exit(1)
}

const workflow = readFileSync(join(process.cwd(), '.github/workflows/deploy.yml'), 'utf8')
const requiredWorkflowTokens = [
  'npm ci',
  'npm install',
  'npm run lint',
  'npm run type-check',
  'npm run build',
  'actions/configure-pages',
  'actions/upload-pages-artifact',
  'actions/deploy-pages',
]
const missingWorkflowTokens = requiredWorkflowTokens.filter((token) => !workflow.includes(token))
if (missingWorkflowTokens.length) {
  console.error(`QA guard failed; Pages workflow is missing required steps:\n${missingWorkflowTokens.map((token) => `- ${token}`).join('\\n')}`)
  process.exit(1)
}

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
if (!packageJson.scripts['test:e2e']?.includes('playwright')) {
  console.error('QA guard failed; test:e2e must run the Playwright suite')
  process.exit(1)
}

console.log('QA guard passed: delivery documents, animation specification, and Pages quality workflow exist.')
