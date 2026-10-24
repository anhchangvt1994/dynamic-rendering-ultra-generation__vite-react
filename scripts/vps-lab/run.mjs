/**
 * VPS lab: benchmark chromium / lightpanda, with / without redis, on a
 * CentOS container sized like a small VPS.
 *
 *   node scripts/vps-lab/run.mjs [scenario ...]
 *
 * Scenarios: chromium, lightpanda, chromium+redis, lightpanda+redis (default:
 * all). Add "+default" / "+fast" to force the crawl profile (CRAWL_PROFILE),
 * ex: lightpanda+redis+default. Each one starts the server with the real
 * start script (`npm run start` / `npm run start:redis-api`), so the
 * preflight installs lightpanda / redis / the chromium libraries on the
 * first scenario that needs them.
 *
 * Phases of a scenario:
 *   idle  - server started, nothing to do
 *   burst - BURST_PAGES uncached bot pages requested at the same time
 *   load  - LOAD_VUS users for LOAD_SECONDS: cached bot pages, API proxy
 *           requests and new (uncached) bot pages mixed together
 *
 * Options (env): VPS_CPUS=2 VPS_MEMORY=4g VPS_DISK=75G NET_RATE=50mbit
 * NET_DELAY=30ms BURST_PAGES=20 BURST_PATHS= LOAD_VUS=50 LOAD_SECONDS=90
 */
import { execFileSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../..'
)
const LAB_DIR = path.join(ROOT, 'scripts/vps-lab')
const OUT_DIR = path.join(ROOT, '.vps-lab')
const IMAGE = 'vps-lab/centos-app:latest'
const CLIENT_IMAGE = 'node:22-alpine'
const NETWORK = 'vps-lab'
const VPS = 'vps-centos'
const BASE = `http://${VPS}:8080`

const env = (key, value) => process.env[key] || value
const CONFIG = {
  cpus: env('VPS_CPUS', '2'),
  memory: env('VPS_MEMORY', '4g'),
  disk: env('VPS_DISK', '75G'),
  netRate: env('NET_RATE', '50mbit'),
  netDelay: env('NET_DELAY', '30ms'),
  burstPages: Number(env('BURST_PAGES', 20)),
  loadVus: Number(env('LOAD_VUS', 50)),
  loadSeconds: Number(env('LOAD_SECONDS', 90)),
}
const SCENARIOS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['chromium', 'lightpanda', 'chromium+redis', 'lightpanda+redis']

const POKEMONS = [
  'pikachu',
  'bulbasaur',
  'charizard',
  'mewtwo',
  'gengar',
  'eevee',
  'snorlax',
  'lucario',
  'ditto',
  'mew',
  'squirtle',
  'jigglypuff',
  'psyduck',
  'machamp',
  'lapras',
  'dragonite',
  'gyarados',
  'alakazam',
  'onix',
  'magikarp',
  'arcanine',
  'vaporeon',
  'jolteon',
  'flareon',
  'umbreon',
  'espeon',
  'scizor',
  'tyranitar',
  'blaziken',
  'gardevoir',
]
// NOTE - BURST_PATHS=/,/pokemon/pikachu,... replaces the default pokemon pages
const BURST_PATHS = process.env.BURST_PATHS
  ? process.env.BURST_PATHS.split(',')
  : POKEMONS.slice(0, CONFIG.burstPages).map((name) => `/pokemon/${name}`)
const WARMUP_PATH = '/pokemon/raichu'
// NOTE - New pages for the load phase (pokeapi accepts ids as names)
const FRESH_PATHS = Array.from({ length: 150 }, (_, i) => `/pokemon/${200 + i}`)
// NOTE - Captured from the SPA (requestInfo is the encoded API request, see
// server/src/api/index.uws.ts). Re-capture them if the API encoding changes.
const API_PATHS = JSON.parse(
  fs.readFileSync(path.join(LAB_DIR, 'api-paths.json'), 'utf8')
)

const log = (...args) =>
  console.log(`[vps-lab ${new Date().toISOString().slice(11, 19)}]`, ...args)
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

