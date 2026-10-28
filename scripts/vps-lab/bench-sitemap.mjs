// Run in the isolated VPS container; see server/sitemap/README.md.
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'node:http'
import { spawn, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { performance } from 'node:perf_hooks'
const require = createRequire(import.meta.url)
const [
  label = 'after',
  mode = 'static',
  runsArg = '3',
  sourceArg = 'server/sitemap',
] = process.argv.slice(2)
const runs = Number(runsArg)
if (
  !Number.isInteger(runs) ||
  runs < 1 ||
  !['static', 'delayed', 'writer'].includes(mode)
)
  throw Error(
    'Usage: node bench-sitemap.mjs <label> <static|delayed|writer> <runs> <sitemap-source-directory>'
  )
const root = process.cwd()
const source = path.resolve(sourceArg)
const reportDir = path.join(root, '.vps-lab/sitemap-benchmark')
fs.mkdirSync(reportDir, { recursive: true })
const work = fs.mkdtempSync(path.join(root, '.vps-lab/sitemap-run-'))
const host = 'http://127.0.0.1:18081'
const paths = [
  '/',
  ...['blogs', 'pokemon', 'docs'].flatMap((group) =>
    Array.from({ length: 8 }, (_, i) => `/${group}/item-${i}`)
  ),
]
const server = createServer((req, res) => {
  if (req.url === '/data') {
    setTimeout(() => res.end('ready'), 800)
    return
  }
  if (!paths.includes(req.url)) {
    res.writeHead(404)
    res.end('missing')
    return
  }
  res.setHeader('content-type', 'text/html')
  const targets = req.url === '/' ? paths.slice(1) : ['/']
  const links =
    mode === 'delayed' && req.url === '/'
      ? `<script>fetch('/data').then(()=>{for(const href of ${JSON.stringify(targets)}){const a=document.createElement('a');a.href=href;a.textContent=href;document.body.appendChild(a)}})</script>`
      : targets.map((target) => `<a href="${target}">${target}</a>`).join('')
  res.end(
    `<html><head><title>Fixture</title></head><body>${links}</body></html>`
  )
})
const read = (file) => {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}
const stat = () => {
  const memory = read('/sys/fs/cgroup/memory.stat')
  const field = (key) =>
    Number(new RegExp(`^${key} (\\d+)$`, 'm').exec(memory)?.[1] || 0)
  return {
    memoryBytes: Number(read('/sys/fs/cgroup/memory.current')) || 0,
    anonBytes: field('anon') + field('shmem'),
    cpuUs: Number(
      /^usage_usec (\d+)$/m.exec(read('/sys/fs/cgroup/cpu.stat'))?.[1] || 0
    ),
    oom: Number(
      /^oom_kill (\d+)$/m.exec(read('/sys/fs/cgroup/memory.events'))?.[1] || 0
    ),
  }
}
const results = []
try {
  if (mode !== 'writer')
    await new Promise((resolve) => server.listen(18081, '127.0.0.1', resolve))
  // A private server tree gives both versions fresh output and environment.
  // Never edit the application's published sitemap or .env files.
  const privateServer = path.join(work, 'server')
  fs.mkdirSync(privateServer)
  fs.writeFileSync(
    path.join(privateServer, 'package.json'),
    JSON.stringify({ type: 'commonjs' })
  )
  fs.cpSync(path.join(root, 'server/src'), path.join(privateServer, 'src'), {
    recursive: true,
    filter: (file) =>
      !file.includes('/.cache') &&
      !file.includes('/Cache.worker/pages') &&
      !file.includes('/Cache.worker/views') &&
      !file.includes('/user_data'),
  })
  fs.writeFileSync(path.join(privateServer, '.env'), 'PLATFORM=linux\n')
  fs.writeFileSync(
    path.join(privateServer, '.env.production'),
    `HOST=${host}\nBROWSER_ENGINE=lightpanda\nLIGHTPANDA_PATH=${path.join(root, 'server/resources/lightpanda/lightpanda')}\n`
  )
  for (let run = 0; run < runs; run++) {
    const sitemap = path.join(privateServer, 'sitemap')
    fs.rmSync(sitemap, { recursive: true, force: true })
    fs.cpSync(source, sitemap, {
      recursive: true,
      filter: (file) =>
        !file.endsWith('.xml') &&
        !file.includes('/sitemaps') &&
        !file.endsWith('.sgen.lock') &&
        !file.includes('/.sgen-'),
    })
    const before = stat()
    let peak = before.memoryBytes,
      peakAnon = before.anonBytes
    const sampler = setInterval(() => {
      const s = stat()
      peak = Math.max(peak, s.memoryBytes)
      peakAnon = Math.max(peakAnon, s.anonBytes)
    }, 50)
    let stdout = '',
      stderr = '',
      code,
      elapsedMs
    const started = performance.now()
    if (mode === 'writer') {
      const runner = path.join(work, 'writer.cjs')
      const modern = fs.existsSync(path.join(sitemap, 'writer.ts'))
      fs.writeFileSync(
        runner,
        `require(${JSON.stringify(require.resolve('sucrase/register'))});
        const fs=require('fs'),path=require('path');
        const urls=Array.from({length:10000},(_,i)=>'${host}/blogs/'+i+'?a=1&b=2');
        ${modern ? `const {SitemapWriter}=require(${JSON.stringify(path.join(sitemap, 'writer.ts'))});const w=new SitemapWriter({host:'${host}',outputDir:${JSON.stringify(sitemap)}}); for(const url of urls) w.add(url); w.finish();` : `const {saveUrlToSitemap}=require(${JSON.stringify(path.join(sitemap, 'utils/utils.ts'))});for(const loc of urls)saveUrlToSitemap({file:${JSON.stringify(path.join(sitemap, 'writer.xml'))},loc});`}
      `
      )
      code = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [runner], {
          cwd: root,
          env: { ...process.env, ENV: 'production' },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        child.stdout.on('data', (b) => {
          stdout += b
        })
        child.stderr.on('data', (b) => {
          stderr += b
        })
        child.on('error', reject)
        child.on('exit', resolve)
      })
    } else {
      code = await new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            '-r',
            require.resolve('sucrase/register'),
            path.join(sitemap, 'index.ts'),
          ],
          {
            cwd: root,
            env: {
              ...process.env,
              ENV: 'production',
              SITEMAP_OUTPUT_DIR: sitemap,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        )
        const deadline = setTimeout(() => child.kill('SIGKILL'), 180000)
        child.stdout.on('data', (b) => {
          stdout += b
        })
        child.stderr.on('data', (b) => {
          stderr += b
        })
        child.on('error', reject)
        child.on('exit', (value) => {
          clearTimeout(deadline)
          resolve(value)
        })
      })
    }
    elapsedMs = performance.now() - started
    clearInterval(sampler)
    const after = stat()
    fs.writeFileSync(
      path.join(reportDir, `${label}-${mode}-${run}.log`),
      stdout + '\n' + stderr
    )
    const files = []
    const scan = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const name = path.join(dir, entry.name)
        if (entry.isDirectory() && entry.name === 'sitemaps') scan(name)
        else if (entry.isFile() && entry.name.endsWith('.xml')) files.push(name)
      }
    }
    scan(sitemap)
    const locs = new Set(
      files
        .flatMap((file) =>
          [...read(file).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
            m[1].replaceAll('&amp;', '&')
          )
        )
        .filter((url) => !url.endsWith('.xml'))
    )
    const expectedUrls =
      mode === 'writer'
        ? Array.from({ length: 10000 }, (_, i) => `${host}/blogs/${i}?a=1&b=2`)
        : paths.map((item) => host + item)
    const key = (value) => {
      const u = new URL(value)
      return u.origin + (u.pathname.replace(/\/+$/, '') || '/') + u.search
    }
    const actualKeys = new Set([...locs].map(key))
    const missing = expectedUrls.filter((url) => !actualKeys.has(key(url)))
    const expectedKeys = new Set(expectedUrls.map(key))
    const unexpected = [...locs].filter((url) => !expectedKeys.has(key(url)))
    const expected = expectedUrls.length
    const xmlCheck = JSON.parse(
      execFileSync(
        'python3',
        [
          '-c',
          "import json,sys,xml.etree.ElementTree as E\nerrors=[]\nfor f in sys.argv[1:]:\n try: E.parse(f)\n except E.ParseError as e: errors.append(str(e))\nprint(json.dumps({'xmlValid':not errors,'xmlErrors':errors}))",
          ...files,
        ],
        { encoding: 'utf8' }
      )
    )
    const outputPath = path.join(reportDir, `${label}-${mode}-${run}-xml`)
    fs.mkdirSync(outputPath, { recursive: true })
    for (const file of files)
      fs.copyFileSync(file, path.join(outputPath, path.basename(file)))
    const result = {
      run: run + 1,
      code,
      elapsedMs: Math.round(elapsedMs),
      urls: locs.size,
      expected,
      files: files.length,
      coverageComplete: !missing.length && !unexpected.length,
      missing,
      unexpected,
      ...xmlCheck,
      complete: !missing.length && !unexpected.length && xmlCheck.xmlValid,
      cpuSeconds: (after.cpuUs - before.cpuUs) / 1e6,
      peakCgroupMiB: Math.round(peak / 1048576),
      peakAnonMiB: Math.round(peakAnon / 1048576),
      oomKills: after.oom - before.oom,
      cliStats: stdout.match(/\[SITEMAP RESULT\] (.+)/)?.[1],
    }
    results.push(result)
    console.log(JSON.stringify({ label, mode, ...result }))
    if (fs.existsSync(path.join(sitemap, 'writer.ts')) && !result.complete)
      throw Error('New sitemap output failed coverage/XML validation')
    if (code !== 0)
      throw Error(`Sitemap failed; inspect ${label}-${mode}-${run}.log`)
  }
} finally {
  fs.writeFileSync(
    path.join(reportDir, `${label}-${mode}.json`),
    JSON.stringify(
      {
        label,
        mode,
        node: process.version,
        cpuMax: read('/sys/fs/cgroup/cpu.max').trim(),
        memoryMax: read('/sys/fs/cgroup/memory.max').trim(),
        swapMax: read('/sys/fs/cgroup/memory.swap.max').trim(),
        fixtureUrls: paths,
        results,
      },
      null,
      2
    )
  )
  if (server.listening) await new Promise((resolve) => server.close(resolve))
  fs.rmSync(work, { recursive: true, force: true })
}
