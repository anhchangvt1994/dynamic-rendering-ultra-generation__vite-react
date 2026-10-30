import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(import.meta.url)
require('sucrase/register')
const {
  normalizeCrawlUrl,
  getSitemapOptions,
} = require('../../server/sitemap/config.ts')
const { crawlSite } = require('../../server/sitemap/generator.ts')
const { SitemapWriter } = require('../../server/sitemap/writer.ts')
const { parseRetryAfterMs } = require('../../server/sitemap/retry-after.ts')
const host = 'https://example.com'

test('URL normalization uses exact origin, resolves relatives, removes fragments and excludes assets', () => {
  for (const [input, expected] of [
    ['./two#part', `${host}/blogs/two`],
    ['//example.com/pokemon', `${host}/pokemon`],
    ['/blogs/?q=a&x=b#tag', `${host}/blogs?q=a&x=b`],
    ['https://example.com.evil/a', undefined],
    ['//evil.com/a', undefined],
    ['https://user:pass@example.com/a', undefined],
    ['mailto:a@example.com', undefined],
    ['/images/a.png', undefined],
    ['/sitemap.xml', undefined],
    ['/sitemaps/one.xml', undefined],
    ['', undefined],
    ['#part', `${host}/blogs/one`],
  ])
    assert.equal(
      normalizeCrawlUrl(input, `${host}/blogs/one`, host),
      expected,
      input
    )
})

test('concurrency override stays RAM bounded and invalid CLI settings fail', () => {
  assert.equal(
    getSitemapOptions(
      { HOST: host, SITEMAP_CONCURRENCY: '32' },
      { cpuCount: 2, memoryMB: 1024 }
    ).concurrency,
    1
  )
  assert.equal(
    getSitemapOptions({ HOST: host }, { cpuCount: 2, memoryMB: 4096 })
      .concurrency,
    4
  )
  assert.equal(
    getSitemapOptions({ HOST: host }, { cpuCount: 8, memoryMB: 8192 })
      .concurrency,
    8
  )
  assert.throws(
    () => getSitemapOptions({ HOST: host, SITEMAP_TIMEOUT_MS: 'oops' }),
    /SITEMAP_TIMEOUT_MS/
  )
  assert.throws(() => getSitemapOptions({ HOST: 'bad' }), /HOST/)
})

test('Retry-After is parsed and bounded for sitemap retry scheduling', () => {
  assert.equal(parseRetryAfterMs('10'), 10000)
  assert.equal(parseRetryAfterMs('0.5'), 500)
  assert.equal(parseRetryAfterMs('invalid'), 0)
  assert.equal(parseRetryAfterMs('120'), 60000)
})

test('bounded queue handles cycles, relative links, duplicate redirects and skips bad/noindex pages', async () => {
  const graph = {
    [`${host}/`]: {
      data: [
        '/blogs',
        '/pokemon',
        '/blogs#x',
        '/private',
        '/missing',
        '/redirect',
        'https://example.com.evil/',
      ],
    },
    [`${host}/blogs`]: { data: ['./pokemon', '/'], url: `${host}/blogs` },
    [`${host}/pokemon`]: { data: [] },
    [`${host}/private`]: { data: [], noindex: true },
    [`${host}/missing`]: { data: [], status: 404 },
    [`${host}/redirect`]: { data: [], url: `${host}/blogs` },
  }
  const calls = [],
    writes = []
  let active = 0,
    peak = 0
  const result = await crawlSite({
    host,
    concurrency: 2,
    maxPages: 20,
    retries: 1,
    crawl: async (url) => {
      calls.push(url)
      peak = Math.max(peak, ++active)
      await new Promise((resolve) => setImmediate(resolve))
      active--
      return { status: 200, url, ...graph[url] }
    },
    onPage: (url) => writes.push(url),
  })
  assert.equal(peak, 2)
  assert.equal(new Set(calls).size, calls.length)
  assert.deepEqual(writes.sort(), [
    `${host}/`,
    `${host}/blogs`,
    `${host}/pokemon`,
  ])
  assert.equal(result.saved, 3)
  assert.equal(result.skipped, 2)
})

