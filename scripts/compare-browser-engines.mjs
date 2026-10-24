/**
 * Compare chromium vs lightpanda for ISR rendering, end to end.
 *
 * For each engine it starts the real server (preview mode) with
 * BROWSER_ENGINE=<engine>, clears the ISR cache, requests every route as
 * Googlebot at the same time and polls until each one is served from cache.
 * While that runs it samples RSS / CPU of the whole server process tree
 * (node + browser processes). Then it compares the HTML of both engines.
 *
 * Usage:
 *   npm run build && npm run install:lightpanda
 *   node scripts/compare-browser-engines.mjs [route ...]
 *
 * Options (env):
 *   ENGINES=chromium,lightpanda   engines to run
 *   OUT_DIR=./.compare-engines     where HTML and the report are written
 *   ROUND_TIMEOUT=180000           max ms to wait for all routes
 */
import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT_DIR = path.resolve(ROOT, process.env.OUT_DIR || '.compare-engines')
const ENGINES = (process.env.ENGINES || 'chromium,lightpanda').split(',')
const ROUND_TIMEOUT = Number(process.env.ROUND_TIMEOUT || 180000)
const BOT_UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const CACHE_DIRS = [
  'server/src/puppeteer-ssr/utils/Cache.worker/pages',
  'server/src/puppeteer-ssr/utils/Cache.worker/views',
]
const DEFAULT_ROUTES = [
  '/',
  '/blogs',
  '/pokemon/pikachu',
  '/pokemon/bulbasaur',
  '/pokemon/charizard',
  '/pokemon/mewtwo',
  '/pokemon/gengar',
  '/pokemon/eevee',
  '/pokemon/snorlax',
  '/pokemon/lucario',
]
const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : DEFAULT_ROUTES

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

const clearCache = () => {
  for (const dir of CACHE_DIRS) {
    const absDir = path.resolve(ROOT, dir)
    if (!fs.existsSync(absDir)) continue
    for (const file of fs.readdirSync(absDir))
      fs.rmSync(path.join(absDir, file), { recursive: true, force: true })
  }
}

const listProcesses = () =>
  execSync('ps -A -o pid=,ppid=,rss=,%cpu=,args=')
    .toString()
    .trim()
    .split('\n')
    .map((line) => {
      const [pid, ppid, rss, cpu, ...args] = line.trim().split(/\s+/)
      return {
        pid: +pid,
        ppid: +ppid,
        rss: +rss / 1024,
        cpu: +cpu,
        args: args.join(' '),
      }
    })

// NOTE - A process and all of its descendants
const getTree = (rootPid) => {
  const rows = listProcesses()
  const tree = new Set([rootPid])
  let size = 0
  while (size !== tree.size) {
    size = tree.size
    for (const row of rows) if (tree.has(row.ppid)) tree.add(row.pid)
  }
  return rows.filter((row) => tree.has(row.pid))
}

// NOTE - RSS (MB) and CPU (%) of a process and all of its descendants
const sampleTree = (rootPid) => {
  const members = getTree(rootPid)
  const isBrowser = (row) => /chrom|lightpanda/i.test(row.args)
  const sum = (list, key) => list.reduce((total, row) => total + row[key], 0)

  return {
    rss: sum(members, 'rss'),
    cpu: sum(members, 'cpu'),
    browserRss: sum(members.filter(isBrowser), 'rss'),
    browserProcesses: members.filter(isBrowser).length,
  }
}

const startServer = (engine) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['-r', 'sucrase/register', 'server/src/index.ts'],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          ENV: 'production',
          MODE: 'development',
          BROWSER_ENGINE: engine,
        },
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
    const timeout = setTimeout(
      () => reject(new Error('Server did not start')),
      60000
    )
    child.stdout.on('data', (data) => {
      const port = /Server started port (\d+)/.exec(String(data))?.[1]
      if (port) {
        clearTimeout(timeout)
        resolve({ child, port })
      }
    })
    child.stderr.on('data', () => {})
    child.once('exit', (code) =>
      reject(new Error(`Server exited with code ${code}`))
    )
  })

// NOTE - Chromium and vite run in their own process group, kill the whole tree
const stopServer = async (child) => {
  for (const { pid } of getTree(child.pid).reverse()) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {}
  }
  await sleep(1500)
}

// NOTE - Request as Googlebot until the page is served (200) or times out
const fetchUntilReady = async (url, deadline) => {
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': BOT_UA } })
      const body = await res.text()
      if (res.status === 200 && body.length) return { status: 200, body }
    } catch {}
    await sleep(250)
  }
  return { status: 0, body: '' }
}

