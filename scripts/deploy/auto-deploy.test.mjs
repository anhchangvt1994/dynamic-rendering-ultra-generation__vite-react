import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  dependenciesChanged,
  deploymentDiagnostics,
  deploy,
  managedApps,
  waitForHealthyReplacement,
} from '../../config/utils/AutoDeploy.mjs'

const project = fileURLToPath(new URL('../../', import.meta.url))

test('PM2 diagnostics explain excluded apps without exposing environment secrets', (t) => {
  const f = fixture(t)
  const source = {
    ...f.app,
    pm_id: 8,
    pm2_env: {
      ...f.app.pm2_env,
      pm_exec_path: path.join(f.root, 'server/src/index.uws.worker.ts'),
      env: { SECRET: 'do-not-print-this' },
    },
  }
  const other = {
    ...f.app,
    pm_id: 9,
    pm2_env: { ...f.app.pm2_env, pm_cwd: '/different-checkout' },
  }
  const diagnostics = deploymentDiagnostics(
    f.root,
    [f.app, source, other],
    true
  )
  assert.equal(diagnostics.daemonReachable, true)
  assert.ok(diagnostics.user)
  assert.ok(diagnostics.pm2Home)
  assert.deepEqual(
    diagnostics.processes.map((app) => app.id),
    [7]
  )
  assert.match(
    diagnostics.excludedProcesses.find((app) => app.id === 8).reason,
    /TypeScript/
  )
  assert.match(
    diagnostics.excludedProcesses.find((app) => app.id === 9).reason,
    /checkout/
  )
  assert.equal(JSON.stringify(diagnostics).includes('do-not-print-this'), false)
  assert.equal(deploymentDiagnostics(f.root, [], false).daemonReachable, false)
})

test('PM2 health verification rejects callback success without a live replacement', async () => {
  await assert.rejects(
    waitForHealthyReplacement(
      async () => [{ pm_id: 7, pid: 0, pm2_env: { status: 'errored' } }],
      7,
      123,
      { timeoutMs: 15, stableMs: 5, pollMs: 1 }
    ),
    /stable online replacement/
  )
  await assert.rejects(
    waitForHealthyReplacement(
      async () => [{ pm_id: 7, pid: 123, pm2_env: { status: 'online' } }],
      7,
      123,
      { timeoutMs: 15, stableMs: 5, pollMs: 1 }
    ),
    /stable online replacement/
  )
})

test('PM2 health verification waits for the same new online PID to settle', async () => {
  let reads = 0
  await waitForHealthyReplacement(
    async () => {
      reads++
      return [
        { pm_id: 7, pid: reads < 3 ? 124 : 125, pm2_env: { status: 'online' } },
      ]
    },
    7,
    123,
    { timeoutMs: 1000, stableMs: 10, pollMs: 2 }
  )
  assert.ok(reads >= 5)
})
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}
const command = (cwd, args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'auto deploy test '))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  write(
    path.join(root, '.gitignore'),
    '.cache/\nnode_modules/\ndist/\nserver/dist/\nserver/resources/\n'
  )
  write(path.join(root, 'package.json'), '{"private":true}')
  write(path.join(root, 'src/app.ts'), 'export const version = 1')
  write(path.join(root, 'dist/index.html'), 'old-client')
  write(path.join(root, 'server/dist/index.uws.worker.js'), 'old-server')
  write(path.join(root, 'server/dist/runtime/cache.dat'), 'keep-runtime-cache')
  write(path.join(root, 'server/resources/index.html'), 'older-client-fallback')
  fs.mkdirSync(path.join(root, 'node_modules'))
  command(root, ['init', '-q', '-b', 'main'])
  command(root, ['config', 'user.name', 'Deployment test'])
  command(root, ['config', 'user.email', 'deployment-test@example.invalid'])
  command(root, ['config', 'commit.gpgsign', 'false'])
  command(root, ['config', 'core.hooksPath', '.test-hooks'])
  command(root, ['add', '.'])
  command(root, ['commit', '-qm', 'Initial fixture'])
  const app = {
    pm_id: 7,
    name: 'puppeteer-ssr',
    pm2_env: {
      pm_cwd: root,
      pm_exec_path: path.join(root, 'server/dist/index.uws.worker.js'),
      status: 'online',
    },
  }
  const calls = []
  const pm2 = {
    list: async () => [app],
    reload: async (id) => calls.push(['reload', id]),
  }
  const run = async (executable, args, options) => {
    calls.push([executable === process.execPath ? 'cache' : args[0]])
    if (args[0] === 'build')
      write(
        path.join(options.env.DEPLOY_STAGING_DIR, 'dist/index.html'),
        'new-client'
      )
    if (args[0] === 'server-build') {
      write(
        path.join(options.env.SERVER_BUILD_OUT_DIR, 'index.uws.worker.js'),
        'new-server'
      )
      write(
        path.join(options.env.SERVER_BUILD_OUT_DIR, 'workers/new.js'),
        'new-worker'
      )
    }
  }
  return {
    root,
    app,
    calls,
    pm2,
    run,
    options: { root, pm2, run, log: () => {} },
  }
}

