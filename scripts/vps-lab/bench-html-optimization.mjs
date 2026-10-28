import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { execFileSync } from 'node:child_process'
import {
  constantsFile,
  utilsFile,
  pipelineFile,
  root,
  loadOptimization,
  htmlFixtures,
} from './html-optimization-fixtures.mjs'

const mode = process.argv[2] || 'after'
const output = path.join(root, '.vps-lab/html-optimization')
fs.mkdirSync(output, { recursive: true })
const files = [constantsFile, utilsFile, pipelineFile]
const snapshot = path.join(output, 'before-source.json')
const readBaseline = () =>
  !process.env.HTML_BASELINE_REF && fs.existsSync(snapshot)
    ? JSON.parse(fs.readFileSync(snapshot, 'utf8'))
    : Object.fromEntries(
        files.map((file) => [
          file,
          execFileSync(
            'git',
            ['show', `${process.env.HTML_BASELINE_REF || 'HEAD'}:${file}`],
            { cwd: root, encoding: 'utf8' }
          ),
        ])
      )
if (mode === 'before')
  fs.writeFileSync(
    snapshot,
    JSON.stringify(
      Object.fromEntries(
        files.map((file) => [
          file,
          fs.readFileSync(path.join(root, file), 'utf8'),
        ])
      )
    )
  )
const api = loadOptimization(mode === 'baseline' ? readBaseline() : {})
const versions =
  mode === 'compare'
    ? { before: loadOptimization(readBaseline()), after: api }
    : { [mode]: api }
let compressLast
if (mode === 'compare') {
  // Evaluate changing only the position of native minification in the current
  // production pipeline, without changing the source file being measured.
  const source = fs.readFileSync(path.join(root, pipelineFile), 'utf8')
  const compression = 'if (enableToCompress) html = await compressContent(html)'
  if (!source.includes(compression))
    throw new Error('Cannot locate compression stage')
  const candidate = source
    .replace(compression, '')
    .replace(
      "// console.log('finish optimize and compress",
      `${compression}\n// console.log('finish optimize and compress`
    )
  compressLast = loadOptimization({ [pipelineFile]: candidate })
}
const fixtures = htmlFixtures(Number(process.env.HTML_BENCH_CARDS) || 500)
for (const file of process.argv.slice(3))
  fixtures[path.basename(file)] = fs.readFileSync(file, 'utf8')
const results = []
for (const [fixture, html] of Object.entries(fixtures)) {
  for (const method of [
    'lowOptimizeContent',
    'shallowOptimizeContent',
    'optimizeContent',
    'pipeline',
  ]) {
    const candidates =
      method === 'pipeline' && compressLast
        ? { ...versions, 'compress-last': compressLast }
        : versions
    const names = Object.keys(candidates)
    const samples = Object.fromEntries(names.map((name) => [name, []]))
    const rendered = {}
    for (let i = 0; i < 5; i++)
      for (const name of names) await candidates[name][method](html)
    for (let i = 0; i < 21; i++) {
      // Alternate execution order so JIT/GC/CPU drift does not favor one side.
      for (const name of i % 2 ? names.toReversed() : names) {
        const start = performance.now()
        rendered[name] = await candidates[name][method](html)
        samples[name].push(performance.now() - start)
      }
    }
    for (const version of names) {
      samples[version].sort((a, b) => a - b)
      const row = {
        version,
        fixture,
        method,
        inputBytes: Buffer.byteLength(html),
        outputBytes: Buffer.byteLength(rendered[version]),
        medianMs: +samples[version][10].toFixed(3),
        p95Ms: +samples[version][19].toFixed(3),
      }
      results.push(row)
      console.log(JSON.stringify(row))
    }
  }
}
fs.writeFileSync(
  path.join(output, `${mode}.json`),
  JSON.stringify(
    {
      node: process.version,
      platform: `${os.platform()} ${os.arch()}`,
      cpu: os.cpus()[0].model,
      samples: 21,
      results,
    },
    null,
    2
  )
)
