import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const project = fileURLToPath(new URL('../../', import.meta.url))

function buildFixture({ fail, staging = false, missing } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'build-pipeline-'))
  const write = (file, content, mode) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), content, { mode })
  }
  const record = `require('node:fs').appendFileSync('events', name + '\\n')`
  write(
    'config/scripts/build.mjs',
    readFileSync(new URL('./build.mjs', import.meta.url))
  )
  mkdirSync(path.join(root, 'node_modules/.bin'), { recursive: true })
  symlinkSync(
    path.join(project, 'node_modules/sucrase'),
    path.join(root, 'node_modules/sucrase')
  )
  for (const name of ['BeforeBuildHandler', 'AfterBuildHandler']) {
    write(
      `server/src/utils/${name}.ts`,
      `const name=${JSON.stringify(name)}; ${record}`
    )
  }
  for (const name of ['tsc', 'eslint', 'vite']) {
    if (name === missing) continue
    write(
      `node_modules/.bin/${name}`,
      `#!${process.execPath}
const fs = require('node:fs');
const name = ${JSON.stringify(name)};
${record};
if (name === 'vite') process.exit(0);
const other = name === 'tsc' ? 'eslint' : 'tsc';
const started = Date.now();
const timer = setInterval(() => {
  const events = fs.readFileSync('events', 'utf8').split('\\n');
  if (events.includes(other) || process.env.FAIL_CHECK || Date.now() - started > 1000) {
    clearInterval(timer);
    process.exit(process.env.FAIL_CHECK === name ? 1 : events.includes(other) ? 0 : 2);
  }
}, 10);
`,
      0o755
    )
  }
  const env = { ...process.env, FAIL_CHECK: fail ?? '' }
  delete env.DEPLOY_STAGING_DIR
  if (staging) env.DEPLOY_STAGING_DIR = path.join(root, 'stage with spaces')
  try {
    const result = spawnSync(process.execPath, ['config/scripts/build.mjs'], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 5000,
    })
    const events = readFileSync(path.join(root, 'events'), 'utf8')
      .trim()
      .split('\n')
    return { ...result, events }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('both checks run together and finish before Vite publishes', () => {
  const result = buildFixture()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.events[0], 'BeforeBuildHandler')
  assert.deepEqual(
    new Set(result.events.slice(1, 3)),
    new Set(['tsc', 'eslint'])
  )
  assert.deepEqual(result.events.slice(3), ['vite', 'AfterBuildHandler'])
})

for (const fail of ['tsc', 'eslint']) {
  test(`${fail} failure prevents Vite and after-build side effects`, () => {
    const result = buildFixture({ fail })
    assert.equal(result.status, 1)
    assert.equal(result.events.includes(fail), true)
    assert.equal(result.events.includes('vite'), false)
    assert.equal(result.events.includes('AfterBuildHandler'), false)
  })
}

test('staged build skips the live after-build handler', () => {
  const result = buildFixture({ staging: true })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.events.includes('vite'), true)
  assert.equal(result.events.includes('AfterBuildHandler'), false)
})

test('missing executable reports a build failure without publishing', () => {
  const result = buildFixture({ missing: 'vite' })
  assert.equal(result.status, 1)
  assert.equal(result.events.includes('AfterBuildHandler'), false)
})
