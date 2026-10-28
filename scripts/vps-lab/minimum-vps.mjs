/** Docker-only resource qualification. Load/upstream run outside the candidate cgroup. */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
const out = path.resolve(
  '.vps-lab/minimum-vps',
  process.env.MIN_RUN_LABEL || String(Date.now())
)
fs.mkdirSync(out, { recursive: true })
const candidate = process.env.MIN_CANDIDATE || 'vps-min-candidate',
  client = 'vps-min-client',
  image = process.env.MIN_IMAGE || 'vps-lab/minimum:current'
if (!/^vps-min-candidate(?:-[a-z0-9-]+)?$/.test(candidate))
  throw Error('MIN_CANDIDATE must use the dedicated vps-min-candidate[-suffix] namespace')
const base = `http://${candidate}:8080`
const duration = Number(process.env.MIN_SECONDS || 90),
  rps = Number(process.env.MIN_RPS || 20),
  vus = Number(process.env.MIN_VUS || 20)
const coldRestart = Boolean(process.env.MIN_COLD_RESTART)
const cacheDirs = ['/tmp/pages', '/tmp/views', '/tmp/data', '/tmp/store']
const profiles = JSON.parse(
  process.env.MIN_PROFILES ||
    '[{"ram":512,"cpu":1},{"ram":768,"cpu":1},{"ram":1024,"cpu":1},{"ram":1536,"cpu":1},{"ram":1536,"cpu":2},{"ram":2048,"cpu":2}]'
)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const docker = (args, options = {}) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1048576,
    ...options,
  }).trim()
const exec = (args, options = {}) =>
  docker(['exec', candidate, ...args], options)
const json = (args) => JSON.parse(exec(['node', '-e', args]))
const clientRun = (options) =>
  JSON.parse(
    docker([
      'exec',
      client,
      'node',
      '/minimum-client.mjs',
      JSON.stringify({ ...options, base }),
    ])
  )
const asyncDocker = (args, log) => {
  const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let text = ''
  if (log) fs.writeFileSync(log, '')
  const record = (data) => {
    text += data
    if (log) fs.appendFileSync(log, data)
  }
  child.stdout.on('data', record)
  child.stderr.on('data', record)
  const result = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      resolve({ code, signal, text })
    })
  })
  return { child, result }
}
const sampleCode = `const f=require('fs'),r=p=>{try{return f.readFileSync('/sys/fs/cgroup/'+p,'utf8')}catch{return ''}},m=r('memory.stat'),n=(s,k)=>Number(new RegExp('^'+k+' (\\\\d+)$','m').exec(s)?.[1]||0);console.log(JSON.stringify({time:Date.now(),memory:Number(r('memory.current')),inactive:n(m,'inactive_file'),anon:n(m,'anon')+n(m,'shmem'),cpu:n(r('cpu.stat'),'usage_usec'),oom:n(r('memory.events'),'oom_kill'),pressure:r('cpu.pressure').trim()}))`
const readSample = () => json(sampleCode)
const readSamples = () => {
  const raw = exec(['cat', '/tmp/minimum-samples.txt'])
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [
        time,
        memory,
        inactive,
        anon,
        cpu,
        oom,
        nodeRss,
        browserRss,
        redisRss,
        nodeProcs,
        browserProcs,
      ] = line.trim().split(/\s+/).map(Number)
      return {
        time,
        memory,
        inactive,
        anon,
        cpu,
        oom,
        nodeRss,
        browserRss,
        redisRss,
        nodeProcs,
        browserProcs,
      }
    })
}
const trend = (all, from, durationMs) => {
  const bins = new Map()
  for (const s of all.filter(
    (s) =>
      s.time >= from + Math.max(120000, durationMs / 2) &&
      s.time <= from + durationMs
  )) {
    const minute = Math.floor((s.time - from) / 60000)
    if (!bins.has(minute)) bins.set(minute, [])
    bins.get(minute).push(s)
  }
  const idle = [...bins].map(([minute, rows]) => {
    const p20 = (key) => {
      const a = rows.map(key).sort((a, b) => a - b)
      return Math.round(a[Math.floor(a.length * 0.2)] / 1048576)
    }
    return {
      minute,
      workingMiB: p20((s) => s.memory - s.inactive),
      nodeMiB: p20((s) => s.nodeRss),
      browserMiB: p20((s) => s.browserRss),
      redisMiB: p20((s) => s.redisRss),
      minBrowsers: Math.min(...rows.map((s) => s.browserProcs)),
    }
  })
  const slope = (key) => {
    if (idle.length < 3) return null
    const mx = idle.reduce((n, r) => n + r.minute, 0) / idle.length,
      my = idle.reduce((n, r) => n + r[key], 0) / idle.length
    return +(
      idle.reduce((n, r) => n + (r.minute - mx) * (r[key] - my), 0) /
      idle.reduce((n, r) => n + (r.minute - mx) ** 2, 0)
    ).toFixed(2)
  }
  return {
    idleMinutes: idle,
    nodeMiBPerMinute: slope('nodeMiB'),
    browserMiBPerMinute: slope('browserMiB'),
    workingMiBPerMinute: slope('workingMiB'),
  }
}
const budgetCode = `require('sucrase/register');const {getResourceBudget,getResources}=require('./server/src/utils/ResourceBudget');const {getSitemapOptions}=require('./server/sitemap/config');const {PROCESS_ENV}=require('./server/src/utils/InitEnv');console.log(JSON.stringify({app:getResourceBudget(PROCESS_ENV),sitemap:getSitemapOptions(PROCESS_ENV)}))`
const pm2State = () =>
  JSON.parse(
    exec([
      'node',
      '-e',
      `const pm2=require('pm2');pm2.connect(e=>{if(e)throw e;pm2.list((e,p)=>{if(e)throw e;console.log(JSON.stringify(p.map(x=>({pid:x.pid,name:x.name,restarts:x.pm2_env.restart_time,status:x.pm2_env.status,memory:x.monit.memory}))));pm2.disconnect()})})`,
    ])
  )
