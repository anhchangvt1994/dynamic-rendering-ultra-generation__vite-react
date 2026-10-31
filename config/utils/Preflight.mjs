/**
 * NOTE - Preflight for the start scripts
 * Before the server starts, make sure the runtime it is configured to use is
 * installed and running:
 * - BROWSER_ENGINE=lightpanda -> the lightpanda binary (pinned version)
 * - REDIS=true                -> a reachable redis server (install + start a
 *                                local one when REDIS_HOST is local)
 * - ENABLE_SUPABASE=true      -> the self-hosted Supabase stack and its mail
 *                                server (Docker is required, never installed)
 * Env is resolved the same way as server/src/utils/InitEnv.ts.
 */
import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import net from 'net'
import {
  getLightpandaPath,
  getLightpandaVersion,
  installLightpanda,
  LIGHTPANDA_VERSION,
} from './LightpandaInstaller.mjs'
import { isEnabled, loadEnv } from './ServerEnv.mjs'
import { ensureSelfHostedSupabase } from './Supabase.mjs'

const LOCAL_HOSTS = ['', '127.0.0.1', 'localhost', '::1', '0.0.0.0']
const REDIS_READY_TIMEOUT = 15000

const log = (...args) => console.log('[preflight]', ...args)

const hasCommand = (command) =>
  spawnSync('sh', ['-c', `command -v ${command}`], { stdio: 'ignore' })
    .status === 0

const run = (command) => {
  log(`$ ${command}`)
  execSync(command, { stdio: 'inherit' })
}

// NOTE - Prefix with sudo when not root (system package managers / services)
const asRoot = (command) =>
  process.getuid?.() === 0 || !hasCommand('sudo') ? command : `sudo ${command}`

// NOTE - RESP PING (with AUTH when a password is set) without redis-cli
const pingRedis = ({ host, port, password }) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: host || '127.0.0.1', port })
    let data = ''
    const done = (result) => {
      socket.destroy()
      resolve(result)
    }

    socket.setTimeout(2000, () => done({ ok: false, reason: 'timeout' }))
    socket.once('error', (err) => done({ ok: false, reason: err.code }))
    socket.once('connect', () => {
      if (password) socket.write(`AUTH ${password}\r\n`)
      socket.write('PING\r\n')
    })
    socket.on('data', (chunk) => {
      data += chunk
      if (data.includes('+PONG')) done({ ok: true })
      else if (data.includes('-NOAUTH') || data.includes('-WRONGPASS'))
        done({ ok: false, reason: 'auth' })
      else if (data.includes('without any password configured'))
        done({
          ok: true,
          warning: 'REDIS_PASSWORD is set but redis has no password',
        })
    })
  })

const waitForRedis = async (options) => {
  const startTime = Date.now()
  let result
  while (Date.now() - startTime < REDIS_READY_TIMEOUT) {
    result = await pingRedis(options)
    if (result.ok || result.reason === 'auth') return result
    await new Promise((res) => setTimeout(res, 300))
  }
  return result
} // waitForRedis

const getOsId = () => {
  try {
    const osRelease = fs.readFileSync('/etc/os-release', 'utf8')
    const pick = (key) =>
      new RegExp(`^${key}="?([^"\\n]*)"?`, 'm').exec(osRelease)?.[1] ?? ''
    return `${pick('ID')} ${pick('ID_LIKE')}`.toLowerCase()
  } catch {
    return ''
  }
} // getOsId

const installRedis = () => {
  if (process.platform === 'darwin') {
    if (!hasCommand('brew'))
      throw new Error('Homebrew is required to install redis on macOS')
    run('brew install redis')
    return
  }

  if (process.platform !== 'linux')
    throw new Error(`Can not install redis on ${process.platform}`)

  const osId = getOsId()

  if (/rhel|centos|fedora|rocky|alma/.test(osId)) {
    const packageManager = hasCommand('dnf') ? 'dnf' : 'yum'
    // NOTE - CentOS 7 / RHEL 7 only ship redis in EPEL
    if (packageManager === 'yum') run(asRoot('yum install -y epel-release'))
    // NOTE - RHEL / CentOS Stream 10 replaced redis by valkey (a redis
    // compatible fork, works with ioredis)
    const hasRedisPackage =
      spawnSync('sh', ['-c', `${packageManager} -q info redis`], {
        stdio: 'ignore',
      }).status === 0
    run(
      asRoot(
        `${packageManager} install -y ${hasRedisPackage ? 'redis' : 'valkey'}`
      )
    )
  } else if (/debian|ubuntu/.test(osId)) {
    run(asRoot('apt-get update'))
    run(asRoot('apt-get install -y redis-server'))
  } else if (/alpine/.test(osId)) {
    run(asRoot('apk add --no-cache redis'))
  } else {
    throw new Error(`Unsupported linux distribution: ${osId || 'unknown'}`)
  }
} // installRedis

