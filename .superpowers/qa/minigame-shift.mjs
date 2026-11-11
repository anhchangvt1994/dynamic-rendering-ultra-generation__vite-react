// Zero-shift gate for /mini-game: skeleton vs loaded rects + CLS, 320..1920, guest + signed-in. Local only.
//   node .superpowers/qa/minigame-shift.mjs [tag]
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from '/Users/jupiter/Documents/development/vite-react-seo-project/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js'
const ROOT = '/Users/jupiter/Documents/development/vite-react-seo-project'
const D = `${ROOT}/.superpowers/qa/shots`; mkdirSync(D, { recursive: true })
const APP = process.env.APP || 'http://localhost:5191'
const st = JSON.parse(execFileSync(`${ROOT}/node_modules/.bin/supabase`, ['status', '-o', 'json'], { cwd: ROOT }).toString().replace(/^[^{]*/, ''))
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(st.API_URL)) throw new Error('local only')
const anon = st.PUBLISHABLE_KEY || st.ANON_KEY
const session = await (await fetch(`${st.API_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'abc@gmail.com', password: 'abc12345' }) })).json()
if (!session.access_token) throw new Error('seed account missing: node .superpowers/qa/seed-abc.mjs')
const tag = process.argv[2] || 'hub-shell'
const WIDTHS = (process.env.WIDTHS || '320,360,390,768,1024,1280,1440,1920').split(',').map(Number)
const STATES = (process.env.STATES || 'guest,signed-in').split(',')
const DELAY = 1500
const b = await puppeteer.launch({ headless: true, executablePath: process.env.HOME + '/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
let fail = 0
const bad = (m) => { fail++; console.log('  FAIL', m) }
const rects = () => [...document.querySelectorAll('[data-region]')].map((e) => {
  const r = e.getBoundingClientRect()
  return { k: e.dataset.region, t: Math.round(r.top + scrollY), l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), over: e.scrollHeight - e.clientHeight }
})
for (const state of STATES) for (const w of WIDTHS) {
  const p = await b.newPage()
  await p.setViewport({ width: w, height: w < 600 ? 800 : 900, isMobile: w < 600, hasTouch: w < 600 })
  await p.goto(`${APP}/robots.txt`)
  await p.evaluate((s, on) => { localStorage.clear(); sessionStorage.clear(); if (on) localStorage.setItem('pokedex:auth', JSON.stringify(s)) }, session, state === 'signed-in')
  await p.setRequestInterception(true)
  p.on('request', (r) => {
    if (/\/MiniGamePage\/index\.tsx/.test(r.url())) setTimeout(() => r.continue().catch(() => {}), DELAY)
    else r.continue().catch(() => {})
  })
  await p.evaluateOnNewDocument(() => {
    window.__cls = 0; window.__src = []; window.__outside = 0
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) {
      const inside = (e.sources || []).filter((s) => { const n = s.node && (s.node.nodeType === 1 ? s.node : s.node.parentElement); return n && n.closest && n.closest('[data-hub-shell]') })
      if (!inside.length) { window.__outside += e.value; continue }
      window.__cls += e.value
      for (const s of inside) window.__src.push((s.node?.nodeName || '?') + '.' + (s.node?.className || '') + ' ' + JSON.stringify(s.previousRect) + '->' + JSON.stringify(s.currentRect))
    } }).observe({ type: 'layout-shift', buffered: true })
  })
  await p.goto(`${APP}/mini-game`, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('[data-page-skeleton] [data-region]', { timeout: 30000 })
  await new Promise((r) => setTimeout(r, 300))
  const skel = await p.evaluate(rects)
  await p.screenshot({ path: `${D}/${tag}-${w}-${state}-skel.png` })
  await p.waitForFunction(() => !document.querySelector('[data-page-skeleton]') && document.querySelector('[data-region="booth"] .mgp-play'), { timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1500))
  const page = await p.evaluate(rects)
  const cls = await p.evaluate(() => window.__cls)
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  await p.screenshot({ path: `${D}/${tag}-${w}-${state}.png`, fullPage: true })
  console.log(`${state} ${w}: regions ${skel.length}/${page.length} CLS ${cls.toFixed(3)} overflowX ${over}`)
  if (skel.length !== page.length) bad('region count differs')
  skel.forEach((s, i) => {
    const q = page[i]; if (!q) return
    for (const k of ['t', 'l', 'w', 'h']) if (Math.abs(s[k] - q[k]) > 1) bad(`${s.k}#${i} ${k} skel ${s[k]} page ${q[k]}`)
  })
  page.forEach((q) => { if (q.over > 1) bad(`${q.k} content overflows box by ${q.over}px`) })
  if (cls > 0) { bad(`CLS ${cls}`); for (const x of await p.evaluate(() => window.__src)) console.log('    src', x) }
  if (over > 0) bad(`horizontal overflow ${over}`)
  await p.close()
}
await b.close()
console.log(fail ? `FAILED (${fail})` : 'ALL PASS')
process.exit(fail ? 1 : 0)
