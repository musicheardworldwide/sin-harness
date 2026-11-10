#!/usr/bin/env node
/**
 * sin-eyes — ask the open page to measure itself.
 *
 *   node /workspace/sin/bin/eyes.js .sin-clock ".sin-clock-time"
 *   node /workspace/sin/bin/eyes.js --raw .sin-clock     # print the full report
 *
 * Writes a request, waits for the page's report, prints a summary. Requires the
 * Web page to be open and visible (a hidden tab does not poll).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/workspace/sin/eyes'
const REQUEST = join(ROOT, 'request.json')
const REPORTS = join(ROOT, 'reports')
const TIMEOUT_MS = 20000

const args = process.argv.slice(2)
const raw = args[0] === '--raw'
const selectors = raw ? args.slice(1) : args
if (selectors.length === 0) selectors.push('.sin-clock')

const id = Date.now()
writeFileSync(REQUEST, JSON.stringify({ id, label: 'cli', selectors }, null, 2))

const deadline = Date.now() + TIMEOUT_MS
let report = null
while (Date.now() < deadline) {
  let files = []
  try {
    files = readdirSync(REPORTS).filter((name) => name.endsWith('.json')).sort()
  } catch {
    files = []
  }
  for (const name of files.slice(-8).reverse()) {
    const path = join(REPORTS, name)
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      if (parsed.requestId === id) {
        report = { path, parsed }
        break
      }
    } catch {
      // A partially written report is not this request's answer.
    }
  }
  if (report) break
  await new Promise((resolve) => setTimeout(resolve, 500))
}

if (!report) {
  console.error('sin-eyes: no report within 20s — is the page open and visible?')
  process.exit(1)
}

if (raw) {
  console.log(JSON.stringify(report.parsed, null, 2))
  process.exit(0)
}

const page = report.parsed.page
console.log(`page  ${page.url}  ${page.viewport.width}x${page.viewport.height} dpr ${page.viewport.dpr}  ${page.colorScheme}`)
console.log(`body  bg ${page.bodyBackground}  color ${page.bodyColor}`)
for (const match of report.parsed.matches) {
  if (match.error) {
    console.log(`\n${match.selector}  ERROR ${match.error}`)
    continue
  }
  console.log(`\n${match.selector}  count ${match.count}`)
  for (const sample of match.samples ?? []) {
    const r = sample.rect
    console.log(`  ${sample.tag}.${sample.classes.split(' ').filter(Boolean).join('.')}`)
    console.log(`  rect    ${r.x},${r.y}  ${r.width}x${r.height}  visible=${sample.visible} inViewport=${sample.inViewport}`)
    console.log(`  type    ${sample.styles.fontSize}/${sample.styles.lineHeight} ${sample.styles.fontWeight}  color ${sample.styles.color}`)
    console.log(`  box     radius ${sample.styles.borderRadius}  padding ${sample.styles.padding}  gap ${sample.styles.gap}`)
    console.log(`  text    ${sample.text}`)
  }
}
console.log(`\nreport  ${report.path}`)