const docker = (args, options = {}) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
    ...options,
  }).trim()
const vpsExec = (command, options) =>
  docker(['exec', VPS, 'sh', '-c', command], options)
const vpsTime = () => Number(vpsExec('date +%s%3N'))

const client = (options) =>
  JSON.parse(
    docker([
      'run',
      '--rm',
      '--network',
      NETWORK,
      '-v',
      `${LAB_DIR}:/lab:ro`,
      CLIENT_IMAGE,
      'node',
      '/lab/load.mjs',
      JSON.stringify({ base: BASE, ...options }),
    ])
  )

const setupVps = () => {
  // NOTE - Rebuild so the VPS runs the current code (cached when unchanged)
  log(`Build ${IMAGE}...`)
  docker([
    'build',
    '-q',
    '-f',
    path.join(LAB_DIR, 'Dockerfile'),
    '-t',
    IMAGE,
    ROOT,
  ])
  spawnSync('docker', ['network', 'create', NETWORK], { stdio: 'ignore' })
  spawnSync('docker', ['rm', '-f', VPS], { stdio: 'ignore' })

  const runArgs = [
    'run',
    '-d',
    // NOTE - Reap the zombie processes left by the stopped servers
    '--init',
    '--name',
    VPS,
    '--hostname',
    VPS,
    '--network',
    NETWORK,
    '--cpus',
    CONFIG.cpus,
    '--memory',
    CONFIG.memory,
    '--memory-swap',
    CONFIG.memory,
    '--cap-add',
    'NET_ADMIN',
  ]
  try {
    docker([...runArgs, '--storage-opt', `size=${CONFIG.disk}`, IMAGE])
  } catch {
    spawnSync('docker', ['rm', '-f', VPS], { stdio: 'ignore' })
    docker([...runArgs, IMAGE])
  }
  // NOTE - overlayfs on ext4 may accept --storage-opt without enforcing it,
  // so check the real size of the root filesystem
  const diskSizeGB = Number(
    vpsExec("df -BG --output=size / | tail -1 | tr -dc '0-9'")
  )
  const diskLimited = diskSizeGB <= parseInt(CONFIG.disk, 10) + 1

  docker(['cp', `${LAB_DIR}/.`, `${VPS}:/app/scripts/vps-lab/`])
  vpsExec(
    `tc qdisc replace dev eth0 root netem delay ${CONFIG.netDelay} 5ms rate ${CONFIG.netRate}`
  )
  log(
    `VPS: ${vpsExec('cat /etc/centos-release')}, ${CONFIG.cpus} CPU, ${CONFIG.memory} RAM, ` +
      `disk ${diskLimited ? CONFIG.disk : `${diskSizeGB}G (not limited, overlayfs)`}, network ${CONFIG.netRate} +${CONFIG.netDelay}`
  )
  return { diskLimited }
} // setupVps

const resetVps = () => {
  vpsExec(
    [
      // NOTE - "[x]" so a pattern does not match this sh -c command itself
      "pkill -f '[s]cripts/vps-lab/sampler.sh'",
      "pkill -f '[n]pm run start'",
      "pkill -f '[c]onfig/scripts/start'",
      "pkill -f '[s]erver/dist/index'",
      "pkill -9 -f '[l]ightpanda(-bin)? serve'",
      "pkill -9 -f '[c]hromium'",
      '(redis-cli shutdown nosave || valkey-cli shutdown nosave) 2>/dev/null',
      'sleep 1',
      'rm -rf /tmp/pages /tmp/views /tmp/data /tmp/store /tmp/browsers /tmp/WorkerManager /tmp/samples.txt',
      'true',
    ].join('; ')
  )
} // resetVps