test('builds both outputs before publishing/reloading and preserves runtime files', async (t) => {
  const f = fixture(t)
  f.pm2.reload = async (id) => {
    assert.equal(
      fs.readFileSync(path.join(f.root, 'dist/index.html'), 'utf8'),
      'new-client'
    )
    assert.equal(
      fs.readFileSync(
        path.join(f.root, 'server/dist/index.uws.worker.js'),
        'utf8'
      ),
      'new-server'
    )
    f.calls.push(['reload', id])
  }
  const result = await deploy(f.options)
  assert.deepEqual(f.calls, [
    ['install'],
    ['build'],
    ['server-build'],
    ['cache'],
    ['reload', 7],
  ])
  assert.equal(
    fs.readFileSync(path.join(f.root, 'server/dist/runtime/cache.dat'), 'utf8'),
    'keep-runtime-cache'
  )
  assert.equal(
    fs.readFileSync(path.join(f.root, 'server/resources/index.html'), 'utf8'),
    'old-client'
  )
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(f.root, '.cache/auto-deploy/state.json'))
    ).revision,
    result.revision
  )
  assert.equal(
    fs.existsSync(path.join(f.root, '.cache/auto-deploy/lock')),
    false
  )
})

for (const failedStep of ['build', 'server-build'])
  test(`${failedStep} failure leaves live artifacts and PM2 untouched`, async (t) => {
    const f = fixture(t)
    const run = async (...args) => {
      if (args[1][0] === failedStep) throw new Error('compiler failure')
      await f.run(...args)
    }
    await assert.rejects(deploy({ ...f.options, run }), /compiler failure/)
    assert.equal(
      fs.readFileSync(path.join(f.root, 'dist/index.html'), 'utf8'),
      'old-client'
    )
    assert.equal(
      fs.readFileSync(
        path.join(f.root, 'server/dist/index.uws.worker.js'),
        'utf8'
      ),
      'old-server'
    )
    assert.equal(
      f.calls.some(([call]) => call === 'reload'),
      false
    )
    assert.equal(
      fs.existsSync(path.join(f.root, '.cache/auto-deploy/state.json')),
      false
    )
    assert.equal(
      fs.existsSync(path.join(f.root, '.cache/auto-deploy/lock')),
      false
    )
  })

test('failed PM2 reload restores prior artifacts and reloads the restored code', async (t) => {
  const f = fixture(t)
  let attempts = 0
  f.pm2.reload = async () => {
    if (++attempts === 1) throw new Error('reload failed')
    assert.equal(
      fs.readFileSync(path.join(f.root, 'dist/index.html'), 'utf8'),
      'old-client'
    )
  }
  await assert.rejects(deploy(f.options), /reload failed/)
  assert.equal(attempts, 2)
  assert.equal(
    fs.readFileSync(
      path.join(f.root, 'server/dist/index.uws.worker.js'),
      'utf8'
    ),
    'old-server'
  )
  assert.equal(
    fs.readFileSync(path.join(f.root, 'server/resources/index.html'), 'utf8'),
    'older-client-fallback'
  )
  assert.equal(
    fs.existsSync(path.join(f.root, 'server/dist/workers/new.js')),
    false
  )
  assert.equal(
    fs.readFileSync(path.join(f.root, 'server/dist/runtime/cache.dat'), 'utf8'),
    'keep-runtime-cache'
  )
})

test('repeated hooks for the same revision do not rebuild/reload it twice', async (t) => {
  const f = fixture(t)
  await deploy(f.options)
  const count = f.calls.length
  assert.match((await deploy(f.options)).skipped, /already deployed/)
  assert.equal(f.calls.length, count)
})

