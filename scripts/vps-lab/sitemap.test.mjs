import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import puppeteer from 'puppeteer-core'
import workerpool from 'workerpool'

const require = createRequire(import.meta.url)
require('sucrase/register')

test('crawler discovers same-origin links rendered after DOMContentLoaded', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/data') {
      setTimeout(() => res.end('ready'), 180)
      return
    }
    res.setHeader('content-type', 'text/html')
    res.end(`<html><body><script>fetch('/data').then(() => {
      document.body.insertAdjacentHTML('beforeend', '<a href="/blogs">Blogs</a><a href="./pokemon/pikachu">Pikachu</a>')
    })</script></body></html>`)
  })
  let browser, pool
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const host = `http://127.0.0.1:${server.address().port}`
    browser = await puppeteer.launch({
      executablePath:
        process.env.CHROME_EXECUTABLE ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox'],
    })
    pool = workerpool.pool(path.resolve('server/sitemap/worker.ts'), {
      minWorkers: 0,
      maxWorkers: 1,
      workerThreadOpts: {
        execArgv: ['-r', require.resolve('sucrase/register')],
      },
    })
    const result = await pool.exec('crawlHandler', [
      { url: host, host, wsEndpoint: browser.wsEndpoint(), engine: 'chromium' },
    ])
    assert.equal(result.status, 200)
    assert.deepEqual(result.data.sort(), [
      `${host}/blogs`,
      `${host}/pokemon/pikachu`,
    ])
  } finally {
    await pool?.terminate(true)
    await browser?.close()
    await new Promise((resolve) => server.close(resolve))
  }
})

