import http from 'node:http'
const options = JSON.parse(process.argv[2] || '{}')
const base = options.base || 'http://vps-min-candidate:8080'
const bot = {
  'user-agent':
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'accept-encoding': 'br, gzip',
}
const human = {
  'user-agent': 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
  'accept-encoding': 'br, gzip',
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const bytes = Buffer.alloc(49152)
let state = 123456
for (let i = 0; i < bytes.length; i++) {
  state ^= state << 13
  state ^= state >>> 17
  state ^= state << 5
  bytes[i] = state & 255
}
const payload = bytes.toString('base64')
if (options.mode === 'upstream') {
  http
    .createServer((req, res) => {
      res.setHeader('content-type', 'application/json')
      setTimeout(() => res.end(JSON.stringify({ id: req.url, payload })), 80)
    })
    .listen(8889, '0.0.0.0')
} else {
  const request = async (path, kind = 'cached', apiId) => {
    const started = performance.now(),
      deadline = started + 15000
    let firstStatus,
      attempts = 0
    try {
      for (;;) {
        const remaining = deadline - performance.now()
        if (remaining <= 0) throw new Error('Cold request deadline exceeded')
        attempts++
        const r = await fetch(base + path, {
          headers: kind === 'human' ? human : bot,
          signal: AbortSignal.timeout(Math.max(1, Math.floor(remaining))),
        })
        const text = await r.text()
        firstStatus ??= r.status
        if (
          (kind === 'fresh' || kind === 'warm') &&
          r.status === 503 &&
          deadline - performance.now() > 1000
        ) {
          await wait(1000)
          continue
        }
        const id = Number(path.match(/\/(?:detail|fresh)\/(\d+)/)?.[1] || 0)
        const marker = new RegExp(
          '<h1\\b[^>]*\\bdata-ready=(?:"' +
            id +
            '"|\'' +
            id +
            "'|" +
            id +
            '(?=[\\s>]))[^>]*>Item ' +
            id +
            '(?:<|$)'
        )
        let valid = false
        if (kind === 'api') {
          try {
            const json = JSON.parse(text)
            valid = json.id === '/data/' + apiId && json.payload === payload
          } catch {}
        } else if (kind === 'human')
          valid =
            /<!doctype html|<html/i.test(text) &&
            (/minimum-app\.js/.test(text) || marker.test(text))
        else
          valid =
            marker.test(text) &&
            (text.match(/<p(?:\s|>)/g) || []).length === 100 &&
            text.length >= 40000
        return {
          path,
          kind,
          status: r.status,
          firstStatus,
          attempts,
          ms: performance.now() - started,
          valid: r.status === 200 && valid,
          bytes: Buffer.byteLength(text),
        }
      }
    } catch (error) {
      return {
        path,
        kind,
        status: error.name,
        firstStatus,
        attempts,
        ms: performance.now() - started,
        valid: false,
      }
    }
  }
  const summary = (items) => {
    const sorted = items.map((x) => x.ms).sort((a, b) => a - b),
      statuses = {},
      firstStatuses = {}
    for (const x of items) {
      statuses[x.status] = (statuses[x.status] || 0) + 1
      firstStatuses[x.firstStatus] = (firstStatuses[x.firstStatus] || 0) + 1
    }
    const p = (q) =>
      sorted.length
        ? Math.round(
            sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
          )
        : null
    return {
      count: items.length,
      ok: items.filter((x) => x.status === 200 && x.valid).length,
      p50: p(0.5),
      p95: p(0.95),
      p99: p(0.99),
      statuses,
      firstStatuses,
      attempts: items.reduce((n, x) => n + x.attempts, 0),
    }
  }
  if (options.mode === 'check' || options.mode === 'warm') {
    const results = []
    let i = 0
    for (const p of options.paths || ['/']) {
      const r = await request(
        p,
        options.mode === 'warm' ? 'warm' : options.kind || 'cached',
        options.kind === 'api' ? i : undefined
      )
      results.push(r)
      i++
      if (options.mode === 'warm' && !r.valid) break
    }
    console.log(JSON.stringify({ results, summary: summary(results) }))
  } else if (options.mode === 'load') {
    const duration = options.seconds * 1000,
      rate = options.rps || 20,
      max = options.vus || 20,
      start = performance.now(),
      active = new Set(),
      results = []
    let index = 0,
      dropped = 0
    const apiPaths = options.apiPaths || []
    while (performance.now() - start < duration) {
      const due = start + (index * 1000) / rate
      if (performance.now() < due) {
        await wait(Math.min(100, due - performance.now()))
        continue
      }
      const n = index++,
        kind =
          n % 40 === 0
            ? 'fresh'
            : n % 10 < 4
              ? 'api'
              : n % 10 < 6
                ? 'human'
                : 'cached'
      const path =
        kind === 'api'
          ? apiPaths[n % apiPaths.length]
          : kind === 'fresh'
            ? '/fresh/' + ((options.freshBase || 1000) + Math.floor(n / 40))
            : '/detail/' + (n % 8)
      if (active.size >= max) {
        dropped++
        continue
      }
      const task = request(
        path,
        kind,
        kind === 'api' ? n % apiPaths.length : undefined
      )
        .then((r) => results.push(r))
        .finally(() => active.delete(task))
      active.add(task)
    }
    const offeredLoadMs = performance.now() - start
    await Promise.all(active)
    const groups = {}
    for (const kind of ['cached', 'api', 'human', 'fresh'])
      groups[kind] = summary(results.filter((x) => x.kind === kind))
    console.log(
      JSON.stringify({
        elapsedMs: Math.round(performance.now() - start),
        offeredLoadMs: Math.round(offeredLoadMs),
        targetRps: rate,
        scheduled: index,
        dropped,
        ...groups,
      })
    )
  } else throw Error('Unknown mode')
}
