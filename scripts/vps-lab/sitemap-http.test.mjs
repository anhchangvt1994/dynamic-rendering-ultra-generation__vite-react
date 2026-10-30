import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import test from 'node:test'
const require = createRequire(import.meta.url)
require('sucrase/register')
const { extractHtmlLinks, crawlHttp } = require('../../server/sitemap/http.ts')
const host = 'https://public.example'

test('HTML5 extraction matches links/entities/base URL and ignores hidden examples', () => {
  const html = `<!doctype html><base href="/docs/"><a title="a > b" href="one?a=1&amp;x=2">One</a><textarea><a href="/fake">x</a></textarea><template><a href="/template">x</a></template><noscript><a href="/no-script">x</a></noscript><script type="application/ld+json">{"a":"<a href='/json'>x</a>"}</script><a href="https://else.example/out">Other</a>`
  const result = extractHtmlLinks(html, host + '/', { host })
  assert.equal(result.needsRender, false)
  assert.deepEqual(result.data, [host + '/docs/one?a=1&x=2'])
})
test('dynamic HTML requires rendering, metadata is read with HTML5 semantics', () => {
  for (const html of [
    '<script src="/app.js"></script>',
    '<script type="module">x()</script>',
    '<body onload="x()">',
    '<iframe src="/inner"></iframe>',
    '<meta http-equiv="refresh" content="0;url=/next">',
  ])
    assert.equal(
      extractHtmlLinks(html, host + '/', { host }).needsRender,
      true,
      html
    )
  const metadata = extractHtmlLinks(
    '<meta name="ROBOTS" content="noindex,nofollow"><a href="/one">One</a>',
    host + '/',
    { host }
  )
  assert.equal(metadata.noindex, true)
  assert.deepEqual(metadata.data, [])
  assert.equal(
    extractHtmlLinks('this is not HTML', host + '/', { host }).needsRender,
    true
  )
})
test('HTTP crawl validates redirects, body limit and script fallback without a browser', async () => {
  const requests = []
  const server = createServer((req, res) => {
    requests.push(req.url)
    if (req.url === '/redirect') {
      res.writeHead(302, { location: '/final' })
      res.end()
      return
    }
    if (req.url === '/external') {
      res.writeHead(302, { location: 'http://other.example/out' })
      res.end()
      return
    }
    if (req.url === '/big') {
      res.setHeader('content-type', 'text/html')
      res.end('<html>' + 'x'.repeat(3000))
      return
    }
    if (req.url === '/unavailable') {
      res.writeHead(503, { 'retry-after': '2' })
      res.end('busy')
      return
    }
    res.setHeader('content-type', 'text/html')
    if (req.url === '/dynamic') res.end('<script src="/app.js"></script>')
    else res.end('<html><a href="./next?a=1&amp;b=2">Next</a></html>')
  })
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const origin = `http://127.0.0.1:${server.address().port}`
    const options = {
      host,
      crawlOrigin: origin,
      timeoutMs: 2000,
      maxResponseBytes: 1024,
    }
    const result = await crawlHttp(host + '/redirect', options)
    assert.equal(result.url, host + '/final')
    assert.deepEqual(result.data, [host + '/next?a=1&b=2'])
    assert.equal(
      (await crawlHttp(host + '/dynamic', options)).needsRender,
      true
    )
    assert.equal((await crawlHttp(host + '/external', options)).status, 400)
    const unavailable = await crawlHttp(host + '/unavailable', options)
    assert.equal(unavailable.status, 503)
    assert.equal(unavailable.retryAfterMs, 2000)
    await assert.rejects(crawlHttp(host + '/big', options), /body limit/)
    assert.ok(!requests.includes('/app.js'))
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})

test('page pool bounds parallel rendering and releases a lane after failure', async () => {
  const { createPagePool } = require('../../server/sitemap/page-pool.ts')
  const pool = createPagePool(2)
  let active = 0,
    peak = 0
  const jobs = Array.from({ length: 6 }, (_, i) =>
    pool.run(async () => {
      peak = Math.max(peak, ++active)
      try {
        await new Promise((resolve) => setTimeout(resolve, 10))
        if (i === 1) throw Error('failed')
        return i
      } finally {
        active--
      }
    })
  )
  const results = await Promise.allSettled(jobs)
  assert.equal(peak, 2)
  assert.equal(pool.peak, 2)
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 5)
})

test('existing sitemap discovery keeps known URLs as seeds for revalidation', async () => {
  const fs = await import('node:fs'),
    os = await import('node:os'),
    path = await import('node:path')
  const { readSitemapSeeds } = require('../../server/sitemap/seeds.ts')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-seeds-'))
  try {
    fs.mkdirSync(path.join(dir, 'sitemaps'))
    fs.writeFileSync(
      path.join(dir, 'sitemap.xml'),
      `<sitemapindex><sitemap><loc>${host}/sitemap.xml?file=blog-sitemap.xml</loc></sitemap></sitemapindex>`
    )
    fs.writeFileSync(
      path.join(dir, 'sitemaps/blog-sitemap.xml'),
      `<urlset><url><loc>${host}/blogs/known?a=1&amp;b=2</loc></url><url><loc>https://other.example/out</loc></url></urlset>`
    )
    assert.deepEqual(
      readSitemapSeeds(path.join(dir, 'sitemap.xml'), host, 10),
      [host + '/blogs/known?a=1&b=2']
    )
    assert.deepEqual(
      readSitemapSeeds(path.join(dir, 'missing.xml'), host, 10),
      []
    )
    fs.writeFileSync(
      path.join(dir, 'sitemap.xml'),
      `<sitemapindex><sitemap><loc>${host}/sitemap.xml?file=..%2Fenv</loc></sitemap></sitemapindex>`
    )
    assert.throws(
      () => readSitemapSeeds(path.join(dir, 'sitemap.xml'), host, 10),
      /Invalid sitemap/
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('HTTP redirects preserve trailing slash for transport and relative base resolution', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/docs/item') {
      res.writeHead(301, { location: '/docs/item/' })
      res.end()
      return
    }
    res.setHeader('content-type', 'text/html')
    res.end('<a href="next">Next</a>')
  })
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const r = await crawlHttp(host + '/docs/item', {
      host,
      crawlOrigin: `http://127.0.0.1:${server.address().port}`,
      timeoutMs: 2000,
    })
    assert.equal(r.status, 200)
    assert.deepEqual(r.data, [host + '/docs/item/next'])
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
