import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import {
  minifierCandidates,
  qualityFixtures,
  makeInput,
} from './minifier-candidates.mjs'
import { loadOptimization, root } from './html-optimization-fixtures.mjs'

const candidates = await minifierCandidates()
const api = loadOptimization()
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_EXECUTABLE ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
async function snapshot(html) {
  const page = await browser.newPage()
  try {
    await page.setRequestInterception(true)
    page.on('request', (request) => request.abort())
    await page.setContent(html, { waitUntil: 'load' })
    return await page.evaluate(() => {
      document.querySelector('button')?.click()
      return {
        visibleText: document.body.innerText.trim(),
        pre: [...document.querySelectorAll('pre')].map(
          (node) => node.textContent
        ),
        textarea: [...document.querySelectorAll('textarea')].map(
          (node) => node.value
        ),
        jsonLd: [
          ...document.querySelectorAll('script[type="application/ld+json"]'),
        ].map((node) => JSON.parse(node.textContent)),
        links: [...document.querySelectorAll('a')].map((node) => [
          node.getAttribute('href'),
          node.title,
          node.innerText,
        ]),
        images: [...document.querySelectorAll('img')].map((node) => [
          node.alt,
          node.getAttribute('src'),
        ]),
        inputs: [...document.querySelectorAll('input')].map((node) => [
          node.type,
          node.value,
          node.checked,
          node.disabled,
        ]),
        svg: [...document.querySelectorAll('svg')].map((node) => [
          node.namespaceURI,
          node.getAttribute('viewBox'),
          node.querySelector('path')?.getAttribute('d'),
        ]),
        answer: window.answer ?? null,
        clicked: window.clicked ?? null,
        language: document.documentElement.lang,
      }
    })
  } finally {
    await page.close()
  }
}

const results = []
try {
  const originals = {}
  for (const [fixture, html] of Object.entries(qualityFixtures))
    originals[fixture] = await snapshot(html)
  for (const candidate of candidates) {
    const checks = []
    for (const [fixture, html] of Object.entries(qualityFixtures)) {
      try {
        const output = await candidate.run(makeInput(html))
        const observed = await snapshot(output)
        assert.deepEqual(observed, originals[fixture])
        checks.push({ fixture, passed: true })
      } catch (error) {
        checks.push({ fixture, passed: false, error: error.message })
      }
    }
    const words = await api.shallowOptimizeContent(
      '<div>thomas</div><div><i/></div><div>edition</div>'
    )
    const runFragment = candidate.runFragment || candidate.run
    const spacingOutput = await runFragment(makeInput(words))
    checks.push({
      fixture: 'single_space_between_words',
      passed: spacingOutput.trim() === 'thomas edition',
      exactSerialization: spacingOutput === 'thomas edition',
      output: spacingOutput,
    })
    // This is the real consumer after minification in the production pipeline.
    const link = '<a href="/details">Click here</a>'
    const minified = await runFragment(makeInput(link))
    const deepOutput = await api.deepOptimizeContent(minified)
    const visible = deepOutput.replace(/<[^>]*>/g, '').trim()
    checks.push({
      fixture: 'deep_pipeline_link',
      passed: visible === '/details',
      minified,
      output: deepOutput,
    })
    const row = { candidate: candidate.id, version: candidate.version, checks }
    results.push(row)
    console.log(
      JSON.stringify({
        candidate: candidate.id,
        passed: checks.filter((c) => c.passed).length,
        total: checks.length,
        failures: checks
          .filter((c) => !c.passed)
          .map((c) => ({ fixture: c.fixture, ...c })),
      })
    )
  }
} finally {
  await browser.close()
}
const dir = path.join(root, '.vps-lab/minifier-results')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(
  path.join(dir, 'quality.json'),
  JSON.stringify({ node: process.version, results }, null, 2)
)
