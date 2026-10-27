import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { Worker } from 'node:worker_threads'
import vm from 'node:vm'
import test from 'node:test'
import { transform } from 'sucrase'

const root = path.resolve(import.meta.dirname, '../..')
function load(file, dependencies = {}, suffix = '', globals = {}) {
  const filename = path.join(root, file)
  const module = { exports: {} }
  const require = createRequire(filename)
  vm.runInNewContext(
    transform(readFileSync(filename, 'utf8') + suffix, {
      transforms: ['typescript', 'imports'],
    }).code,
    {
      module,
      exports: module.exports,
      __dirname: path.dirname(filename),
      __filename: filename,
      require: (name) => dependencies[name] ?? require(name),
      process,
      console,
      Buffer,
      URL,
      Headers,
      Request,
      fetch,
      AbortController,
      AbortSignal,
      SharedArrayBuffer,
      Atomics,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      ...globals,
    },
    { filename }
  )
  return module.exports
}

test('CPU/RAM budget includes the multiplication by PM2 instances and HTTP workers', () => {
  const { getResourceBudget } = load('server/src/utils/ResourceBudget.ts')
  for (const resources of [
    { cpuCount: 2, memoryMB: 1024 },
    { cpuCount: 4, memoryMB: 8192 },
  ]) {
    const budget = getResourceBudget({}, resources)
    assert.ok(
      budget.instances * budget.renderConcurrency <=
        Math.max(1, resources.cpuCount - 1)
    )
    assert.ok(budget.requestWorkers <= budget.renderConcurrency)
    assert.ok(
      budget.instances * budget.processMemoryMB <= resources.memoryMB * 0.8
    )
  }
})

test('multicore defaults match the measured two-render profile while low RAM stays capped', () => {
  const { getResourceBudget } = load('server/src/utils/ResourceBudget.ts')
  const resources = { cpuCount: 2, memoryMB: 4096 }
  const budget = getResourceBudget({}, resources)
  assert.equal(budget.instances, 1)
  assert.equal(budget.requestWorkers, 1)
  assert.equal(budget.renderConcurrency, 2)
  assert.equal(
    JSON.stringify(budget),
    JSON.stringify(getResourceBudget({ CRAWL_CONCURRENCY: 2 }, resources))
  )
  assert.equal(
    getResourceBudget({}, { cpuCount: 1, memoryMB: 4096 }).renderConcurrency,
    1
  )
  assert.equal(
    getResourceBudget({}, { cpuCount: 2, memoryMB: 1024 }).renderConcurrency,
    1
  )
})

test('render permits are shared across actual worker threads', async () => {
  const modulePath = path.join(root, 'server/src/utils/RenderGate.ts')
  const state = new SharedArrayBuffer(4)
  const observations = new SharedArrayBuffer(12)
  const code = `
    require(${JSON.stringify(createRequire(import.meta.url).resolve('sucrase/register'))});
    const { workerData, parentPort } = require('node:worker_threads');
    const { createRenderGate } = require(workerData.modulePath);
    const gate = createRenderGate({ limit: 2, queueLimit: 12, waitTimeoutMs: 2000, sharedState: workerData.state });
    const counters = new Int32Array(workerData.observations);
    Promise.all(Array.from({ length: 8 }, () => gate.run(async () => {
      const active = Atomics.add(counters, 0, 1) + 1;
      Atomics.store(counters, 1, Math.max(Atomics.load(counters, 1), active));
      await new Promise(r => setTimeout(r, 10));
      Atomics.sub(counters, 0, 1); Atomics.add(counters, 2, 1);
    }))).then(() => parentPort.postMessage('done')).catch(e => { throw e });
  `
  await Promise.all(
    Array.from(
      { length: 3 },
      () =>
        new Promise((resolve, reject) => {
          const worker = new Worker(code, {
            eval: true,
            workerData: { modulePath, state, observations },
          })
          worker.on('error', reject)
          worker.on('exit', (code) =>
            code === 0 ? resolve() : reject(new Error(`worker exit ${code}`))
          )
        })
    )
  )
  assert.ok(new Int32Array(observations)[1] <= 2)
  assert.equal(new Int32Array(observations)[2], 24)
  assert.equal(new Int32Array(state)[0], 0)
})

