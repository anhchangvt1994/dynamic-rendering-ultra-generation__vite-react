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
}) => {
  const results = { cached: [], api: [], fresh: [] }
  const deadline = Date.now() + durationMs
  let freshIndex = 0
  const pick = (list) => list[Math.floor(Math.random() * list.length)]

  const user = async () => {
    while (Date.now() < deadline) {
      const roll = Math.random()
      if (roll < mix.fresh && freshIndex < freshPaths.length) {
        const path = freshPaths[freshIndex++]
        results.fresh.push({
          path,
          ...(await request(base + path, BOT_HEADERS)),
        })
      } else if (roll < mix.fresh + mix.api) {
        results.api.push(await request(base + pick(apiPaths), API_HEADERS))
      } else {
        results.cached.push(
          await request(base + pick(cachedPaths), BOT_HEADERS)
        )
      }
    }
  }

  await Promise.all(Array.from({ length: vus }, user))

  return {
    cached: summarize(
      results.cached,
      durationMs,
      (item) => item.status === 200
    ),
    api: summarize(results.api, durationMs, (item) => item.status === 200),
    // NOTE - A fresh page is usually answered 503 while it renders in background
    fresh: summarize(
      results.fresh,
      durationMs,
      (item) => typeof item.status === 'number'
    ),
    freshRequested: results.fresh.map((item) => item.path),
  }
} // load

const modes = { check, burst, load }

modes[options.mode](options)
  .then((result) => console.log(JSON.stringify(result)))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
