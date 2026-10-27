/**
 * Load client of the VPS lab. Runs in its own container (not inside the
 * VPS) so generating load does not steal the VPS CPU.
 *
 * node load.mjs '<json>'
 *   { mode: 'check', base, paths }                    -> status of each path
 *   { mode: 'burst', base, paths, timeoutMs }         -> time until each bot
 *                                                        page is served (200)
 *   { mode: 'load', base, durationMs, vus, mix, cachedPaths, apiPaths,
 *     freshPaths }                                     -> latency / throughput
 */
const BOT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  Accept: 'text/html',
  'Accept-Encoding': 'gzip, deflate, br',
}
const API_HEADERS = {
  Accept: 'application/json',
  'Accept-Encoding': 'gzip, deflate, br',
}
const HUMAN_HEADERS = {
  desktop: {
    ...BOT_HEADERS,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
  },
  mobile: {
    ...BOT_HEADERS,
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
  },
}
const REQUEST_TIMEOUT = 30000

const options = JSON.parse(process.argv[2] || '{}')
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

const request = async (url, headers) => {
  const startTime = performance.now()
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    const body = await res.arrayBuffer()
    return {
      status: res.status,
      bytes: body.byteLength,
      ms: performance.now() - startTime,
    }
  } catch (err) {
    return {
      status: err.name === 'TimeoutError' ? 'timeout' : 'error',
      bytes: 0,
      ms: performance.now() - startTime,
    }
  }
} // request

const percentile = (sorted, p) =>
  sorted.length
    ? +sorted[
        Math.min(sorted.length - 1, Math.floor(sorted.length * p))
      ].toFixed(1)
    : null

const summarize = (results, durationMs, isOk) => {
  const latencies = results.map((item) => item.ms).sort((a, b) => a - b)
  const statuses = {}
  for (const item of results)
    statuses[item.status] = (statuses[item.status] || 0) + 1
  return {
    count: results.length,
    rps: +(results.length / (durationMs / 1000)).toFixed(1),
    ok: results.filter(isOk).length,
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
    p99: percentile(latencies, 0.99),
    max: latencies.length ? +latencies.at(-1).toFixed(1) : null,
    statuses,
  }
} // summarize

const check = async ({ base, paths, headers = BOT_HEADERS }) =>
  Promise.all(
    paths.map(async (path) => ({
      path,
      ...(await request(base + path, headers)),
    }))
  )

const burst = async ({ base, paths, timeoutMs, intervalMs = 500 }) => {
  const startTime = Date.now()
  const deadline = startTime + timeoutMs

  return Promise.all(
    paths.map(async (path) => {
      let attempts = 0
      let first
      while (Date.now() < deadline) {
        attempts++
        const result = await request(base + path, BOT_HEADERS)
        // NOTE - The first answer of a new page: 200 (rendered in time) or
        // 503 / 504 and how long the bot waited for it
        first ??= { status: result.status, ms: Math.round(result.ms) }
        if (result.status === 200 && result.bytes)
          return { path, readyMs: Date.now() - startTime, attempts, first }
        await sleep(intervalMs)
      }
      return { path, readyMs: null, attempts, first }
    })
  )
} // burst

const load = async ({
  base,
  durationMs,
  vus,
  mix,
  cachedPaths,
  apiPaths,
  freshPaths,
  seed = 12345,
}) => {
  const results = { cached: [], api: [], fresh: [], mobile: [], desktop: [] }
  const startedAt = Date.now()
  const deadline = startedAt + durationMs
  let freshIndex = 0
  let state = seed >>> 0
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 2 ** 32
  }
  const pick = (list) => list[Math.floor(random() * list.length)]

  const user = async () => {
    while (Date.now() < deadline) {
      const roll = random()
      if (roll < mix.fresh && freshIndex < freshPaths.length) {
        const path = freshPaths[freshIndex++]
        results.fresh.push({
          path,
          ...(await request(base + path, BOT_HEADERS)),
        })
      } else if (roll < mix.fresh + mix.api) {
        results.api.push(await request(base + pick(apiPaths), API_HEADERS))
      } else if (roll < mix.fresh + mix.api + (mix.interactive ?? 0)) {
        const kind = random() < 0.5 ? 'mobile' : 'desktop'
        results[kind].push(
          await request(base + pick(cachedPaths), HUMAN_HEADERS[kind])
        )
      } else {
        results.cached.push(
          await request(base + pick(cachedPaths), BOT_HEADERS)
        )
      }
    }
  }

  await Promise.all(Array.from({ length: vus }, user))
  const elapsedMs = Date.now() - startedAt

  return {
    elapsedMs,
    cached: summarize(results.cached, elapsedMs, (item) => item.status === 200),
    api: summarize(results.api, elapsedMs, (item) => item.status === 200),
    mobile: summarize(results.mobile, elapsedMs, (item) => item.status === 200),
    desktop: summarize(
      results.desktop,
      elapsedMs,
      (item) => item.status === 200
    ),
    // NOTE - A fresh page is usually answered 503 while it renders in background
    fresh: summarize(
      results.fresh,
      elapsedMs,
      (item) => typeof item.status === 'number'
    ),
    freshRequested: results.fresh.map((item) => item.path),
  }
} // load

// NOTE - Hammer one kind of request: vus users request paths (round robin)
// with headers for durationMs
const hammer = async ({ base, paths, headers, vus, durationMs }) => {
  const results = []
  const deadline = Date.now() + durationMs
  let index = 0

  await Promise.all(
    Array.from({ length: vus }, async () => {
      while (Date.now() < deadline)
        results.push(
          await request(base + paths[index++ % paths.length], headers)
        )
    })
  )

  return summarize(results, durationMs, (item) => item.status === 200)
} // hammer

const modes = { check, burst, load, hammer }

modes[options.mode](options)
  .then((result) => console.log(JSON.stringify(result)))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