const cacheSnapshot = () => json(`const fs=require('fs');const count=p=>{if(!fs.existsSync(p))return 0;return fs.readdirSync(p,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?count(p+'/'+e.name):1),0)};console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(cacheDirs)}.map(p=>[p,count(p)]))))`)
const summarize = (samples, cpuCount) => {
  const from = samples[0],
    last = samples.at(-1),
    mb = 1048576
  return {
    samples: samples.length,
    peakAnonMiB: Math.round(Math.max(...samples.map((s) => s.anon)) / mb),
    peakWorkingSetMiB: Math.round(
      Math.max(...samples.map((s) => s.memory - s.inactive)) / mb
    ),
    peakTotalMiB: Math.round(Math.max(...samples.map((s) => s.memory)) / mb),
    cpuCores: +(
      (last.cpu - from.cpu) /
      ((last.time - from.time) * 1000)
    ).toFixed(3),
    cpuCapacity: cpuCount,
    oomKills: last.oom - from.oom,
  }
}
const results = []
for (const profile of profiles) {
  const label = `${profile.cpu}cpu-${profile.ram}m`,
    dir = path.join(out, label)
  fs.mkdirSync(dir, { recursive: true })
  const report = {
    profile,
    label,
    rps,
    vus,
    seconds: duration,
    image,
    botProfile: 'public Googlebot UA, without internal service header',
    coldRestart,
    status: 'running',
  }
  results.push(report)
  console.log(
    JSON.stringify({ phase: 'start', label, seconds: duration, rps, vus })
  )
  let samples = [],
    startupJob
  try {
    try {
      docker(['rm', '-f', candidate])
    } catch {}
    docker([
      'run',
      '-d',
      '--init',
      '--name',
      candidate,
      '--network',
      'vps-min-lab',
      '--cpus',
      String(profile.cpu),
      '--memory',
      profile.ram + 'm',
      '--memory-swap',
      profile.ram + 'm',
      image,
      'sleep',
      'infinity',
    ])
    report.imageId = docker(['inspect', '--format', '{{.Image}}', candidate])
    const redisMB = Math.min(128, Math.floor(profile.ram / 16)),
      heapMB = profile.ram <= 1024 ? 128 : 256
    exec([
      'node',
      '-e',
      `const fs=require('fs');fs.appendFileSync('server/.env.production',${JSON.stringify('\nHOST=' + base + '\nREDIS_MAX_MEMORY=' + redisMB + 'mb\nSITEMAP_MAX_RESPONSE_MB=2\n' + (process.env.MIN_DEBUG ? 'ENABLE_CONSOLE_DEBUGGER=true\n' : ''))});`,
    ])
    report.redisMaxMB = redisMB
    report.nodeOptions = `--max-old-space-size=${heapMB}`
    report.budgets = JSON.parse(exec(['node', '-e', budgetCode]))
    if (process.env.MIN_DEBUG) {
      exec(['node', '-e', `require('fs').appendFileSync('server/src/puppeteer-ssr/utils/ISRGenerator.next/index.ts', ${JSON.stringify('\nsetInterval(() => console.log("[queue-state]", JSON.stringify({running: totalRequestsToCrawl, admitted: totalRequestsWaitingToCrawl, queued: waitingToCrawlList.size, rendering: crawlingUrls.size, capacity: hasCrawlCapacity(0)})), 1000).unref()\n')})`])
    }
    docker([
      'cp',
      'scripts/vps-lab/minimum-sampler.sh',
      candidate + ':/tmp/minimum-sampler.sh',
    ])
    docker(['exec', '-d', candidate, 'sh', '/tmp/minimum-sampler.sh'])
    startupJob = asyncDocker(
      [
        'exec',
        '-e',
        `NODE_OPTIONS=${report.nodeOptions}`,
        candidate,
        'node',
        'config/scripts/start:redis-api:pm2:worker.mjs',
      ],
      path.join(dir, 'startup.log')
    )
    const began = Date.now()
    let ready = false
    while (Date.now() - began < 60000) {
      try {
        const check = clientRun({ mode: 'check', kind: 'human', paths: ['/'] })
        if (check.results[0]?.status === 200) {
          ready = true
          break
        }
      } catch {}
      await sleep(1000)
    }
    report.startupMs = Date.now() - began
    if (!ready) throw Error('Server startup timeout')
    const apiPaths = JSON.parse(
      exec(['cat', 'scripts/vps-lab/minimum-api-paths.json'])
    )
    const warm = clientRun({
      mode: 'warm',
      paths: Array.from({ length: 8 }, (_, i) => '/detail/' + i),
    })
    report.warmup = warm.summary
    fs.writeFileSync(
      path.join(dir, 'warmup.json'),
      JSON.stringify(warm, null, 2)
    )
    if (warm.summary.ok !== 8)
      throw Error('Cached-page warmup failed content/status validation')
    const warmApi = clientRun({ mode: 'check', kind: 'api', paths: apiPaths })
    report.apiWarmup = warmApi.summary
    if (warmApi.summary.ok !== apiPaths.length)
      throw Error('API warmup failed content/status validation')
    // Warm the CSR view too; its HTML path is distinct from bot ISR.
    const humanWarm = clientRun({
      mode: 'check',
      kind: 'human',
      paths: Array.from({ length: 8 }, (_, i) => '/detail/' + i),
    })
    if (humanWarm.summary.ok !== 8) throw Error('CSR warmup failed')
    if (coldRestart) {
      // First populate both app cache and a real existing sitemap. Preserve the
      // XML during reset: seed reuse must recrawl all pages when HTML is gone.
      const seeded = await asyncDocker([
        'exec', '-e', `NODE_OPTIONS=${report.nodeOptions}`, candidate,
        'node', 'config/scripts/start-sitemap-generator.mjs',
      ], path.join(dir, 'before-reset-sitemap.log')).result
      if (seeded.code !== 0) throw Error('Pre-reset sitemap did not finish')
      report.beforeReset = { actualFiles: cacheSnapshot(), redisKeys: Number(exec(['valkey-cli', 'DBSIZE'])) }
      if (!report.beforeReset.actualFiles['/tmp/pages'] || !report.beforeReset.actualFiles['/tmp/views'] || !report.beforeReset.redisKeys)
        throw Error('Cold reset must start with populated HTML and Redis caches')
      // Restart only this dedicated lab container: all app/browser/Redis
      // processes stop, but filesystem cache survives until explicitly cleared.
      docker(['stop', '-t', '3', candidate])
      await startupJob.result
      docker(['start', candidate])
      // Redis-backed API data/store may have no disk files. Seed explicitly
      // labelled stale-file sentinels while stopped to verify these paths too.
      exec(['node', '-e', `const fs=require('fs');for(const p of ${JSON.stringify(cacheDirs)}){fs.mkdirSync(p,{recursive:true});fs.writeFileSync(p+'/.minimum-cache-reset-sentinel','lab stale-file sentinel')}`])
      report.beforeReset.filesIncludingSentinels = cacheSnapshot()
      exec(['node', '-e', `const fs=require('fs');if(!fs.existsSync('/.dockerenv'))throw Error('Docker only');for(const p of ${JSON.stringify(cacheDirs)})fs.rmSync(p,{recursive:true,force:true});fs.rmSync('/tmp/minimum-samples.txt',{force:true});`])
      report.afterClear = cacheSnapshot()
      if (Object.values(report.afterClear).some(Boolean)) throw Error('Cache deletion incomplete')
      docker(['exec', '-d', candidate, 'sh', '/tmp/minimum-sampler.sh'])
      startupJob = asyncDocker(['exec', '-e', `NODE_OPTIONS=${report.nodeOptions}`, candidate,
        'node', 'config/scripts/start:redis-api:pm2:worker.mjs'], path.join(dir, 'restart-startup.log'))
      const restartAt = Date.now()
      let listening = false
      while (Date.now() - restartAt < 60000) {
        // A TCP connection cannot trigger ISR, API caching, or a loader render.
        try {
          const check = docker(['exec', client, 'node', '-e', `const net=require('net');const s=net.connect(8080,'${candidate}',()=>{console.log('ready');s.end()});s.on('error',()=>process.exit(1));s.setTimeout(1000,()=>process.exit(1))`], {stdio: ['ignore', 'pipe', 'ignore']})
          if (check === 'ready') { listening = true; break }
        } catch {}
        await sleep(500)
      }
      if (!listening) throw Error('Cold restart startup timeout')
      report.coldStartupMs = Date.now() - restartAt
      report.beforeColdSitemap = { files: cacheSnapshot(), redisKeys: Number(exec(['valkey-cli', 'DBSIZE'])) }
      if (Object.values(report.beforeColdSitemap.files).some(Boolean) || report.beforeColdSitemap.redisKeys)
        throw Error('Cache was populated before cold sitemap started')
      console.log(JSON.stringify({phase:'cold-reset-verified',label,...report.beforeColdSitemap}))
    }
    const initialPm2 = pm2State()
    report.initialPm2 = initialPm2
    const sitemapJobs = []
    let sitemapActive = false,
      sitemapSkipped = 0
    const startSitemap = (round) => {
      if (sitemapActive) {
        sitemapSkipped++
        return
      }
      sitemapActive = true
      const p = asyncDocker(
        [
          'exec',
          '-e',
          `NODE_OPTIONS=${report.nodeOptions}`,
          candidate,
          'node',
          'config/scripts/start-sitemap-generator.mjs',
        ],
        path.join(dir, `sitemap-${round}.log`)
      )
      sitemapJobs.push(
        p.result
          .then((result) => {
            let stats
            try {
              stats = JSON.parse(
                result.text.match(/\[SITEMAP RESULT\] (.+)/)[1]
              )
            } catch {}
            return { ...result, text: undefined, stats }
          })
          .finally(() => {
            sitemapActive = false
          })
      )
      return p.result
    }
    const firstSitemap = startSitemap(0)
    // No warmup or user traffic between cache verification and this generation.
    if (coldRestart) await firstSitemap
    const sitemapTimer =
      duration > 120
        ? setInterval(() => {
            startSitemap(sitemapJobs.length)
          }, 60000)
        : undefined
    const loadFrom = Date.now()
    const load = await asyncDocker(
      [
        'exec',
        client,
        'node',
        '/minimum-client.mjs',
        JSON.stringify({
          mode: 'load',
          seconds: duration,
          rps,
          vus,
          apiPaths,
          base,
          freshBase: 1000,
        }),
      ],
      path.join(dir, 'load.json')
    ).result
    const loadTo = loadFrom + duration * 1000
    clearInterval(sitemapTimer)
    if (load.code !== 0) throw Error('Load client failed: ' + load.text)
    report.load = JSON.parse(load.text)
    const deadline = new Promise((resolve) =>
      setTimeout(() => resolve(null), 120000).unref()
    )
    report.sitemap = await Promise.race([Promise.all(sitemapJobs), deadline])
    if (!report.sitemap)
      throw Error('Sitemap did not finish within grace window')
    report.sitemapSkipped = sitemapSkipped
    const post = clientRun({
      mode: 'check',
      paths: ['/', ...Array.from({ length: 64 }, (_, i) => '/detail/' + i)],
    })
    report.postSitemap = post.summary
    fs.writeFileSync(
      path.join(dir, 'post-content.json'),
      JSON.stringify(post, null, 2)
    )
    await sleep(5000)
    samples = readSamples()
    report.resources = summarize(samples, profile.cpu)
    report.loadResources = summarize(
      samples.filter((s) => s.time >= loadFrom && s.time <= loadTo),
      profile.cpu
    )
    report.memoryTrend = trend(samples, loadFrom, duration * 1000)
    report.finalPm2 = pm2State()
    report.restartDelta =
      report.finalPm2.reduce((sum, p) => sum + p.restarts, 0) -
      initialPm2.reduce((sum, p) => sum + p.restarts, 0)
    report.redis = exec(['valkey-cli', 'INFO', 'memory'])
    const xmls = JSON.parse(
      exec([
        'node',
        '-e',
        `const fs=require('fs');const root='server/sitemap';const names=['sitemap.xml',...fs.readdirSync(root+'/sitemaps').map(n=>'sitemaps/'+n)];console.log(JSON.stringify(Object.fromEntries(names.map(name=>[name,fs.readFileSync(root+'/'+name,'utf8')]))))`,
      ])
    )
    report.files = Object.entries(xmls).map(([name, xml]) => ({
      name,
      bytes: Buffer.byteLength(xml),
    }))
    for (const [name, xml] of Object.entries(xmls)) {
      fs.mkdirSync(path.dirname(path.join(dir, 'xml', name)), {
        recursive: true,
      })
      fs.writeFileSync(path.join(dir, 'xml', name), xml)
    }
    report.coverage = JSON.parse(
      execFileSync(
        'python3',
        [
          '-c',
          `import json,sys,xml.etree.ElementTree as E
files=json.load(sys.stdin);ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'};actual=[]
for name,xml in files.items():
 r=E.fromstring(xml)
 if name=='sitemap.xml': assert r.tag=='{http://www.sitemaps.org/schemas/sitemap/0.9}sitemapindex'
 else:
  assert r.tag=='{http://www.sitemaps.org/schemas/sitemap/0.9}urlset'
  actual += [e.text for e in r.findall('s:url/s:loc',ns)]
expected={${JSON.stringify(base + '/')}}|{${JSON.stringify(base + '/detail/')}+str(i) for i in range(64)}
print(json.dumps({'xmlValid':True,'actual':len(actual),'duplicates':len(actual)-len(set(actual)),'missing':sorted(expected-set(actual)),'unexpected':sorted(set(actual)-expected)}))`,
        ],
        { input: JSON.stringify(xmls), encoding: 'utf8' }
      )
    )
    const reasons = []
    if (report.resources.oomKills) reasons.push('oom')
    if (report.restartDelta || initialPm2.some((p) => p.restarts))
      reasons.push('pm2-restarts')
    for (const kind of ['cached', 'api', 'human']) {
      const metrics = report.load[kind]
      if (!metrics.count || metrics.ok / metrics.count < 0.999)
        reasons.push(kind + '-errors')
      if (metrics.p95 > 500) reasons.push(kind + '-p95')
    }
    if (report.load.dropped) reasons.push('client-saturation')
    if (report.load.fresh.ok / report.load.fresh.count < 0.99)
      reasons.push('fresh-errors')
    if (report.load.fresh.p95 > 10000) reasons.push('fresh-p95')
    if (
      report.sitemap.some((s) => s.code !== 0 || s.stats?.saved !== 65) ||
      report.coverage.missing.length ||
      report.coverage.unexpected.length ||
      report.coverage.duplicates ||
      report.postSitemap.ok !== 65
    )
      reasons.push('sitemap')
    if (
      report.resources.peakWorkingSetMiB >
      profile.ram - Math.max(256, profile.ram * 0.25)
    )
      reasons.push('ram-headroom')
    if (report.loadResources.cpuCores > profile.cpu * 0.8)
      reasons.push('cpu-headroom')
    report.reasons = reasons
    report.status = reasons.length ? 'fail' : 'pass'
  } catch (error) {
    report.status = 'fail'
    report.error = error.message
    try {
      report.failureSample = readSample()
    } catch {}
  } finally {
    try {
      samples = readSamples()
    } catch {}
    fs.writeFileSync(path.join(dir, 'samples.json'), JSON.stringify(samples))
    try {
      docker(['cp', candidate + ':/root/.pm2/logs', path.join(dir, 'pm2-logs')])
      report.logs = exec([
        'sh',
        '-c',
        'tail -60 /root/.pm2/logs/*error*.log 2>/dev/null || true',
      ])
    } catch {}
    try {
      report.events = exec(['cat', '/sys/fs/cgroup/memory.events'])
    } catch {}
    try {
      report.inspect = JSON.parse(docker(['inspect', candidate]))[0].State
    } catch {}
    fs.writeFileSync(
      path.join(dir, 'report.json'),
      JSON.stringify(report, null, 2)
    )
    fs.writeFileSync(
      path.join(out, 'matrix.json'),
      JSON.stringify(results, null, 2)
    )
    console.log(
      JSON.stringify({
        phase: 'done',
        label,
        status: report.status,
        error: report.error,
        reasons: report.reasons,
        resources: report.resources,
        load: report.load,
        sitemap: report.sitemap?.map((s) => ({
          code: s.code,
          saved: s.stats?.saved,
          ms: s.stats?.elapsedMs,
        })),
      })
    )
    try {
      docker(['rm', '-f', candidate])
    } catch {}
    await startupJob?.result.catch(() => {})
  }
}
// A screening matrix succeeds when it identifies at least one passing profile.
process.exitCode = results.some((r) => r.status === 'pass') ? 0 : 1