test('render queue rejects excess/expired work and returns permits after failures', async () => {
  const { createRenderGate } = load('server/src/utils/RenderGate.ts')
  const gate = createRenderGate({ limit: 1, queueLimit: 1, waitTimeoutMs: 30 })
  let finish
  const running = gate.run(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  await delay(5)
  let ran = false
  const queued = gate.run(async () => {
    ran = true
  })
  const expired = assert.rejects(queued, /queue|busy|timeout/i)
  await assert.rejects(
    gate.run(async () => {}),
    /queue|busy|full/i
  )
  await expired
  assert.equal(ran, false)
  finish()
  await running
  await assert.rejects(
    gate.run(async () => {
      throw new Error('render failed')
    }),
    /render failed/
  )
  assert.equal(await gate.run(async () => 'ready'), 'ready')
})

test('all render admission waits for memory headroom and resumes when it recovers', async () => {
  const { createRenderGate } = load('server/src/utils/RenderGate.ts')
  let memoryReady = false
  let started = false
  const gate = createRenderGate({
    limit: 1,
    queueLimit: 2,
    waitTimeoutMs: 200,
    canStart: () => memoryReady,
  })
  const job = gate.run(async () => {
    started = true
  })
  await delay(20)
  assert.equal(started, false)
  memoryReady = true
  await job
  assert.equal(started, true)
})

test('hot cache evicts by bytes and refuses a single oversized body', () => {
  const { default: MemoryCache } = load('server/src/utils/MemoryCache.ts')
  const cache = MemoryCache({
    ttlMs: 1000,
    max: 100,
    maxBytes: 10,
    sizeOf: Buffer.byteLength,
  })
  cache.set('first', '123456')
  cache.set('second', 'abcdef')
  assert.equal(cache.get('first'), undefined)
  assert.equal(cache.get('second'), 'abcdef')
  cache.set('huge', 'x'.repeat(11))
  assert.equal(cache.get('huge'), undefined)
  assert.equal(cache.get('second'), 'abcdef')
})

test('render waiting lists have a finite size and discard expired work', async () => {
  const { default: CrawlQueue } = load('server/src/utils/CrawlQueue.ts')
  const queue = new CrawlQueue({ max: 2, ttlMs: 5 })
  queue.set('one', 1)
  queue.set('two', 2)
  queue.set('overflow', 3)
  assert.equal(queue.size, 2)
  assert.equal(queue.has('overflow'), false)
  await delay(15)
  assert.equal([...queue.values()].length, 0)
  queue.set('next', 4)
  assert.equal(queue.size, 1)
})

test('a queued ISR page cached by another worker releases its admission slot', async () => {
  const result = {
    status: 200,
    html: '<html>cached</html>',
    updatedAt: new Date(),
  }
  const api = load(
    'server/src/puppeteer-ssr/utils/ISRGenerator.next/index.ts',
    {
      '../../../constants': {
        BANDWIDTH_LEVEL: 1,
        BANDWIDTH_LEVEL_LIST: { ONE: 1, TWO: 2 },
        SERVER_LESS: false,
      },
      '../../../server.config': {
        crawl: { cache: { renewTime: 'infinite' }, routes: {} },
      },
      '../../../utils/ConsoleHandler': console,
      '../../../utils/InitEnv': { PROCESS_ENV: { BASE_URL: 'http://local' } },
      '../../../utils/PathHandler': { getPagesPath: () => '/tmp' },
      '../../../utils/CrawlQueue': load('server/src/utils/CrawlQueue.ts'),
      '../../constants': {},
      '../CrawlProfile': {
        CRAWL_LIMIT: 1,
        CRAWL_WAITING_LIMIT: 1,
        CRAWL_WAIT_OPTIONS: { firstResponseWaitMs: 0 },
        RESOURCE_BUDGET: { queueLimit: 32, queueTimeoutMs: 15000 },
        hasCrawlCapacity: (n) => n < 1,
        IS_FAST_CRAWL: true,
      },
      '../ISRHandler.worker': () => {
        throw Error('should not render fresh cache')
      },
      '../SSRGenerator.next/utils': { isPointsToRoute: () => false },
      '../Cache.worker/utils': { getKey: (x) => x },
      './CacheManager.worker/utils': () => ({
        achieve: async () => result,
        get: async () => result,
      }),
    },
    '\nmodule.exports.inspect = () => ({ waiting: totalRequestsWaitingToCrawl, queued: waitingToCrawlList.size }); module.exports.queue = queueCrawl; module.exports.tick = _crawlNextWaiting;',
    {
      setInterval: () => ({ unref() {} }),
    }
  )
  for (const name of ['first', 'next']) {
    api.queue({ url: `http://local/${name}?x=1` })
    api.tick()
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(api.inspect().waiting, 0)
    assert.equal(api.inspect().queued, 0)
  }
})

test('an unadmitted ISR request does not create a 53-second empty cache lock', async () => {
  let placeholderWrites = 0
  const api = load(
    'server/src/puppeteer-ssr/utils/ISRGenerator.next/index.ts',
    {
      '../../../constants': { SERVER_LESS: false },
      '../../../server.config': { crawl: { routes: {}, speed: 0 } },
      '../../../utils/ConsoleHandler': console,
      '../../../utils/InitEnv': { PROCESS_ENV: { BASE_URL: 'http://local' } },
      '../../../utils/PathHandler': { getPagesPath: () => '/tmp' },
      '../../../utils/CrawlQueue': load('server/src/utils/CrawlQueue.ts'),
      '../../constants': {},
      '../CrawlProfile': {
        CRAWL_LIMIT: 1,
        CRAWL_WAITING_LIMIT: 1,
        CRAWL_WAIT_OPTIONS: { firstResponseWaitMs: 0 },
        RESOURCE_BUDGET: { queueLimit: 32, queueTimeoutMs: 15000 },
        hasCrawlCapacity: () => false,
      },
      '../ISRHandler.worker': () => {
        throw Error('not admitted')
      },
      '../SSRGenerator.next/utils': { isPointsToRoute: () => false },
      '../Cache.worker/utils': { getKey: (x) => x },
      './CacheManager.worker/utils': () => ({
        achieve: async () => undefined,
        isExist: () => false,
        get: async () => {
          placeholderWrites++
          return { status: 503, response: '/tmp/maintenance' }
        },
      }),
    },
    '',
    { setInterval: () => ({ unref() {} }) }
  )
  const result = await api.default({ url: 'http://local/new?x=1' })
  assert.equal(result.status, 503)
  assert.equal(placeholderWrites, 0)
})

test('ISR and SSR handler entry points enforce one combined rendering limit', async () => {
  const { createRenderGate } = load('server/src/utils/RenderGate.ts')
  const crawlGate = createRenderGate({
    limit: 1,
    queueLimit: 16,
    waitTimeoutMs: 2000,
  })
  let active = 0,
    peak = 0,
    completed = 0
  const dependencies = {
    '../../../constants': { resourceExtension: 'ts' },
    '../../../server.config': { crawl: { routes: {}, speed: 0 } },
    '../../../utils/ConsoleHandler': { error() {}, log() {} },
    '../../../utils/InitEnv': { PROCESS_ENV: { BASE_URL: 'http://local' } },
    '../../../utils/PathHandler': {
      getPagesPath: () => '/tmp',
      getViewsPath: () => '/tmp',
    },
    '../../../utils/WorkerManager': {
      init: () => ({
        getFreePool: async () => ({
          pool: {
            exec: () => {
              active++
              peak = Math.max(peak, active)
              const promise = delay(10).then(() => {
                active--
                completed++
                return { status: 200 }
              })
              promise.timeout = () => promise
              return promise
            },
          },
          terminate() {},
        }),
      }),
    },
    '../../constants': {
      BROWSER_ENGINE: 'lightpanda',
      LIGHTPANDA_FALLBACK_TO_CHROMIUM: false,
    },
    '../BrowserManager': () => ({
      get: async () => ({
        connected: true,
        wsEndpoint: () => 'ws://local',
        emit() {},
      }),
    }),
    '../CacheManager.worker/utils': () => ({ remove: async () => {} }),
    '../CrawlProfile': {
      crawlGate,
      CRAWL_WORKERS: 1,
      RESOURCE_BUDGET: { queueLimit: 16, workerHeapMB: 256 },
      IS_FAST_CRAWL: true,
    },
    '../RenderCleanup': { closeRenderTarget: async () => {} },
    worker_threads: { isMainThread: true },
  }
  const ISR = load(
    'server/src/puppeteer-ssr/utils/ISRHandler.worker/index.ts',
    dependencies
  ).default
  const SSR = load(
    'server/src/puppeteer-ssr/utils/SSRHandler.worker/index.ts',
    dependencies
  ).default
  await Promise.all(
    [ISR, SSR, ISR, SSR].map((handler) => handler({ url: 'http://local/page' }))
  )
  assert.equal(peak, 1)
  assert.equal(active, 0)
  assert.equal(completed, 4)
})

test('rejected render admission releases a raw lease created during a capacity race', async () => {
  for (const kind of ['ISR', 'SSR']) {
    let rawLease = true
    const handler = load(
      `server/src/puppeteer-ssr/utils/${kind}Handler.worker/index.ts`,
      {
        '../../../constants': { resourceExtension: 'ts' },
        '../../../server.config': {},
        '../../../utils/ConsoleHandler': { error() {} },
        '../../../utils/InitEnv': { PROCESS_ENV: {} },
        '../../../utils/PathHandler': {
          getPagesPath: () => '/tmp',
          getViewsPath: () => '/tmp',
        },
        '../../../utils/WorkerManager': { init: () => ({}) },
        '../../constants': {},
        '../BrowserManager': () => undefined,
        '../RenderCleanup': {},
        '../CacheManager.worker/utils': () => ({
          remove: async () => {
            rawLease = false
          },
        }),
        '../CrawlProfile': {
          CRAWL_WORKERS: 1,
          RESOURCE_BUDGET: { queueLimit: 32, workerHeapMB: 256 },
          crawlGate: {
            run: async () => {
              throw new Error('Render queue wait timeout')
            },
          },
        },
        worker_threads: { isMainThread: true },
      }
    ).default
    await handler({ url: 'http://local/new', hasCache: false })
    assert.equal(rawLease, false)
  }
})

test('renderer cleanup retains its page handle when close fails and retries it', async () => {
  for (const kind of ['ISR', 'SSR']) {
    const source = readFileSync(
      path.join(
        root,
        `server/src/puppeteer-ssr/utils/${kind}Handler.worker/worker.ts`
      ),
      'utf8'
    )
    const start = source.indexOf('let activePage:')
    const end = source.indexOf('// NOTE - A stray', start)
    assert.ok(start >= 0 && end > start)
    const module = { exports: {} }
    vm.runInNewContext(
      transform(
        source.slice(start, end) +
          '\nmodule.exports = { set: page => activePage = page, close: closeActivePage };',
        {
          transforms: ['typescript', 'imports'],
        }
      ).code,
      { module }
    )
    let attempts = 0,
      closed = false
    module.exports.set({
      isClosed: () => closed,
      close: async () => {
        if (++attempts === 1) throw new Error('temporary transport failure')
        closed = true
      },
    })
    await assert.rejects(module.exports.close(), /temporary transport failure/)
    await module.exports.close()
    await module.exports.close()
    assert.equal(attempts, 2)
    assert.equal(closed, true)
  }
})

test('expired hot-cache entries do not evict live entries', async () => {
  const { default: MemoryCache } = load('server/src/utils/MemoryCache.ts')
  const cache = MemoryCache({ ttlMs: 1000, max: 2 })
  cache.set('keep', 'live')
  cache.set('expired', 'old', 5)
  await delay(15)
  cache.set('new', 'live')
  assert.equal(cache.get('keep'), 'live')
  assert.equal(cache.get('expired'), undefined)
})

async function upstream(handler, run) {
  const server = createServer(handler)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  try {
    await run(`http://127.0.0.1:${server.address().port}`)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
}

const fetchModule = () =>
  load('server/src/api/utils/FetchManager/utils.ts', {
    '../../../utils/InitEnv': { PROCESS_ENV: {} },
    '../../../utils/PathHandler': { getDataPath: () => '/tmp' },
    '../../../utils/ConsoleHandler': { error() {} },
    '../CacheManager/utils': {},
  })

test('upstream timeout aborts a stalled body and releases its connection', async () => {
  const { fetchData } = fetchModule()
  let closed = false
  await upstream(
    (req, res) => {
      res.writeHead(200)
      res.write('partial')
      res.on('close', () => {
        closed = true
      })
      const timer = setTimeout(() => res.end('done'), 700)
      res.on('close', () => clearTimeout(timer))
    },
    async (url) => {
      const result = await fetchData(url, { timeout: 60 })
      assert.equal(result.status, 408)
      await delay(30)
      assert.equal(closed, true)
    }
  )
})

test('inflight GET deduplication keeps authorization variants separate', async () => {
  const { fetchData: realFetch } = fetchModule()
  const { fetchData } = load('server/src/api/utils/FetchManager/index.ts', {
    './utils': { fetchData: realFetch },
    '../../../utils/WorkerManager': { init: () => ({}) },
    '../../../constants': { resourceExtension: 'ts' },
    '../../../utils/ConsoleHandler': { error() {} },
  })
  await upstream(
    async (req, res) => {
      await delay(30)
      res.end(req.headers.authorization)
    },
    async (url) => {
      const results = await Promise.all(
        ['Alice', 'Bob'].map((name) =>
          fetchData(url, { headers: { authorization: name } })
        )
      )
      assert.deepEqual(
        results.map((result) => result.data),
        ['Alice', 'Bob']
      )
    }
  )
})