test('CLI publishes all rendered sections, resolves entities/base URLs and keeps output on crawl failure', async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const { spawn } = await import('node:child_process')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgen-cli-'))
  let fail = false,
    browser
  const server = createServer((req, res) => {
    if (req.url === '/api') {
      setTimeout(() => res.end('ok'), 250)
      return
    }
    if (fail) {
      res.writeHead(503)
      res.end('fail')
      return
    }
    if (req.url === '/missing') {
      res.writeHead(404)
      res.end('missing')
      return
    }
    if (req.url === '/old') {
      res.writeHead(302, { location: '/blogs/post' })
      res.end()
      return
    }
    res.setHeader('content-type', 'text/html')
    if (req.url === '/')
      res.end(`<html><body><a href="/">Home</a><script>fetch('/api').then(()=>{
      for(const href of ['/blogs/post','/pokemon/pikachu','/docs/a','/private','/missing','/old','/docs/query?a=1&b=2']) {
        const a=document.createElement('a');a.href=href;a.textContent=href;document.body.append(a)
      }
    })</script></body></html>`)
    else if (req.url === '/docs/a')
      res.end(
        `<base href="/docs/"><a title="x > y" href="./b">B</a><a href="https://example.com.evil/fake">Other</a>`
      )
    else if (req.url === '/private')
      res.end(`<meta name="robots" content="noindex"><a href="/docs/c">C</a>`)
    else res.end('<a href="/">Home</a>')
  })
  const run = (args) =>
    new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ['config/scripts/start-sitemap-generator.mjs', ...args],
        { env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] }
      )
      let output = ''
      child.stdout.on('data', (chunk) => {
        output += chunk
      })
      child.stderr.on('data', (chunk) => {
        output += chunk
      })
      child.on('error', reject)
      child.on('close', (code) => resolve({ code, output }))
    })
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const host = `http://127.0.0.1:${server.address().port}`
    browser = await puppeteer.launch({
      executablePath:
        process.env.CHROME_EXECUTABLE ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox'],
    })
    const args = [
      '--host',
      host,
      '--crawl-origin',
      host,
      '--output-dir',
      dir,
      '--seed-sitemap',
      path.join(dir, 'sitemap.xml'),
      '--browser-engine',
      'chromium',
      '--browser-ws-endpoint',
      browser.wsEndpoint(),
      '--concurrency',
      '2',
      '--retries',
      '0',
      '--timeout-ms',
      '5000',
    ]
    // Reproduce a deployed index whose referenced group files/directories
    // were removed. The CLI must create them itself and complete generation.
    fs.writeFileSync(
      path.join(dir, 'sitemap.xml'),
      `<sitemapindex><sitemap><loc>${host}/sitemap.xml?file=pokemon-sitemap.xml</loc></sitemap></sitemapindex>`
    )
    const first = await run(args)
    assert.equal(first.code, 0, first.output)
    const index = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8')
    const xmls = fs
      .readdirSync(path.join(dir, 'sitemaps'))
      .map((name) => fs.readFileSync(path.join(dir, 'sitemaps', name), 'utf8'))
    const seen = xmls
      .flatMap((xml) =>
        [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) =>
          match[1].replaceAll('&amp;', '&')
        )
      )
      .sort()
    assert.deepEqual(
      seen,
      [
        host + '/',
        host + '/blogs/post',
        host + '/pokemon/pikachu',
        host + '/docs/a',
        host + '/docs/b',
        host + '/docs/c',
        host + '/docs/query?a=1&b=2',
      ].sort()
    )
    assert.equal(xmls.length, 4)
    assert.match(index, /<sitemapindex /)
    fs.rmSync(path.join(dir, 'sitemaps'), { recursive: true })
    const regenerated = await run(args)
    assert.equal(regenerated.code, 0, regenerated.output)
    assert.doesNotMatch(regenerated.output, /SITEMAP ERROR|ENOENT/)
    assert.equal(fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8'), index)
    assert.equal(fs.readdirSync(path.join(dir, 'sitemaps')).length, 4)
    assert.equal(
      (await browser.pages()).length,
      1,
      'CLI must close its own tabs without closing the supplied browser'
    )
    fail = true
    const failed = await run(args)
    assert.equal(failed.code, 1)
    assert.match(failed.output, /503/)
    assert.equal(fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8'), index)
    assert.ok(!fs.existsSync(path.join(dir, '.sgen.lock')))
    fail = false
    const limit = await run([...args, '--max-pages', '1'])
    assert.equal(limit.code, 1)
    assert.match(limit.output, /maxPages/)
    assert.equal(fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8'), index)
    const invalid = await run(['--nonsense', '1'])
    assert.equal(invalid.code, 1)
    assert.match(invalid.output, /Unknown option/)
  } finally {
    await browser?.close()
    await new Promise((resolve) => server.close(resolve))
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('SIGTERM cleans owned tabs, releases writer lock and preserves published output', async () => {
  const fs = await import('node:fs'),
    os = await import('node:os')
  const { spawn } = await import('node:child_process')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgen-signal-'))
  fs.writeFileSync(path.join(dir, 'sitemap.xml'), 'old index')
  let browser, child, ready
  const requested = new Promise((resolve) => {
    ready = resolve
  })
  const server = createServer((req, res) => {
    if (req.url === '/blocked') {
      ready()
      return
    }
    res.setHeader('content-type', 'text/html')
    res.end(`<script>fetch('/blocked')</script>`)
  })
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    browser = await puppeteer.launch({
      executablePath:
        process.env.CHROME_EXECUTABLE ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox'],
    })
    child = spawn(
      process.execPath,
      [
        'config/scripts/start-sitemap-generator.mjs',
        '--host',
        `http://127.0.0.1:${server.address().port}`,
        '--crawl-origin',
        `http://127.0.0.1:${server.address().port}`,
        '--output-dir',
        dir,
        '--concurrency',
        '1',
        '--browser-ws-endpoint',
        browser.wsEndpoint(),
        '--browser-engine',
        'chromium',
      ],
      { stdio: 'ignore' }
    )
    const exited = new Promise((resolve) => child.once('exit', resolve))
    await Promise.race([
      requested,
      new Promise((_, reject) =>
        setTimeout(() => reject(Error('crawler did not start')), 5000).unref()
      ),
    ])
    child.kill('SIGTERM')
    await exited
    assert.equal((await browser.pages()).length, 1)
    assert.ok(!fs.existsSync(path.join(dir, '.sgen.lock')))
    assert.equal(
      fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8'),
      'old index'
    )
  } finally {
    child?.kill('SIGKILL')
    await browser?.close()
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI crawls a separate local origin while publishing canonical public URLs', async () => {
  const fs = await import('node:fs'),
    os = await import('node:os')
  const { spawn } = await import('node:child_process')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgen-origin-'))
  const canonical = 'https://public.example'
  const server = createServer((req, res) => {
    res.setHeader('content-type', 'text/html')
    if (req.url === '/')
      res.end(
        `<a href="/blogs/one">Blog</a><a href="https://public.example/pokemon/pikachu">Pokemon</a><a href="https://other.example/out">Other</a>`
      )
    else res.end('<a href="/">Home</a>')
  })
  let browser
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    browser = await puppeteer.launch({
      executablePath:
        process.env.CHROME_EXECUTABLE ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox'],
    })
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          'config/scripts/start-sitemap-generator.mjs',
          '--host',
          canonical,
          '--crawl-origin',
          `http://127.0.0.1:${server.address().port}`,
          '--output-dir',
          dir,
          '--browser-engine',
          'chromium',
          '--browser-ws-endpoint',
          browser.wsEndpoint(),
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      )
      let output = ''
      child.stdout.on('data', (data) => (output += data))
      child.stderr.on('data', (data) => (output += data))
      child.on('error', reject)
      child.on('close', (code) => resolve({ code, output }))
    })
    assert.equal(result.code, 0, result.output)
    const index = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8')
    assert.ok(
      index.includes('https://public.example/sitemap.xml?file=blog-sitemap.xml')
    )
    const locs = fs
      .readdirSync(path.join(dir, 'sitemaps'))
      .flatMap((file) =>
        [
          ...fs
            .readFileSync(path.join(dir, 'sitemaps', file), 'utf8')
            .matchAll(/<loc>([^<]+)<\/loc>/g),
        ].map((m) => m[1])
      )
      .sort()
    assert.deepEqual(locs, [
      'https://public.example/',
      'https://public.example/blogs/one',
      'https://public.example/pokemon/pikachu',
    ])
  } finally {
    await browser?.close()
    await new Promise((resolve) => server.close(resolve))
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('hybrid mode overlaps HTTP pages and renders delayed JavaScript pages without losing URLs', async () => {
  const fs = await import('node:fs'),
    os = await import('node:os'),
    { spawn } = await import('node:child_process')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgen-hybrid-'))
  let activeHttp = 0,
    peakHttp = 0,
    browser
  const paths = Array.from({ length: 6 }, (_, i) => `/static/${i}`)
  const server = createServer((req, res) => {
    if (req.url === '/data') {
      setTimeout(() => res.end('ok'), 200)
      return
    }
    res.setHeader('content-type', 'text/html')
    if (req.url === '/') {
      res.end(
        paths.map((p) => `<a href="${p}">Page</a>`).join('') +
          '<a href="/dynamic/page">Dynamic</a>'
      )
      return
    }
    if (req.url === '/dynamic/page') {
      res.end(
        `<script>fetch('/data').then(()=>document.body.innerHTML='<a href="/deep/late">Late</a>')</script>`
      )
      return
    }
    if (req.headers['user-agent']?.includes('Googlebot')) {
      peakHttp = Math.max(peakHttp, ++activeHttp)
      setTimeout(() => {
        activeHttp--
        res.end('<a href="/">Home</a>')
      }, 80)
      return
    }
    res.end('<a href="/">Home</a>')
  })
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const host = `http://127.0.0.1:${server.address().port}`
    browser = await puppeteer.launch({
      executablePath:
        process.env.CHROME_EXECUTABLE ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox'],
    })
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          'config/scripts/start-sitemap-generator.mjs',
          '--host',
          host,
          '--crawl-origin',
          host,
          '--output-dir',
          dir,
          '--mode',
          'auto',
          '--concurrency',
          '4',
          '--render-concurrency',
          '2',
          '--browser-engine',
          'chromium',
          '--browser-ws-endpoint',
          browser.wsEndpoint(),
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      )
      let output = ''
      child.stdout.on('data', (d) => (output += d))
      child.stderr.on('data', (d) => (output += d))
      child.on('error', reject)
      child.on('close', (code) => resolve({ code, output }))
    })
    assert.equal(result.code, 0, result.output)
    const stats = JSON.parse(result.output.match(/\[SITEMAP RESULT\] (.+)/)[1])
    assert.equal(stats.saved, 9)
    assert.ok(stats.httpPages >= 7)
    assert.equal(stats.renderedPages, 2)
    assert.ok(peakHttp >= 2)
    assert.ok(stats.peakRender <= 2)
    assert.ok(stats.peakHttp <= 4)
    const locs = fs
      .readdirSync(path.join(dir, 'sitemaps'))
      .flatMap((file) =>
        [
          ...fs
            .readFileSync(path.join(dir, 'sitemaps', file), 'utf8')
            .matchAll(/<loc>([^<]*)<\/loc>/g),
        ].map((m) => m[1])
      )
      .sort()
    assert.deepEqual(
      locs,
      [
        host + '/',
        ...paths.map((p) => host + p),
        host + '/dynamic/page',
        host + '/deep/late',
      ].sort()
    )
  } finally {
    await browser?.close()
    await new Promise((resolve) => server.close(resolve))
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
