import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const logDefault = (message) => console.log(`[auto-deploy] ${message}`)
const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}
const canonical = (file) => {
  const absolute = path.resolve(file)
  try {
    return fs.realpathSync(absolute)
  } catch {
    const parent = path.dirname(absolute)
    return parent === absolute
      ? absolute
      : path.join(canonical(parent), path.basename(absolute))
  }
}

function rejectionReason(app, root) {
  const env = app.pm2_env || {}
  if (!['puppeteer-ssr', 'start-puppeteer-ssr'].includes(app.name))
    return 'Unsupported process name; expected puppeteer-ssr or start-puppeteer-ssr'
  if (['stopped', 'stopping'].includes(env.status))
    return 'Process was explicitly stopped'
  if (app.pm_id === undefined || !env.pm_cwd || !env.pm_exec_path)
    return 'PM2 metadata is missing id, cwd or script'
  if (canonical(env.pm_cwd) !== canonical(root))
    return 'Process belongs to a different checkout/cwd'
  const script = path
    .relative(
      canonical(root),
      canonical(path.resolve(env.pm_cwd, env.pm_exec_path))
    )
    .split(path.sep)
    .join('/')
  if (/^server\/src\/.*\.ts$/.test(script))
    return 'Process runs TypeScript source; deployment requires a compiled server/dist entry'
  return /^server\/dist\/index(?:\.uws(?:\.worker)?|\.fastify)?\.js$/.test(
    script
  )
    ? null
    : 'Script is not a supported compiled server entry in this checkout'
}

export function managedApps(apps, root) {
  return apps.filter((app) => rejectionReason(app, root) === null)
}

export function deploymentDiagnostics(root, apps, daemonReachable) {
  const describe = (app) => ({
    id: app.pm_id,
    name: app.name,
    status: app.pm2_env?.status,
    cwd: app.pm2_env?.pm_cwd,
    script: app.pm2_env?.pm_exec_path,
  })
  return {
    user: os.userInfo().username,
    pm2Home: process.env.PM2_HOME || path.join(os.homedir(), '.pm2'),
    checkout: canonical(root),
    daemonReachable,
    processes: managedApps(apps, root).map(describe),
    excludedProcesses: apps.flatMap((app) => {
      const reason = rejectionReason(app, root)
      return reason ? [{ ...describe(app), reason }] : []
    }),
  }
}

export const dependenciesChanged = (files) =>
  files.some((file) =>
    /(^|\/)package\.json$|(^|\/)(yarn\.lock|package-lock\.json|pnpm-lock\.yaml|bun\.lockb?)$/.test(
      file
    )
  )

export function git(root, args, optional = false) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
  if (result.status !== 0) {
    if (optional) return ''
    throw new Error(
      result.error?.message || result.stderr.trim() || `git ${args[0]} failed`
    )
  }
  return result.stdout.trim()
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      shell: false,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`${command} ${args.join(' ')} failed (${signal || code})`)
          )
    )
  })
}

async function acquireLock(directory, timeoutMs) {
  const owner = { pid: process.pid, token: randomUUID() }
  const started = Date.now()
  for (;;) {
    try {
      fs.mkdirSync(directory)
      try {
        fs.writeFileSync(
          path.join(directory, 'owner.json'),
          JSON.stringify(owner)
        )
      } catch (error) {
        fs.rmSync(directory, { recursive: true, force: true })
        throw error
      }
      return () => {
        if (readJSON(path.join(directory, 'owner.json'))?.token === owner.token)
          fs.rmSync(directory, { recursive: true, force: true })
      }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const previous = readJSON(path.join(directory, 'owner.json'))
      if (Number.isInteger(previous?.pid) && previous.pid > 0) {
        try {
          process.kill(previous.pid, 0)
        } catch (check) {
          if (check.code === 'ESRCH') {
            fs.rmSync(directory, { recursive: true, force: true })
            continue
          }
        }
      }
      if (Date.now() - started >= timeoutMs)
        throw new Error(`Another deployment holds ${directory}`)
      await delay(100)
    }
  }
}

function walkFiles(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory()
      ? walkFiles(file, base)
      : entry.isFile()
        ? [path.relative(base, file)]
        : []
  })
}

// Runtime entries of server/resources that no build produces: the crawler's
// browser. Without it no page is rendered, so no ISR view (or skeleton) is
// ever written again after a deployment.
export const RUNTIME_RESOURCES = ['lightpanda']

