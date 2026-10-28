import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { createHash } from 'node:crypto'
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import { minifierCandidates, minifierFixtures } from './minifier-candidates.mjs'
import { root } from './html-optimization-fixtures.mjs'

const candidates = await minifierCandidates()
const fixtures = await minifierFixtures(process.argv.slice(2))
const count = Number(process.env.MINIFIER_SAMPLES) || 31
const results = []
for (const [fixture, input] of Object.entries(fixtures)) {
  const inputBrotli9Bytes = brotliCompressSync(input.html, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 9 },
  }).length
  const samples = Object.fromEntries(candidates.map((c) => [c.id, []]))
  const output = {}
  for (let iteration = 0; iteration < count + 5; iteration++) {
    for (const candidate of iteration % 2
      ? candidates.toReversed()
      : candidates) {
      const start = performance.now()
      output[candidate.id] = await candidate.run(input)
      if (iteration >= 5) samples[candidate.id].push(performance.now() - start)
    }
  }
  assert.ok(
    input.buffer.equals(Buffer.from(input.html)),
    'A minifier mutated the shared fixture buffer'
  )
  for (const candidate of candidates) {
    const values = samples[candidate.id].sort((a, b) => a - b)
    const row = {
      fixture,
      candidate: candidate.id,
      version: candidate.version,
      inputBytes: Buffer.byteLength(input.html),
      inputBrotli9Bytes,
      outputBytes: Buffer.byteLength(output[candidate.id]),
      outputSha256: createHash('sha256')
        .update(output[candidate.id])
        .digest('hex'),
      brotli9Bytes: brotliCompressSync(output[candidate.id], {
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 9 },
      }).length,
      medianMs: +values[Math.floor(values.length / 2)].toFixed(4),
      p95Ms: +values[Math.ceil(values.length * 0.95) - 1].toFixed(4),
    }
    results.push(row)
    console.log(JSON.stringify(row))
  }
}
const dir = path.join(root, '.vps-lab/minifier-results')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(
  path.join(dir, 'benchmark.json'),
  JSON.stringify(
    {
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      cpu: os.cpus()[0].model,
      samples: count,
      warmup: 5,
      timingIncludes:
        'string to Buffer where required, native/JS minify and output to string; excludes Brotli',
      candidates: candidates.map(
        ({ run, runFragment, ...candidate }) => candidate
      ),
      results,
    },
    null,
    2
  )
)