// NOTE - redis-server, or valkey-server on distributions that ship valkey
const getRedisServer = () =>
  ['redis-server', 'valkey-server'].find((command) => hasCommand(command))

const startRedis = ({ port, password }) => {
  // NOTE - System services (brew / systemd) run redis with its default config,
  // so use them only for the default port without password
  const isDefaultConfig = Number(port) === 6379 && !password

  if (isDefaultConfig && process.platform === 'darwin') {
    run('brew services start redis')
    return
  }

  if (
    isDefaultConfig &&
    hasCommand('systemctl') &&
    fs.existsSync('/run/systemd/system')
  ) {
    const service = ['redis', 'redis-server', 'valkey'].find(
      (name) =>
        spawnSync('systemctl', ['cat', `${name}.service`], { stdio: 'ignore' })
          .status === 0
    )
    if (service) {
      run(asRoot(`systemctl enable --now ${service}`))
      return
    }
  }

  // NOTE - No service manager (ex: container) or custom config
  const args = [
    '--daemonize yes',
    '--bind 127.0.0.1',
    `--port ${port}`,
    '--save ""',
    '--appendonly no',
  ]
  if (password) args.push(`--requirepass '${password}'`)
  run(`${getRedisServer()} ${args.join(' ')}`)
} // startRedis

const ensureRedis = async (env) => {
  const options = {
    host: env.REDIS_HOST || '127.0.0.1',
    port: Number(env.REDIS_PORT || 6379),
    password: env.REDIS_PASSWORD || '',
  }
  const address = `${options.host}:${options.port}`

  let result = await pingRedis(options)

  if (!result.ok && result.reason !== 'auth') {
    if (!LOCAL_HOSTS.includes(options.host))
      throw new Error(
        `Redis at ${address} is not reachable (${result.reason}). It is a remote host, so it can not be installed here.`
      )

    if (!getRedisServer()) {
      log('Redis is not installed, installing...')
      installRedis()
    }

    log(`Starting redis at ${address}...`)
    startRedis(options)
    result = await waitForRedis(options)
  }

  if (result?.reason === 'auth')
    throw new Error(`Redis at ${address} rejected REDIS_PASSWORD`)
  if (!result?.ok)
    throw new Error(`Redis at ${address} is not ready (${result?.reason})`)
  if (result.warning) log(`Warning: ${result.warning}`)

  log(`Redis is ready at ${address}`)
} // ensureRedis

const ensureLightpanda = async (env) => {
  const lightpandaPath = getLightpandaPath(env.LIGHTPANDA_PATH)
  const version = getLightpandaVersion(lightpandaPath)

  if (version === LIGHTPANDA_VERSION) {
    log(`Lightpanda ${version} is ready at ${lightpandaPath}`)
    return
  }

  log(
    version
      ? `Lightpanda ${version} found, upgrading to ${LIGHTPANDA_VERSION}...`
      : 'Lightpanda is not installed, installing...'
  )
  await installLightpanda(lightpandaPath)

  if (getLightpandaVersion(lightpandaPath) !== LIGHTPANDA_VERSION)
    throw new Error(`Lightpanda at ${lightpandaPath} can not run`)
} // ensureLightpanda

/**
 * NOTE - Shared libraries chromium (@sparticuz/chromium, extracted at the
 * first launch) needs outside AWS Lambda: soname -> [rpm package, deb package]
 */