const runEngine = async (engine) => {
  console.log(`\n=== ${engine} ===`)
  clearCache()

  const { child, port } = await startServer(engine)
  const baseUrl = `http://localhost:${port}`

  // NOTE - Let the server and the browser settle, then measure idle resources
  await sleep(15000)
  const idleSamples = []
  for (let i = 0; i < 5; i++) {
    idleSamples.push(sampleTree(child.pid))
    await sleep(1000)
  }
  const median = (key) =>
    idleSamples.map((sample) => sample[key]).sort((a, b) => a - b)[2]
  const idle = { rss: median('rss'), browserRss: median('browserRss') }

  const samples = []
  const sampler = setInterval(() => samples.push(sampleTree(child.pid)), 200)

  const startTime = Date.now()
  const deadline = startTime + ROUND_TIMEOUT
  const pages = await Promise.all(
    routes.map(async (route) => {
      const result = await fetchUntilReady(`${baseUrl}${route}`, deadline)
      return { route, ...result, readyMs: Date.now() - startTime }
    })
  )
  const totalMs = Date.now() - startTime

  clearInterval(sampler)
  await stopServer(child)

  const engineDir = path.join(OUT_DIR, engine)
  fs.mkdirSync(engineDir, { recursive: true })
  for (const page of pages)
    fs.writeFileSync(
      path.join(engineDir, `${page.route.replace(/\//g, '_') || '_'}.html`),
      page.body
    )

  const max = (key) => Math.max(...samples.map((sample) => sample[key]), 0)
  const peakSample = samples.reduce(
    (peak, sample) => (sample.rss > peak.rss ? sample : peak),
    { rss: 0, browserRss: 0 }
  )
  const avg = (key) =>
    samples.reduce((total, sample) => total + sample[key], 0) /
    (samples.length || 1)

  const stats = {
    engine,
    idleRss: idle.rss,
    idleBrowserRss: idle.browserRss,
    peakRss: max('rss'),
    peakBrowserRss: max('browserRss'),
    peakNodeRss: peakSample.rss - peakSample.browserRss,
    peakBrowserProcesses: max('browserProcesses'),
    avgCpu: avg('cpu'),
    peakCpu: max('cpu'),
    totalMs,
    pages,
  }

  console.log(
    `idle ${idle.rss.toFixed(0)}MB (browser ${idle.browserRss.toFixed(0)}MB) | ` +
      `peak ${stats.peakRss.toFixed(0)}MB (browser ${stats.peakBrowserRss.toFixed(0)}MB, ${stats.peakBrowserProcesses} procs) | ` +
      `avg CPU ${stats.avgCpu.toFixed(0)}% | all ${routes.length} routes ready in ${totalMs}ms`
  )

  return stats
}

// NOTE - Content summary of an HTML page, used to compare engines
const analyze = (html) => {
  const pick = (regex) => regex.exec(html)?.[1]?.trim() ?? ''
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i),
    description: pick(
      /<meta[^>]*?content=("[^"]*"|[^\s>]+)[^>]*?name=["']?description/i
    ).replace(/^"|"$/g, ''),
    links: (html.match(/<a[\s>]/gi) || []).length,
    headings: (html.match(/<h[1-6][\s>]/gi) || []).length,
    jsonLd: (html.match(/application\/ld\+json/gi) || []).length,
    words: new Set(text.toLowerCase().split(' ').filter(Boolean)),
    textLength: text.length,
  }
}

const jaccard = (a, b) => {
  if (!a.size && !b.size) return 1
  let intersection = 0
  for (const word of a) if (b.has(word)) intersection++
  return intersection / (a.size + b.size - intersection)
}

const compare = (base, other) => {
  const rows = base.pages.map((page) => {
    const otherPage = other.pages.find((item) => item.route === page.route)
    const a = analyze(page.body)
    const b = analyze(otherPage?.body ?? '')
    const diffs = []
    if (a.title !== b.title) diffs.push('title')
    if (a.description !== b.description) diffs.push('description')
    if (a.links !== b.links) diffs.push(`links ${a.links}→${b.links}`)
    if (a.headings !== b.headings)
      diffs.push(`headings ${a.headings}→${b.headings}`)
    if (a.jsonLd !== b.jsonLd) diffs.push(`json-ld ${a.jsonLd}→${b.jsonLd}`)

    return {
      route: page.route,
      status: `${page.status}/${otherPage?.status ?? '-'}`,
      ready: `${page.readyMs}/${otherPage?.readyMs ?? '-'}ms`,
      bytes: `${page.body.length}/${otherPage?.body.length ?? 0}`,
      textSimilarity: `${(jaccard(a.words, b.words) * 100).toFixed(1)}%`,
      diffs: diffs.join(', ') || 'none',
    }
  })

  console.log(`\n=== content: ${base.engine} vs ${other.engine} ===`)
  console.table(rows)

  return rows
}

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const results = []
  for (const engine of ENGINES) results.push(await runEngine(engine))

  clearCache()

  console.log('\n=== resources ===')
  console.table(
    results.map((result) => ({
      engine: result.engine,
      'idle total MB': result.idleRss.toFixed(0),
      'idle browser MB': result.idleBrowserRss.toFixed(0),
      'peak total MB': result.peakRss.toFixed(0),
      'peak browser MB': result.peakBrowserRss.toFixed(0),
      'node at peak MB': result.peakNodeRss.toFixed(0),
      'browser procs': result.peakBrowserProcesses,
      'avg CPU %': result.avgCpu.toFixed(0),
      'all ready ms': result.totalMs,
    }))
  )

  const contentRows =
    results.length > 1 ? compare(results[0], results[1]) : undefined

  fs.writeFileSync(
    path.join(OUT_DIR, 'report.json'),
    JSON.stringify(
      {
        routes,
        results: results.map(({ pages, ...rest }) => ({
          ...rest,
          pages: pages.map(({ body, ...page }) => page),
        })),
        content: contentRows,
      },
      null,
      2
    )
  )
  console.log(`\nReport and HTML written to ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