const startServer = async ({ engine, redis, crawlProfile }) => {
  const script = redis ? 'start:redis-api' : 'start'
  const startTime = Date.now()
  docker([
    'exec',
    '-d',
    '-e',
    `BROWSER_ENGINE=${engine}`,
    '-e',
    `CRAWL_PROFILE=${crawlProfile}`,
    VPS,
    'sh',
    '-c',
    `cd /app && npm run ${script} > /tmp/server.log 2>&1`,
  ])

  while (Date.now() - startTime < 300000) {
    const code = vpsExec(
      "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/ || true"
    )
    if (code === '200') return Date.now() - startTime
    await sleep(1000)
  }
  throw new Error(
    `Server did not start:\n${vpsExec('tail -50 /tmp/server.log')}`
  )
} // startServer

const readSamples = () =>
  vpsExec('cat /tmp/samples.txt')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [time, anon, total, cpu, oom, node, browser, browserProcs, redis] =
        line.split(' ').map(Number)
      return { time, anon, total, cpu, oom, node, browser, browserProcs, redis }
    })

const phaseStats = (samples, from, to) => {
  const list = samples.filter(
    (sample) => sample.time >= from && sample.time <= to
  )
  if (list.length < 2) return {}
  const max = (key) => Math.max(...list.map((sample) => sample[key]))
  const avg = (key) =>
    list.reduce((total, sample) => total + sample[key], 0) / list.length
  const first = list[0]
  const last = list.at(-1)
  return {
    avgRamMB: +avg('anon').toFixed(0),
    peakRamMB: +max('anon').toFixed(0),
    peakNodeMB: +max('node').toFixed(0),
    peakBrowserMB: +max('browser').toFixed(0),
    peakBrowserProcs: max('browserProcs'),
    peakRedisMB: +max('redis').toFixed(0),
    avgCpuCores: +(
      (last.cpu - first.cpu) /
      1000 /
      (last.time - first.time)
    ).toFixed(2),
    oomKills: last.oom - first.oom,
  }
} // phaseStats

const runScenario = async (name) => {
  const engine = name.split('+')[0]
  const redis = name.includes('+redis')
  const crawlProfile = /\+(default|fast)\b/.exec(name)?.[1] ?? ''
  log(`=== ${name} ===`)

  resetVps()
  const startupMs = await startServer({ engine, redis, crawlProfile })
  const preflight = vpsExec("grep -a '\\[preflight\\]' /tmp/server.log || true")
  log(
    `server ready in ${(startupMs / 1000).toFixed(1)}s${preflight ? `\n${preflight}` : ''}`
  )

  vpsExec(
    'nohup sh /app/scripts/vps-lab/sampler.sh /tmp/samples.txt >/dev/null 2>&1 &'
  )

  // NOTE - Warm up the browser and the API cache, not measured
  client({ mode: 'burst', paths: [WARMUP_PATH], timeoutMs: 180000 })
  const apiCheck = client({
    mode: 'check',
    paths: API_PATHS,
    headers: { Accept: 'application/json' },
  })
  const apiPaths = API_PATHS.filter((_, i) => apiCheck[i].status === 200)

  const idleFrom = vpsTime()
  await sleep(15000)
  const idleTo = vpsTime()

  log(`burst: ${BURST_PATHS.length} new bot pages at once`)
  const burstFrom = vpsTime()
  const burst = client({ mode: 'burst', paths: BURST_PATHS, timeoutMs: 300000 })
  const burstTo = vpsTime()

  log(`load: ${CONFIG.loadVus} users for ${CONFIG.loadSeconds}s`)
  const loadFrom = vpsTime()
  const load = client({
    mode: 'load',
    durationMs: CONFIG.loadSeconds * 1000,
    vus: CONFIG.loadVus,
    mix: { fresh: 0.05, api: 0.3 },
    cachedPaths: BURST_PATHS,
    apiPaths,
    freshPaths: FRESH_PATHS,
  })
  const loadTo = vpsTime()

  // NOTE - How many of the new pages asked during the load got rendered
  const freshCheck = load.freshRequested.length
    ? client({ mode: 'check', paths: load.freshRequested })
    : []

  vpsExec("pkill -f '[s]cripts/vps-lab/sampler.sh' || true")
  const samples = readSamples()
  const serverErrors = Number(
    vpsExec(
      "grep -aciE 'out of memory|EAGAIN|ENOMEM|Target closed|Protocol error' /tmp/server.log || true"
    )
  )
  resetVps()

  const readyTimes = burst
    .map((item) => item.readyMs)
    .filter((ms) => ms !== null)

  return {
    name,
    engine,
    redis,
    startupMs,
    preflight,
    apiPaths: apiPaths.length,
    idle: phaseStats(samples, idleFrom, idleTo),
    burst: {
      ...phaseStats(samples, burstFrom, burstTo),
      pages: burst.length,
      ready: readyTimes.length,
      allReadyMs:
        readyTimes.length === burst.length ? Math.max(...readyTimes) : null,
      medianReadyMs:
        readyTimes.sort((a, b) => a - b)[Math.floor(readyTimes.length / 2)] ??
        null,
      paths: burst.map(({ path, readyMs }) => ({ path, readyMs })),
    },
    load: {
      ...phaseStats(samples, loadFrom, loadTo),
      cached: load.cached,
      api: load.api,
      fresh: load.fresh,
      freshRendered: freshCheck.filter((item) => item.status === 200).length,
    },
    serverErrors,
  }
} // runScenario