const CHROMIUM_LIBRARIES = {
  'libnss3.so': ['nss', 'libnss3'],
  'libnspr4.so': ['nspr', 'libnspr4'],
  'libatk-1.0.so.0': ['atk', 'libatk1.0-0'],
  'libatk-bridge-2.0.so.0': ['at-spi2-atk', 'libatk-bridge2.0-0'],
  'libcups.so.2': ['cups-libs', 'libcups2'],
  'libdrm.so.2': ['libdrm', 'libdrm2'],
  'libxkbcommon.so.0': ['libxkbcommon', 'libxkbcommon0'],
  'libXcomposite.so.1': ['libXcomposite', 'libxcomposite1'],
  'libXdamage.so.1': ['libXdamage', 'libxdamage1'],
  'libXrandr.so.2': ['libXrandr', 'libxrandr2'],
  'libgbm.so.1': ['mesa-libgbm', 'libgbm1'],
  'libpango-1.0.so.0': ['pango', 'libpango-1.0-0'],
  'libasound.so.2': ['alsa-lib', 'libasound2'],
  'libXfixes.so.3': ['libXfixes', 'libxfixes3'],
  'libX11.so.6': ['libX11', 'libx11-6'],
  'libxcb.so.1': ['libxcb', 'libxcb1'],
  'libXext.so.6': ['libXext', 'libxext6'],
  'libdbus-1.so.3': ['dbus-libs', 'libdbus-1-3'],
  'libexpat.so.1': ['expat', 'libexpat1'],
}

const getMissingChromiumLibraries = () => {
  const result = spawnSync(
    'sh',
    ['-c', 'ldconfig -p 2>/dev/null || /sbin/ldconfig -p'],
    { encoding: 'utf8' }
  )
  const installed = result.stdout || ''

  return Object.keys(CHROMIUM_LIBRARIES).filter(
    (soname) => !installed.includes(soname)
  )
} // getMissingChromiumLibraries

const ensureChromiumLibraries = () => {
  // NOTE - macOS / Windows use the chromium downloaded by puppeteer
  if (process.platform !== 'linux') return

  const missing = getMissingChromiumLibraries()

  if (!missing.length) {
    log('Chromium libraries are ready')
    return
  }

  log(`Chromium libraries missing: ${missing.join(', ')}, installing...`)

  const osId = getOsId()

  if (/rhel|centos|fedora|rocky|alma/.test(osId)) {
    const packageManager = hasCommand('dnf') ? 'dnf' : 'yum'
    const packages = missing.map((soname) => CHROMIUM_LIBRARIES[soname][0])
    run(asRoot(`${packageManager} install -y ${packages.join(' ')}`))
  } else if (/debian|ubuntu/.test(osId)) {
    const packages = missing.map((soname) => {
      const name = CHROMIUM_LIBRARIES[soname][1]
      // NOTE - Ubuntu 24.04+ / Debian 13+ renamed libasound2 to libasound2t64
      if (
        name === 'libasound2' &&
        spawnSync('sh', ['-c', 'apt-cache show libasound2t64'], {
          stdio: 'ignore',
        }).status === 0
      )
        return 'libasound2t64'
      return name
    })
    run(asRoot('apt-get update'))
    run(asRoot(`apt-get install -y ${packages.join(' ')}`))
  } else {
    throw new Error(
      `Install the chromium libraries manually (${osId || 'unknown'}): ${missing.join(', ')}`
    )
  }

  const stillMissing = getMissingChromiumLibraries()
  if (stillMissing.length)
    throw new Error(
      `Chromium libraries still missing: ${stillMissing.join(', ')}`
    )

  log('Chromium libraries are ready')
} // ensureChromiumLibraries

export default async function preflight({
  env = 'production',
  redis = false,
} = {}) {
  const resolvedEnv = loadEnv(env)

  const isLightpanda =
    String(resolvedEnv.BROWSER_ENGINE || '').toLowerCase() === 'lightpanda'

  if (isLightpanda) await ensureLightpanda(resolvedEnv)

  // NOTE - Chromium renders the pages, or is the fallback of lightpanda
  if (!isLightpanda || isEnabled(resolvedEnv.LIGHTPANDA_FALLBACK_TO_CHROMIUM))
    ensureChromiumLibraries()

  if (redis || isEnabled(resolvedEnv.REDIS)) await ensureRedis(resolvedEnv)

  if (isEnabled(resolvedEnv.ENABLE_SUPABASE))
    await ensureSelfHostedSupabase(resolvedEnv)
}