// Build outputs are staged first. Merge compiled server files without moving
// or deleting its runtime cache/browser directories. Every file replacement
// uses rename; rollback restores only files this deployment changed.
export function publishArtifacts(root, stage) {
  const backup = path.join(stage, 'previous')
  fs.mkdirSync(backup)
  const undo = []
  // `keep`: entries of the old directory moved into the new one (rename, so
  // instant) and moved back on rollback
  const replaceDirectory = (source, target, label, keep = []) => {
    const old = path.join(backup, label)
    const existed = fs.existsSync(target)
    if (existed) fs.renameSync(target, old)
    try {
      fs.renameSync(source, target)
    } catch (error) {
      if (existed) fs.renameSync(old, target)
      throw error
    }
    const kept = existed
      ? keep.filter(
          (name) =>
            fs.existsSync(path.join(old, name)) &&
            !fs.existsSync(path.join(target, name))
        )
      : []
    undo.push(() => {
      for (const name of kept)
        if (fs.existsSync(path.join(target, name)))
          fs.renameSync(path.join(target, name), path.join(old, name))
      fs.rmSync(target, { recursive: true, force: true })
      if (existed) fs.renameSync(old, target)
    })
    for (const name of kept)
      fs.renameSync(path.join(old, name), path.join(target, name))
  }
  const rollback = () => {
    const errors = []
    for (const restore of undo.reverse()) {
      try {
        restore()
      } catch (error) {
        errors.push(error)
      }
    }
    undo.length = 0
    if (errors.length)
      throw new AggregateError(
        errors,
        'Could not restore previous build outputs'
      )
  }
  try {
    const dist = path.join(root, 'dist')
    const resources = path.join(stage, 'resources')
    if (fs.existsSync(dist)) fs.cpSync(dist, resources, { recursive: true })
    else fs.mkdirSync(resources)
    replaceDirectory(path.join(stage, 'dist'), dist, 'dist')
    replaceDirectory(
      resources,
      path.join(root, 'server/resources'),
      'resources',
      RUNTIME_RESOURCES
    )
    const compiled = path.join(stage, 'server-dist')
    for (const relative of walkFiles(compiled)) {
      const target = path.join(root, 'server/dist', relative)
      const previous = path.join(backup, 'server-dist', relative)
      const existed = fs.existsSync(target)
      if (existed) {
        fs.mkdirSync(path.dirname(previous), { recursive: true })
        fs.copyFileSync(target, previous)
      }
      fs.mkdirSync(path.dirname(target), { recursive: true })
      const temporary = `${target}.deploy-${randomUUID()}`
      try {
        fs.copyFileSync(path.join(compiled, relative), temporary)
        fs.renameSync(temporary, target)
      } finally {
        fs.rmSync(temporary, { force: true })
      }
      undo.push(() =>
        existed
          ? fs.renameSync(previous, target)
          : fs.rmSync(target, { force: true })
      )
    }
    return rollback
  } catch (error) {
    rollback()
    throw error
  }
}

// Expand ordinary workspace directory globs without following directory links.
function workspaceDirectories(root) {
  const workspaces = readJSON(path.join(root, 'package.json'))?.workspaces
  const patterns = Array.isArray(workspaces)
    ? workspaces
    : workspaces?.packages || []
  const directories = new Set([root])
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || path.isAbsolute(pattern))
      throw new Error('Dependency snapshots require relative workspace paths')
    const parts = pattern.split('/').filter((part) => part && part !== '.')
    if (
      parts.some(
        (part) => part === '..' || part === '**' || part === 'node_modules'
      )
    )
      throw new Error(
        'Unsupported workspace path for dependency snapshot: ' + pattern
      )
    let matches = [root]
    for (const part of parts) {
      const matcher = new RegExp(
        '^' +
          part
            .split('*')
            .map((value) => value.replace(/[.+?^{}()|[\]\\$]/g, '\\$&'))
            .join('.*') +
          '$'
      )
      matches = matches.flatMap((directory) =>
        fs
          .readdirSync(directory, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && matcher.test(entry.name))
          .map((entry) => path.join(directory, entry.name))
      )
    }
    for (const directory of matches)
      if (fs.existsSync(path.join(directory, 'package.json')))
        directories.add(directory)
  }
  return [...directories]
}