const printReport = (results) => {
  const row = (result, phase) => ({
    scenario: result.name,
    'avg RAM MB': result[phase].avgRamMB,
    'peak RAM MB': result[phase].peakRamMB,
    'browser MB': result[phase].peakBrowserMB,
    'node MB': result[phase].peakNodeMB,
    'redis MB': result[phase].peakRedisMB,
    'CPU cores': result[phase].avgCpuCores,
    OOM: result[phase].oomKills,
  })

  for (const phase of ['idle', 'burst', 'load']) {
    console.log(`\n--- ${phase} (resources) ---`)
    console.table(results.map((result) => row(result, phase)))
  }

  console.log('\n--- burst: new bot pages at once ---')
  console.table(
    results.map((result) => ({
      scenario: result.name,
      ready: `${result.burst.ready}/${result.burst.pages}`,
      'median ready s':
        result.burst.medianReadyMs &&
        +(result.burst.medianReadyMs / 1000).toFixed(1),
      'all ready s':
        result.burst.allReadyMs && +(result.burst.allReadyMs / 1000).toFixed(1),
    }))
  )
  for (const result of results)
    console.log(
      `${result.name}: ` +
        result.burst.paths
          .map(
            ({ path, readyMs }) =>
              `${path}=${readyMs === null ? '-' : (readyMs / 1000).toFixed(1) + 's'}`
          )
          .join(' ')
    )

  console.log('\n--- load: mixed traffic ---')
  console.table(
    results.flatMap((result) =>
      ['cached', 'api'].map((kind) => ({
        scenario: result.name,
        kind,
        'req/s': result.load[kind].rps,
        'ok %':
          result.load[kind].count &&
          +((result.load[kind].ok / result.load[kind].count) * 100).toFixed(1),
        'p50 ms': result.load[kind].p50,
        'p95 ms': result.load[kind].p95,
        'p99 ms': result.load[kind].p99,
      }))
    )
  )
  console.table(
    results.map((result) => ({
      scenario: result.name,
      'new pages asked': result.load.fresh.count,
      'rendered during load': result.load.freshRendered,
      'server errors in log': result.serverErrors,
      'startup s': +(result.startupMs / 1000).toFixed(1),
    }))
  )
} // printReport

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const { diskLimited } = setupVps()
  docker(['pull', '-q', CLIENT_IMAGE])

  const results = []
  for (const name of SCENARIOS) {
    try {
      results.push(await runScenario(name))
    } catch (err) {
      log(`${name} failed: ${err.message}`)
    }
  }

  printReport(results)

  const file = path.join(OUT_DIR, `report-${Date.now()}.json`)
  fs.writeFileSync(
    file,
    JSON.stringify({ config: { ...CONFIG, diskLimited }, results }, null, 2)
  )
  log(`Report written to ${file}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