test('concurrent pulls serialize and the second hook observes the completed revision', async (t) => {
  const f = fixture(t)
  let started
  let release
  const building = new Promise((resolve) => {
    started = resolve
  })
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const run = async (...args) => {
    if (args[1][0] === 'build') {
      started()
      await gate
    }
    await f.run(...args)
  }
  const first = deploy({ ...f.options, run })
  await building
  const second = deploy({ ...f.options, lockTimeoutMs: 2000 })
  release()
  await first
  assert.match((await second).skipped, /already deployed/)
  assert.equal(f.calls.filter(([call]) => call === 'reload').length, 1)
})

test('only compiled app entries from this exact checkout are managed', (t) => {
  const f = fixture(t)
  const other = {
    ...f.app,
    pm_id: 8,
    pm2_env: { ...f.app.pm2_env, pm_cwd: '/another-checkout' },
  }
  const source = {
    ...f.app,
    pm_id: 9,
    pm2_env: {
      ...f.app.pm2_env,
      pm_exec_path: path.join(f.root, 'server/src/index.ts'),
    },
  }
  assert.deepEqual(
    managedApps([f.app, other, source], f.root).map((app) => app.pm_id),
    [7]
  )
  assert.equal(
    dependenciesChanged(['config/build-tool-packages/package.json']),
    true
  )
  assert.equal(dependenciesChanged(['yarn.lock']), true)
  assert.equal(dependenciesChanged(['src/pages/PokemonPage/index.tsx']), false)
})

test('automatic hooks reject local tracked source edits before touching builds', async (t) => {
  const f = fixture(t)
  write(path.join(f.root, 'src/app.ts'), 'local uncommitted edits')
  await assert.rejects(deploy({ ...f.options, fromHook: true }), /local edits/)
  assert.deepEqual(f.calls, [])
})

test('automatic hooks reject local tracked root build configuration edits', async (t) => {
  const f = fixture(t)
  write(path.join(f.root, 'vite.config.mts'), 'export default {}')
  command(f.root, ['add', 'vite.config.mts'])
  command(f.root, ['commit', '-qm', 'Add build configuration'])
  write(
    path.join(f.root, 'vite.config.mts'),
    'export default { build: { minify: false } }'
  )
  await assert.rejects(deploy({ ...f.options, fromHook: true }), /local edits/)
  assert.deepEqual(f.calls, [])
})

for (const failure of ['install', 'build', 'reload', 'state'])
  test(`${failure} failure restores root/workspace dependencies before recovery`, async (t) => {
    const f = fixture(t)
    write(
      path.join(f.root, 'package.json'),
      JSON.stringify({ private: true, workspaces: ['config/*', 'server'] })
    )
    write(path.join(f.root, 'config/tools/package.json'), '{"private":true}')
    write(path.join(f.root, 'server/package.json'), '{"private":true}')
    write(path.join(f.root, 'node_modules/upgraded/index.js'), 'old-version')
    write(
      path.join(f.root, 'node_modules/removed/index.js'),
      'removed-old-version'
    )
    write(
      path.join(f.root, 'config/tools/node_modules/local/index.js'),
      'old-workspace-version'
    )
    fs.symlinkSync(
      '../removed',
      path.join(f.root, 'node_modules/relative-link')
    )
    let attempts = 0
    const assertRestored = () => {
      assert.equal(
        fs.readFileSync(
          path.join(f.root, 'node_modules/upgraded/index.js'),
          'utf8'
        ),
        'old-version'
      )
      assert.equal(
        fs.readFileSync(
          path.join(f.root, 'node_modules/removed/index.js'),
          'utf8'
        ),
        'removed-old-version'
      )
      assert.equal(
        fs.readlinkSync(path.join(f.root, 'node_modules/relative-link')),
        '../removed'
      )
      assert.equal(
        fs.readFileSync(
          path.join(f.root, 'config/tools/node_modules/local/index.js'),
          'utf8'
        ),
        'old-workspace-version'
      )
      assert.equal(
        fs.existsSync(path.join(f.root, 'server/node_modules')),
        false
      )
      assert.equal(
        fs.existsSync(path.join(f.root, 'node_modules/new-package')),
        false
      )
    }
    const run = async (...args) => {
      if (args[1][0] === 'install') {
        write(
          path.join(f.root, 'node_modules/upgraded/index.js'),
          'new-version'
        )
        fs.rmSync(path.join(f.root, 'node_modules/removed'), {
          recursive: true,
        })
        write(
          path.join(f.root, 'node_modules/new-package/index.js'),
          'new-package'
        )
        write(
          path.join(f.root, 'config/tools/node_modules/local/index.js'),
          'new-workspace-version'
        )
        write(
          path.join(f.root, 'server/node_modules/new/index.js'),
          'new-server-dependency'
        )
      }
      if (args[1][0] === failure) throw new Error(`${failure} failed`)
      if (failure === 'state' && args[0] === process.execPath)
        fs.mkdirSync(path.join(f.root, '.cache/auto-deploy/state.json.next'))
      await f.run(...args)
    }
    f.pm2.reload = async () => {
      attempts++
      if (failure === 'reload' && attempts === 1)
        throw new Error('reload failed')
      if (attempts > 1) assertRestored()
    }
    await assert.rejects(
      deploy({ ...f.options, run }),
      failure === 'state' ? /EISDIR/ : new RegExp(`${failure} failed`)
    )
    assertRestored()
    assert.equal(attempts, ['reload', 'state'].includes(failure) ? 2 : 0)
    assert.equal(
      fs.existsSync(path.join(f.root, '.cache/auto-deploy/state.json')),
      false
    )
  })