test('transient errors are retried, permanent failures and URL limits abort incomplete output', async () => {
  let calls = 0
  const result = await crawlSite({
    host,
    concurrency: 1,
    maxPages: 5,
    retries: 1,
    crawl: async (url) => ({
      status: ++calls === 1 ? 503 : 200,
      url,
      data: [],
    }),
    onPage: () => {},
  })
  assert.equal(result.retries, 1)
  assert.equal(calls, 2)
  await assert.rejects(
    crawlSite({
      host,
      concurrency: 1,
      maxPages: 5,
      retries: 0,
      crawl: async () => ({ status: 503, data: [] }),
      onPage: () => {},
    }),
    /503/
  )
  await assert.rejects(
    crawlSite({
      host,
      concurrency: 1,
      maxPages: 1,
      retries: 0,
      crawl: async (url) => ({ status: 200, url, data: ['/blogs'] }),
      onPage: () => {},
    }),
    /maxPages/
  )
})

test('503 retry waits for Retry-After before repeating the request', async () => {
  const started = Date.now()
  let calls = 0
  const result = await crawlSite({
    host,
    concurrency: 1,
    maxPages: 5,
    retries: 1,
    crawl: async (url) => ({
      status: ++calls === 1 ? 503 : 200,
      retryAfterMs: 40,
      url,
      data: [],
    }),
    onPage: () => {},
  })
  assert.equal(result.retries, 1)
  assert.equal(calls, 2)
  assert.ok(Date.now() - started >= 35)
})

