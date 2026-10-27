// Run against a temporary daemon; never connect to the user's normal PM2_HOME.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { setTimeout as delay } from 'node:timers/promises'

const require = createRequire(import.meta.url)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm2-api-'))
process.env.PM2_HOME = path.join(dir, 'home')
process.env.PM2_SILENT = 'true'
const pm2 = require('pm2')
const call = (method, ...args) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`PM2 ${method} timed out`)),
      10000
    )
    pm2[method](...args, (error, result) => {
      clearTimeout(timer)
      error ? reject(error) : resolve(result)
    })
  })
const name = 'pm2-compat-worker'
const script = path.join(dir, 'worker.ts')
const config = {
  name,
  script,
  interpreter: process.execPath,
  node_args: `--max-old-space-size=64 --require ${require.resolve('sucrase/register')}`,
  max_memory_restart: '128M',
  instances: 1,
  exec_mode: 'cluster',
  wait_ready: true,
  listen_timeout: 5000,
  kill_timeout: 1000,
  env: { PM2_COMPAT_MARKER: 'before', APP_INSTANCES: '1' },
}
fs.writeFileSync(
  script,
  `
  const fs = require('node:fs');
  const marker: string = process.env.PM2_COMPAT_MARKER || '';
  fs.writeFileSync(${JSON.stringify(dir)} + '/' + process.pid + '.json', JSON.stringify({marker, execArgv: process.execArgv}));
  process.on('SIGINT', () => process.exit(0));
  setInterval(() => {}, 1000);
  process.send?.('ready');
`
)
async function workers(count) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const apps = (await call('list')).filter((app) => app.name === name)
    if (
      apps.length === count &&
      apps.every((app) => app.pm2_env.status === 'online')
    )
      return apps
    await delay(100)
  }
  assert.fail(`Expected ${count} online workers`)
}
let exitCode = 0
try {
  assert.equal(typeof pm2.scale, 'function')
  await call('connect', false)
  await call('start', config)
  await workers(1)
  await call('scale', name, 2)
  await workers(2)
  const updated = {
    ...config,
    node_args: config.node_args.replace('=64', '=96'),
    env: { PM2_COMPAT_MARKER: 'after', APP_INSTANCES: '1' },
  }
  await call('restart', { apps: [updated] }, { updateEnv: true })
  if ((await call('list')).filter((app) => app.name === name).length !== 1)
    await call('scale', name, 1)
  const [app] = await workers(1)
  const observed = JSON.parse(
    fs.readFileSync(path.join(dir, `${app.pid}.json`), 'utf8')
  )
  assert.equal(observed.marker, 'after')
  assert.ok(observed.execArgv.includes('--max-old-space-size=96'))
  assert.equal(app.pm2_env.APP_INSTANCES, '1')
  assert.equal(app.pm2_env.max_memory_restart, 128 * 1024 * 1024)
  await assert.rejects(call('scale', name, 1), /Same process number/)
} catch (error) {
  console.error(error)
  exitCode = 1
} finally {
  try {
    await call('killDaemon')
    fs.rmSync(dir, { recursive: true, force: true })
  } catch (error) {
    console.error('Could not clean up temporary PM2 daemon:', error)
    exitCode = 1
  }
}
if (!exitCode)
  console.log(
    `PM2 ${require('pm2/package.json').version}: PASS; TypeScript workers 1 → 2 → 1, restart env/heap updated, temporary daemon stopped`
  )
// PM2 7.1.1 retains an Axon reconnect timer after disconnect. End this CLI only
// after assertions and daemon cleanup have finished, preserving failures above.
process.exit(exitCode)