test('snapshot copy failure leaves live dependencies intact and never starts install', async (t) => {
  const f = fixture(t)
  write(path.join(f.root, 'node_modules/existing/index.js'), 'existing-module')
  t.mock.method(fs, 'cpSync', () => {
    throw new Error('snapshot copy failed')
  })
  await assert.rejects(deploy(f.options), /snapshot copy failed/)
  assert.deepEqual(f.calls, [])
  assert.equal(
    fs.readFileSync(
      path.join(f.root, 'node_modules/existing/index.js'),
      'utf8'
    ),
    'existing-module'
  )
  assert.equal(
    fs.existsSync(path.join(f.root, '.cache/auto-deploy/lock')),
    false
  )
})

test('failed first install removes dependency directories that did not previously exist', async (t) => {
  const f = fixture(t)
  fs.rmSync(path.join(f.root, 'node_modules'), { recursive: true })
  const run = async () => {
    write(path.join(f.root, 'node_modules/new/index.js'), 'partial-install')
    throw new Error('install failed')
  }
  await assert.rejects(deploy({ ...f.options, run }), /install failed/)
  assert.equal(fs.existsSync(path.join(f.root, 'node_modules')), false)
})

test('linked dependency directories are rejected before install without touching their target', async (t) => {
  const f = fixture(t)
  const target = path.join(f.root, 'linked-dependencies')
  write(path.join(target, 'package/index.js'), 'keep-external-dependency')
  fs.rmSync(path.join(f.root, 'node_modules'), { recursive: true })
  fs.symlinkSync(target, path.join(f.root, 'node_modules'))
  await assert.rejects(deploy(f.options), /linked dependency directory/)
  assert.deepEqual(f.calls, [])
  assert.equal(fs.readlinkSync(path.join(f.root, 'node_modules')), target)
  assert.equal(
    fs.readFileSync(path.join(target, 'package/index.js'), 'utf8'),
    'keep-external-dependency'
  )
})

test('a real fast-forward git pull invokes the shipped post-merge hook', (t) => {
  const f = fixture(t)
  write(
    path.join(f.root, 'config/scripts/auto-deploy.mjs'),
    "import fs from 'node:fs';fs.writeFileSync('hook-ran.txt',process.argv.slice(2).join(' '))"
  )
  fs.mkdirSync(path.join(f.root, '.test-hooks'))
  write(
    path.join(f.root, '.test-hooks/post-merge'),
    `#!/bin/sh\n${fs.readFileSync(path.join(project, '.husky/post-merge'), 'utf8')}`
  )
  fs.chmodSync(path.join(f.root, '.test-hooks/post-merge'), 0o755)
  command(f.root, ['add', '.'])
  command(f.root, ['commit', '-qm', 'Install test hook'])
  command(f.root, ['switch', '-qc', 'update'])
  write(path.join(f.root, 'src/app.ts'), 'export const version = 2')
  command(f.root, ['add', 'src/app.ts'])
  command(f.root, ['commit', '-qm', 'New source'])
  command(f.root, ['switch', '-q', 'main'])
  command(f.root, ['pull', '--ff-only', '.', 'update'])
  assert.equal(
    fs.readFileSync(path.join(f.root, 'hook-ran.txt'), 'utf8'),
    '--hook'
  )
})