test('writer publishes a real index and complete escaped grouped chunks; aborted run preserves old files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-writer-'))
  try {
    fs.writeFileSync(path.join(dir, 'sitemap.xml'), 'old index')
    const writer = new SitemapWriter({ host, outputDir: dir, maxUrls: 2 })
    writer.add(`${host}/`)
    writer.add(`${host}/blogs/a?a=1&b=2`)
    writer.add(`${host}/blogs/b`)
    writer.add(`${host}/blogs/c`)
    writer.add(`${host}/pokemon/pikachu`)
    writer.add(`${host}/docs/one`)
    assert.equal(
      fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8'),
      'old index'
    )
    const result = writer.finish()
    assert.equal(result.urls, 6)
    assert.equal(result.files.length, 5)
    const index = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8')
    assert.match(index, /<sitemapindex /)
    assert.ok(
      index.includes('https://example.com/sitemap.xml?file=blog-sitemap.xml')
    )
    assert.equal((index.match(/<sitemap>/g) || []).length, 5)
    assert.doesNotMatch(index, /<url>/)
    assert.match(
      fs.readFileSync(path.join(dir, 'sitemaps/blog-sitemap.xml'), 'utf8'),
      /a=1&amp;b=2/
    )
    assert.match(
      fs.readFileSync(path.join(dir, 'sitemaps/blog-sitemap-2.xml'), 'utf8'),
      /\/blogs\/c/
    )
    assert.ok(fs.existsSync(path.join(dir, 'sitemaps/docs-sitemap.xml')))
    const abort = new SitemapWriter({ host, outputDir: dir })
    abort.add(`${host}/only`)
    abort.abort()
    assert.equal(fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8'), index)
    assert.throws(() => writer.add(`${host}/late`), /finished/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('writer enforces byte limits, path containment and single-writer lock', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-limits-'))
  try {
    const writer = new SitemapWriter({ host, outputDir: dir, maxBytes: 400 })
    assert.throws(
      () => new SitemapWriter({ host, outputDir: dir }),
      /already running/
    )
    writer.add(`${host}/blogs/${'a'.repeat(100)}`)
    writer.add(`${host}/blogs/${'b'.repeat(100)}`)
    assert.throws(
      () => writer.add(`${host}/blogs/${'c'.repeat(1000)}`),
      /byte limit/
    )
    assert.throws(() => writer.add('https://evil.com/a'), /origin/)
    writer.add(`${host}/%2F%2E%2E/x`)
    assert.equal(writer.finish().urls, 3)
    assert.ok(fs.existsSync(path.join(dir, 'sitemaps/blog-sitemap-2.xml')))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('concurrent redirect aliases publish a final URL once even when saving is asynchronous', async () => {
  const writes = []
  await crawlSite({
    host,
    concurrency: 2,
    maxPages: 10,
    retries: 0,
    crawl: async (url) =>
      url === host + '/'
        ? { status: 200, url, data: ['/a', '/b'] }
        : { status: 200, url: host + '/final', data: [] },
    onPage: async (url) => {
      writes.push(url)
      await new Promise((resolve) => setImmediate(resolve))
    },
  })
  assert.deepEqual(writes, [host + '/', host + '/final'])
})

test('root-scoped sitemap query resolves only safe local files and retains legacy paths', () => {
  const { resolveSitemapFile } = require('../../server/src/sitemap/path.ts')
  assert.equal(
    resolveSitemapFile('/srv/site', '/sitemap.xml'),
    '/srv/site/sitemap.xml'
  )
  assert.equal(
    resolveSitemapFile('/srv/site', '/sitemap.xml', 'file=blog-sitemap.xml'),
    '/srv/site/sitemaps/blog-sitemap.xml'
  )
  assert.equal(
    resolveSitemapFile('/srv/site', '/sitemaps/blog-sitemap.xml'),
    '/srv/site/sitemaps/blog-sitemap.xml'
  )
  for (const query of [
    'file=../env',
    'file=%2Fetc%2Fpasswd',
    'file=a.xml&file=b.xml',
    'file=',
    'file=%2e%2e%2fa.xml',
  ])
    assert.throws(
      () => resolveSitemapFile('/srv/site', '/sitemap.xml', query),
      /Invalid sitemap/
    )
})

test('long route names remain publishable without oversized filenames or reserved-name collisions', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-long-route-'))
  const writer = new SitemapWriter({ host, outputDir: dir })
  try {
    writer.add(host + '/' + 'x'.repeat(250) + '/detail')
    writer.add(host + '/pages/one')
    writer.add(host + '/')
    const result = writer.finish()
    assert.equal(result.files.length, 3)
    assert.ok(result.files.every((file) => Buffer.byteLength(file) < 240))
    const content = result.files
      .map((file) => fs.readFileSync(path.join(dir, 'sitemaps', file), 'utf8'))
      .join('')
    assert.ok(content.includes('/' + 'x'.repeat(250) + '/detail'))
  } finally {
    writer.abort()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('crawl origin maps only allowed origins, keeps queries and validates origin configuration', () => {
  const { getCrawlUrl } = require('../../server/sitemap/config.ts')
  const options = getSitemapOptions({
    HOST: 'https://public.example',
    SITEMAP_CRAWL_ORIGIN: 'http://localhost:8080',
  })
  assert.equal(options.host, 'https://public.example')
  assert.equal(options.crawlOrigin, 'http://localhost:8080')
  assert.equal(getSitemapOptions({ HOST: host }).crawlOrigin, host)
  assert.throws(
    () =>
      getSitemapOptions({
        HOST: host,
        SITEMAP_CRAWL_ORIGIN: 'http://localhost:8080/path',
      }),
    /SITEMAP_CRAWL_ORIGIN/
  )
  assert.equal(
    getCrawlUrl(
      'https://public.example/blogs?q=one&x=2',
      'http://localhost:8080'
    ),
    'http://localhost:8080/blogs?q=one&x=2'
  )
  for (const [input, expected] of [
    [
      'http://localhost:8080/blogs/?q=one&x=2#part',
      'https://public.example/blogs?q=one&x=2',
    ],
    ['https://public.example/pokemon', 'https://public.example/pokemon'],
    ['http://localhost:8081/blogs', undefined],
    ['http://user:pass@localhost:8080/blogs', undefined],
    ['https://public.example.evil/blogs', undefined],
    ['http://localhost:8080/images/x.png', undefined],
  ])
    assert.equal(
      normalizeCrawlUrl(
        input,
        'http://localhost:8080/',
        options.host,
        options.crawlOrigin
      ),
      expected,
      input
    )
})

test('configured internal-origin seeds map to canonical URLs and stay deduplicated', async () => {
  const calls = []
  const result = await crawlSite({
    host,
    crawlOrigin: 'http://localhost:8080',
    concurrency: 1,
    maxPages: 10,
    retries: 0,
    seeds: [
      'http://localhost:8080/unlinked',
      'http://localhost:8080/unlinked#part',
      'http://localhost:8081/outside',
    ],
    crawl: async (url) => {
      calls.push(url)
      return { status: 200, url, data: [] }
    },
    onPage: () => {},
  })
  assert.deepEqual(calls, [
    'https://example.com/',
    'https://example.com/unlinked',
  ])
  assert.equal(result.saved, 2)
})