export function snapshotDependencies(root, stage) {
  const directories = workspaceDirectories(root).map((directory) =>
    path.join(directory, 'node_modules')
  )
  const entries = directories.map((directory, index) => {
    let stat
    try {
      stat = fs.lstatSync(directory)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink()))
      throw new Error(
        'Cannot safely install with a linked dependency directory: ' + directory
      )
    return {
      directory,
      existed: Boolean(stat),
      snapshot: path.join(stage, 'dependencies', String(index)),
    }
  })
  // Finish every copy before allowing install to modify any dependency tree.
  for (const entry of entries)
    if (entry.existed) {
      fs.mkdirSync(path.dirname(entry.snapshot), { recursive: true })
      fs.cpSync(entry.directory, entry.snapshot, {
        recursive: true,
        dereference: false,
        verbatimSymlinks: true,
      })
    }
  return () => {
    const errors = []
    for (const entry of entries) {
      try {
        fs.rmSync(entry.directory, { recursive: true, force: true })
        if (entry.existed) fs.renameSync(entry.snapshot, entry.directory)
      } catch (error) {
        errors.push(error)
      }
    }
    if (errors.length)
      throw new AggregateError(
        errors,
        'Could not restore previous dependencies'
      )
  }
}

export async function deploy({
  root,
  pm2,
  run = runCommand,
  log = logDefault,
  force = false,
  fromHook = false,
  lockTimeoutMs = 600000,
}) {
  root = canonical(root)
  const cache = path.join(root, '.cache/auto-deploy')
  fs.mkdirSync(cache, { recursive: true })
  const release = await acquireLock(path.join(cache, 'lock'), lockTimeoutMs)
  let stage
  let rollback
  let restoreDependencies
  let publicationStarted = false
  let preserveStage = false
  let targets = []
  try {
    // Read HEAD and PM2 again after the lock: another successful pull/deploy
    // may have finished while this hook was waiting.
    const revision = git(root, ['rev-parse', 'HEAD'])
    targets = managedApps(await pm2.list(), root)
    if (!targets.length)
      return { skipped: 'No compiled PM2 app belongs to this repository' }
    if (
      !force &&
      readJSON(path.join(cache, 'state.json'))?.revision === revision
    )
      return { skipped: 'This revision is already deployed' }
    if (
      fromHook &&
      git(root, [
        'diff',
        '--name-only',
        'HEAD',
        '--',
        'src',
        'server/src',
        'config',
        'package.json',
        'yarn.lock',
        'package-lock.json',
        'pnpm-lock.yaml',
        'bun.lock',
        'bun.lockb',
        'server/package.json',
        'server/server-build.js',
        'vite.config.*',
        'tsconfig*.json',
        'tailwind.config.*',
        'postcss.config.*',
        'eslint.config.*',
        '.husky',
      ])
    )
      throw new Error(
        'Tracked source has local edits; commit/stash them before automatic deployment'
      )
    const previous =
      readJSON(path.join(cache, 'state.json'))?.revision ||
      git(root, ['rev-parse', '--verify', 'ORIG_HEAD'], true)
    const changes = previous
      ? git(
          root,
          ['diff', '--name-only', '-z', previous, revision],
          true
        ).split('\0')
      : ['package.json']
    stage = fs.mkdtempSync(path.join(cache, 'stage-'))
    if (
      !fs.existsSync(path.join(root, 'node_modules')) ||
      dependenciesChanged(changes)
    ) {
      log('Backing up current build/runtime dependencies...')
      restoreDependencies = snapshotDependencies(root, stage)
      log('Installing changed build/runtime dependencies...')
      await run(
        'yarn',
        ['install', '--production=false', '--non-interactive'],
        { cwd: root, env: process.env }
      )
    }
    const env = {
      ...process.env,
      DEPLOY_STAGING_DIR: stage,
      SERVER_BUILD_OUT_DIR: path.join(stage, 'server-dist'),
    }
    log('Building client into staging...')
    await run('yarn', ['build'], { cwd: root, env })
    log('Building server into staging...')
    await run('yarn', ['server-build'], { cwd: root, env })
    if (!fs.existsSync(path.join(stage, 'dist/index.html')))
      throw new Error('Client build did not produce index.html')
    for (const app of targets) {
      const relative = path.relative(
        path.join(root, 'server/dist'),
        canonical(path.resolve(app.pm2_env.pm_cwd, app.pm2_env.pm_exec_path))
      )
      if (!fs.existsSync(path.join(stage, 'server-dist', relative)))
        throw new Error(`Server build did not produce ${relative}`)
    }
    if (git(root, ['rev-parse', 'HEAD']) !== revision)
      throw new Error(
        'HEAD changed while building; the next queued pull will deploy the new revision'
      )
    log('Publishing successful builds...')
    publicationStarted = true
    rollback = publishArtifacts(root, stage)
    await run(
      process.execPath,
      ['-r', 'sucrase/register', 'server/src/utils/AfterBuildHandler.ts'],
      { cwd: root, env: process.env }
    )
    for (const app of targets) {
      log(`Reloading ${app.name} (PM2 id ${app.pm_id})...`)
      await pm2.reload(app.pm_id)
    }
    const state = path.join(cache, 'state.json')
    fs.writeFileSync(
      `${state}.next`,
      JSON.stringify(
        {
          revision,
          deployedAt: new Date().toISOString(),
          processes: targets.map((app) => app.pm_id),
        },
        null,
        2
      )
    )
    fs.renameSync(`${state}.next`, state)
    rollback = null
    restoreDependencies = null
    log(`Deployed ${revision.slice(0, 12)}`)
    return { revision, processes: targets.map((app) => app.pm_id) }
  } catch (error) {
    if (rollback || restoreDependencies) {
      log('Deployment failed; restoring previous build outputs/dependencies...')
      try {
        const failures = []
        for (const restore of [rollback, restoreDependencies]) {
          if (!restore) continue
          try {
            restore()
          } catch (failure) {
            failures.push(failure)
          }
        }
        if (failures.length)
          throw new AggregateError(failures, 'Could not restore deployment')
        // Dependencies must be restored before restarting the previous code.
        if (rollback) for (const app of targets) await pm2.reload(app.pm_id)
      } catch (recovery) {
        preserveStage = true
        throw new AggregateError(
          [error, recovery],
          `Deployment/recovery failed; retained backups at ${stage}`
        )
      }
    }
    if (publicationStarted && !rollback) {
      preserveStage = true
      log(`Publication failed; retained recovery files at ${stage}`)
    }
    throw error
  } finally {
    if (stage && !preserveStage)
      fs.rmSync(stage, { recursive: true, force: true })
    release()
  }
}

