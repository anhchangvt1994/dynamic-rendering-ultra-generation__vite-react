// Exercise the real adapter against a private daemon, never the user's PM2_HOME.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { deploy, existingPm2 } from '../../config/utils/AutoDeploy.mjs'

const project = fileURLToPath(new URL('../../', import.meta.url))
const temporary = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'auto-deploy-pm2-'))
)
const home = path.join(temporary, 'pm2-home')
// PM2 captures its home on require, so isolate it before loading the package.
process.env.PM2_HOME = home
process.env.PM2_SILENT = 'true'
const require = createRequire(import.meta.url)
const pm2 = require('pm2')
const write = (file, contents) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, contents)
}
const bounded = (promise, label, timeoutMs = 15000) => {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out`)),
        timeoutMs
      )
    }),
  ]).finally(() => clearTimeout(timer))
}
const call = (method, ...args) =>
  bounded(
    new Promise((resolve, reject) => {
      pm2[method](...args, (error, result) =>
        error ? reject(error) : resolve(result)
      )
    }),
    `PM2 ${method}`
  )
const git = (root, args) => {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    timeout: 10000,
  })
  assert.equal(result.status, 0, result.error?.message || result.stderr)
  return result.stdout.trim()
}
const worker = (root, version) => `
const fs = require('node:fs');
const directory = ${JSON.stringify(path.join(root, 'observed'))};
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(directory + '/' + process.pid + '.json', JSON.stringify({ version: ${JSON.stringify(version)}, pid: process.pid }));
process.on('SIGINT', () => process.exit(0));
setInterval(() => {}, 1000);
process.send?.('ready');
`
function fixture(name) {
  const root = path.join(temporary, name)
  write(
    path.join(root, '.gitignore'),
    'node_modules/\n.cache/\ndist/\nserver/dist/\nserver/resources/\nobserved/\n'
  )
  write(path.join(root, 'package.json'), '{"private":true}\n')
  write(path.join(root, 'src/version.js'), 'export const version = 1\n')
  write(path.join(root, 'dist/index.html'), 'old-client')
  write(path.join(root, 'server/resources/index.html'), 'older-client')
  write(path.join(root, 'server/dist/index.js'), worker(root, 'old'))
  write(
    path.join(root, 'server/dist/runtime/cache.dat'),
    'preserve-runtime-cache'
  )
  fs.mkdirSync(path.join(root, 'node_modules'))
  fs.symlinkSync(
    path.join(project, 'node_modules/pm2'),
    path.join(root, 'node_modules/pm2'),
    'dir'
  )
  fs.mkdirSync(path.join(root, '.test-hooks'))
  git(root, ['init', '-q', '-b', 'main'])
  git(root, ['config', 'user.name', 'Auto deployment integration test'])
  git(root, ['config', 'user.email', 'auto-deploy-test@example.invalid'])
  git(root, ['config', 'commit.gpgsign', 'false'])
  git(root, ['config', 'core.hooksPath', '.test-hooks'])
  git(root, ['add', '.'])
  git(root, ['commit', '-qm', 'Initial fixture'])
  return root
}
async function online(root, version, oldPid) {
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    const apps = await call('list')
    const app = apps.find((entry) => entry.pm2_env.pm_cwd === root)
    const marker = app && path.join(root, 'observed', `${app.pid}.json`)
    if (
      app?.pm2_env.status === 'online' &&
      app.pid !== oldPid &&
      fs.existsSync(marker)
    ) {
      if (JSON.parse(fs.readFileSync(marker, 'utf8')).version === version)
        return app
    }
    await delay(100)
  }
  assert.fail(`Expected ${version} worker online for ${path.basename(root)}`)
}

let adapter
let daemonStarted = false
let exitCode = 0
try {
  const root = fixture('managed-checkout')
  const otherRoot = fixture('other-checkout')
  assert.equal(
    await existingPm2(root),
    null,
    'Missing private daemon must not be started by the adapter'
  )
  assert.equal(fs.existsSync(path.join(home, 'rpc.sock')), false)
  daemonStarted = true
  await call('connect', false)
  // Submit both initially: a second object-style start with the same name
  // would restart the first app rather than create the other checkout.
  await call('start', {
    apps: [root, otherRoot].map((cwd) => ({
      name: 'puppeteer-ssr',
      cwd,
      script: path.join(cwd, 'server/dist/index.js'),
      interpreter: process.execPath,
      exec_mode: 'fork',
      instances: 1,
      force: true,
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 1000,
    })),
  })
  const before = await online(root, 'old')
  const otherBefore = await online(otherRoot, 'old')
  pm2.disconnect()
  adapter = await bounded(
    existingPm2(root),
    'Attach existing private PM2 daemon'
  )
  assert.ok(adapter, 'Adapter attaches to the existing private daemon')
  assert.equal((await adapter.list()).length, 2)
  const calls = []
  const run = async (executable, args, options) => {
    assert.equal(options.cwd, root)
    if (executable === 'yarn') {
      calls.push(args[0])
      if (args[0] === 'install') return
      assert.equal(
        fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'),
        'old-client',
        'Builds must leave live client untouched'
      )
      assert.equal(
        fs.readFileSync(path.join(root, 'server/dist/index.js'), 'utf8'),
        worker(root, 'old'),
        'Builds must leave live worker untouched'
      )
      if (args[0] === 'build')
        write(
          path.join(options.env.DEPLOY_STAGING_DIR, 'dist/index.html'),
          'new-client'
        )
      else if (args[0] === 'server-build')
        write(
          path.join(options.env.SERVER_BUILD_OUT_DIR, 'index.js'),
          worker(root, 'new')
        )
      else assert.fail(`Unexpected build step: ${args[0]}`)
    } else {
      assert.equal(executable, process.execPath)
      assert.deepEqual(args, [
        '-r',
        'sucrase/register',
        'server/src/utils/AfterBuildHandler.ts',
      ])
      calls.push('after-build')
      assert.equal(
        fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'),
        'new-client'
      )
      assert.equal(
        fs.readFileSync(path.join(root, 'server/dist/index.js'), 'utf8'),
        worker(root, 'new')
      )
    }
  }
  const options = { root, pm2: adapter, run, log: () => {}, fromHook: true }
  const result = await bounded(
    deploy(options),
    'Staged deployment and real PM2 reload',
    20000
  )
  assert.deepEqual(
    result.processes,
    [before.pm_id],
    'Only this exact checkout may reload'
  )
  assert.deepEqual(calls, ['install', 'build', 'server-build', 'after-build'])
  const after = await online(root, 'new', before.pid)
  assert.equal(after.pm_id, before.pm_id)
  const otherAfter = await online(otherRoot, 'old')
  assert.equal(
    otherAfter.pid,
    otherBefore.pid,
    'Same-name app from another checkout must remain untouched'
  )
  assert.equal(
    otherAfter.pm2_env.restart_time,
    otherBefore.pm2_env.restart_time
  )
  assert.equal(fs.readdirSync(path.join(otherRoot, 'observed')).length, 1)
  assert.equal(
    fs.readFileSync(path.join(root, 'server/dist/runtime/cache.dat'), 'utf8'),
    'preserve-runtime-cache'
  )
  assert.equal(
    fs.readFileSync(path.join(root, 'server/resources/index.html'), 'utf8'),
    'old-client'
  )
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(root, '.cache/auto-deploy/state.json'), 'utf8')
    ).revision,
    result.revision
  )
  assert.equal(fs.existsSync(path.join(root, '.cache/auto-deploy/lock')), false)
  assert.deepEqual(
    fs
      .readdirSync(path.join(root, '.cache/auto-deploy'))
      .filter((name) => name.startsWith('stage-')),
    []
  )
  assert.match(
    (await bounded(deploy(options), 'Repeat revision check')).skipped,
    /already deployed/
  )
  assert.equal(
    (await online(root, 'new')).pid,
    after.pid,
    'Repeated revision must not reload again'
  )
  assert.deepEqual(calls, ['install', 'build', 'server-build', 'after-build'])

  // PM2 can acknowledge reload before the replacement worker crashes. That
  // callback must not commit the deployment until its worker is healthy.
  const stateFile = path.join(root, '.cache/auto-deploy/state.json')
  const priorState = fs.readFileSync(stateFile, 'utf8')
  write(path.join(root, 'src/version.js'), 'export const version = 2\n')
  git(root, ['add', 'src/version.js'])
  git(root, ['commit', '-qm', 'Crashing worker revision'])
  const rejectedRevision = git(root, ['rev-parse', 'HEAD'])
  const crashingWorker = `${worker(root, 'crashing')}\nsetTimeout(() => process.exit(1), 200);\n`
  const failingRun = async (executable, args, options) => {
    assert.equal(options.cwd, root)
    if (executable === 'yarn' && args[0] === 'build') {
      write(
        path.join(options.env.DEPLOY_STAGING_DIR, 'dist/index.html'),
        'broken-client'
      )
    } else if (executable === 'yarn' && args[0] === 'server-build') {
      write(
        path.join(options.env.SERVER_BUILD_OUT_DIR, 'index.js'),
        crashingWorker
      )
    } else {
      assert.equal(executable, process.execPath)
      assert.deepEqual(args, [
        '-r',
        'sucrase/register',
        'server/src/utils/AfterBuildHandler.ts',
      ])
    }
  }
  const rawReload = pm2.reload
  const reloadCallbacks = []
  pm2.reload = function (...args) {
    const callback = args.pop()
    return rawReload.call(this, ...args, (error, result) => {
      reloadCallbacks.push({ id: args[0], succeeded: !error })
      callback(error, result)
    })
  }
  try {
    await assert.rejects(
      bounded(
        deploy({ ...options, run: failingRun }),
        'Crashing-worker rollback',
        35000
      ),
      (error) => {
        assert.match(
          error.message,
          /did not become a stable online replacement/
        )
        assert.notEqual(
          error.message,
          'Crashing-worker rollback timed out',
          'Health check and recovery must finish within the test deadline'
        )
        assert.equal(
          error instanceof AggregateError,
          false,
          'Recovery of the prior worker must succeed'
        )
        return true
      }
    )
  } finally {
    pm2.reload = rawReload
  }
  assert.deepEqual(
    reloadCallbacks,
    [
      { id: before.pm_id, succeeded: true },
      { id: before.pm_id, succeeded: true },
    ],
    'PM2 acknowledges both the crashing reload and the recovery reload'
  )
  assert.ok(
    fs
      .readdirSync(path.join(root, 'observed'))
      .some(
        (name) =>
          JSON.parse(fs.readFileSync(path.join(root, 'observed', name), 'utf8'))
            .version === 'crashing'
      ),
    'The emitted crashing worker must actually run'
  )
  const recovered = await online(root, 'new', after.pid)
  assert.equal(recovered.pm_id, before.pm_id)
  assert.equal(
    fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'),
    'new-client'
  )
  assert.equal(
    fs.readFileSync(path.join(root, 'server/dist/index.js'), 'utf8'),
    worker(root, 'new')
  )
  assert.equal(
    fs.readFileSync(path.join(root, 'server/resources/index.html'), 'utf8'),
    'old-client'
  )
  assert.equal(
    fs.readFileSync(path.join(root, 'server/dist/runtime/cache.dat'), 'utf8'),
    'preserve-runtime-cache'
  )
  assert.equal(
    fs.readFileSync(stateFile, 'utf8'),
    priorState,
    'Rejected revision must leave deployment state unchanged'
  )
  assert.notEqual(JSON.parse(priorState).revision, rejectedRevision)
  assert.equal(fs.existsSync(path.join(root, '.cache/auto-deploy/lock')), false)
  assert.deepEqual(
    fs
      .readdirSync(path.join(root, '.cache/auto-deploy'))
      .filter((name) => name.startsWith('stage-')),
    []
  )
  assert.equal(
    (await online(otherRoot, 'old')).pid,
    otherBefore.pid,
    'Crash recovery must leave the other checkout untouched'
  )
} catch (error) {
  console.error(error)
  exitCode = 1
} finally {
  try {
    // The only loaded PM2 API was bound to this private home before require.
    assert.equal(process.env.PM2_HOME, home)
    if (daemonStarted) await call('killDaemon')
    adapter?.disconnect()
    pm2.disconnect()
    fs.rmSync(temporary, { recursive: true, force: true })
  } catch (error) {
    console.error(
      'Could not clean up the private auto-deploy PM2 fixture:',
      error
    )
    exitCode = 1
  }
}
if (!exitCode)
  console.log(
    `PM2 ${require('pm2/package.json').version}: PASS; existing daemon adapter, exact checkout reload, staged worker/client publish, runtime cache preserved, duplicate revision skipped, crashing reload rejected and recovered, private daemon stopped`
  )
// PM2 retains reconnect timers after disconnect; exit only after cleanup.
process.exit(exitCode)