// A successful PM2 callback alone does not prove the replacement stayed alive.
// Check process health before marking the revision deployed (and after recovery).
export async function waitForHealthyReplacement(
  list,
  id,
  oldPid,
  { timeoutMs = 15000, stableMs = 2000, pollMs = 200 } = {}
) {
  const started = Date.now()
  let stableSince
  let candidate
  while (Date.now() - started <= timeoutMs) {
    const app = (await list()).find((entry) => entry.pm_id === id)
    const online =
      app?.pm2_env?.status === 'online' && app.pid > 0 && app.pid !== oldPid
    if (online) {
      if (candidate !== app.pid) {
        candidate = app.pid
        stableSince = Date.now()
      }
      if (Date.now() - stableSince >= stableMs) return
    } else {
      candidate = undefined
      stableSince = undefined
    }
    await delay(pollMs)
  }
  throw new Error(`PM2 id ${id} did not become a stable online replacement`)
}

// Attach to an existing daemon only. A git pull on a development checkout
// must never start a new PM2 daemon or restart another checkout's app.
export async function existingPm2(root) {
  const home = process.env.PM2_HOME || path.join(os.homedir(), '.pm2')
  const socket = path.join(home, 'rpc.sock')
  if (!fs.existsSync(socket)) return null
  const alive = await new Promise((resolve) => {
    const client = net.createConnection(socket)
    const done = (value) => {
      client.destroy()
      resolve(value)
    }
    client.once('connect', () => done(true))
    client.once('error', () => done(false))
    client.setTimeout(1500, () => done(false))
  })
  if (!alive) return null
  const require = createRequire(path.join(root, 'package.json'))
  const api = require('pm2')
  const call = (target, method, ...args) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`PM2 ${method} timed out`)),
        60000
      )
      target[method](...args, (error, result) => {
        clearTimeout(timer)
        error ? reject(error) : resolve(result)
      })
    })
  // Client.start()/connect() would spawn a daemon if it disappeared. Bind its
  // RPC channel directly instead; PM2 is pinned and this path is integration-tested.
  await call(api.Client, 'launchRPC')
  return {
    list: () => call(api, 'list'),
    reload: async (id) => {
      const previous = (await call(api, 'list')).find((app) => app.pm_id === id)
      // Apply to existing workers too: their original PM2 configuration may
      // still use the short default timeout and retire the old app too soon.
      await call(api, 'reload', id, { wait_ready: true, listen_timeout: 45000 })
      await waitForHealthyReplacement(
        () => call(api, 'list'),
        id,
        previous?.pid
      )
    },
    disconnect: () => api.disconnect(),
  }
}
