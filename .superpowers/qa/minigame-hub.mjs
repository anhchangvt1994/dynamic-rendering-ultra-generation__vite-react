// QC matrix for /mini-game hub: widths x states. Local stack only (dev 5191, local Supabase).
//   node .superpowers/qa/minigame-hub.mjs        (env WIDTHS, STATES to narrow)
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from '/Users/jupiter/Documents/development/vite-react-seo-project/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js'
const ROOT = '/Users/jupiter/Documents/development/vite-react-seo-project'
const D = `${ROOT}/.superpowers/qa/shots`; mkdirSync(D, { recursive: true })
const APP = process.env.APP || 'http://localhost:5191'
const st = JSON.parse(execFileSync(`${ROOT}/node_modules/.bin/supabase`, ['status', '-o', 'json'], { cwd: ROOT }).toString().replace(/^[^{]*/, ''))
const API = st.API_URL, anon = st.PUBLISHABLE_KEY || st.ANON_KEY, service = st.SERVICE_ROLE_KEY
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(API)) throw new Error('local only: ' + API)
const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
const sql = (q) => execFileSync('docker', ['--context', 'colima-supabase', 'exec', 'supabase_db_pokedex', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', q]).toString().trim()
const login = async (email, password) => (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
const SEED = "(select id from auth.users where email='abc@gmail.com')"
const seed = await login('abc@gmail.com', 'abc12345')
if (!seed.access_token) throw new Error('seed account missing: node .superpowers/qa/seed-abc.mjs')
const WIDTHS = (process.env.WIDTHS || '320,360,390,768,1024,1280,1440,1920').split(',').map(Number)
const STATES = (process.env.STATES || 'guest,signed-in,zero-turns,resume,no-pokemon,error,reduced-motion').split(',')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fail = 0
const bad = (m) => { fail++; console.log('  FAIL', m) }
const b = await puppeteer.launch({ headless: true, executablePath: process.env.HOME + '/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell' })

async function freshAccount() {
  const email = `hub-qa-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`, password = 'hub-qa-password-1'
  await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: admin, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  return login(email, password)
}
const resetSeed = () => { sql(`update minigame_players set used=0 where user_id=${SEED}`); sql(`delete from minigame_rounds where user_id=${SEED}`) }

// ---- in-page checks -------------------------------------------------------------------------
const pageChecks = () => {
  const out = { small: [], contrast: [], overflow: document.documentElement.scrollWidth - innerWidth }
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[aria-hidden="true"]') }
  const shell = document.querySelector('[data-hub-shell]')
  for (const e of shell.querySelectorAll('button, a[href], [role="button"]')) {
    if (!vis(e) || e.disabled) continue
    const r = e.getBoundingClientRect()
    if (r.width < 43.5 || r.height < 43.5) out.small.push(`${e.tagName}.${String(e.className).slice(0, 30)} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
  }
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
  out.texts = []
  const walker = document.createTreeWalker(shell, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  while (walker.nextNode()) {
    const t = walker.currentNode, e = t.parentElement
    if (!t.textContent.trim() || !vis(e) || seen.has(e)) continue
    seen.add(e)
    const s = getComputedStyle(e), fg = parse(s.color); if (!fg) continue
    const r = e.getBoundingClientRect()
    if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) continue
    const id = 'q' + out.texts.length; e.setAttribute('data-qc', id)
    const fs = parseFloat(s.fontSize)
    out.texts.push({ id, text: t.textContent.trim().slice(0, 24) + '<' + e.tagName + '.' + String(e.className).slice(0, 20) + '>', fg: [fg[0], fg[1], fg[2], fg[3] * (+s.opacity || 1)], large: fs >= 24 || (fs >= 18.66 && +s.fontWeight >= 700), fs })
  }
  return out
}

async function contrastOf(p, texts) {
  const bad = []
  for (const t of texts.slice(0, 60)) {
    await p.evaluate((id) => document.querySelector(`[data-qc="${id}"]`).scrollIntoView({ block: 'center', behavior: 'instant' }), t.id)
    await wait(150)
    const box = await p.evaluate((id) => { const e = document.querySelector(`[data-qc="${id}"]`); const r = e.getBoundingClientRect(); const s = e.style; e.dataset.qcColor = s.color; s.color = 'transparent'; s.textShadow = 'none'; s.webkitTextFillColor = 'transparent'; return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height } }, t.id)
    await wait(60)
    const inset = /^[^<]*<(BUTTON|A)\b/.test(t.text) ? 0.3 : 0 // tilted boxes: sample the centre, not the rotated bbox corners
    const clip = { x: Math.max(0, box.x + box.width * inset), y: Math.max(0, box.y + box.height * inset), width: Math.max(1, Math.min(box.width * (1 - 2 * inset), 400)), height: Math.max(1, box.height * (1 - 2 * inset)) }
    const b64 = await p.screenshot({ clip, encoding: 'base64' })
    const ratio = await p.evaluate(async (b64, fg) => {
      const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
      const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0)
      const d = g.getImageData(0, 0, img.width, img.height).data
      const L = (r, gg, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b) }
      const rs = []
      for (let i = 0; i < d.length; i += 4 * 3) {
        const a = fg[3], r = fg[0] * a + d[i] * (1 - a), gg = fg[1] * a + d[i + 1] * (1 - a), b = fg[2] * a + d[i + 2] * (1 - a)
        const L1 = L(r, gg, b), L2 = L(d[i], d[i + 1], d[i + 2]); rs.push((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05))
      }
      rs.sort((x, y) => x - y)
      return rs[Math.floor(rs.length * 0.05)]
    }, b64, t.fg)
    await p.evaluate((id) => { const e = document.querySelector(`[data-qc="${id}"]`); e.style.color = e.dataset.qcColor; e.style.textShadow = ''; e.style.webkitTextFillColor = '' }, t.id)
    if (ratio < (t.large ? 3 : 4.5)) bad.push(`${t.text} ${ratio.toFixed(2)} (${t.fs}px)`)
  }
  return bad
}

async function focusWalk(p) {
  const total = await p.evaluate(() => [...document.querySelector('[data-hub-shell]').querySelectorAll('button, a[href], [role="button"]')].filter((e) => !e.disabled && e.getBoundingClientRect().width > 0 && !e.closest('[aria-hidden="true"]')).length)
  const reached = new Set(); const noRing = []
  await p.evaluate(() => document.activeElement?.blur()); 
  for (let i = 0; i < total + 12; i++) {
    await p.keyboard.press('Tab')
    const r = await p.evaluate(() => { const e = document.activeElement; if (!e || !e.closest('[data-hub-shell]')) return null; const s = getComputedStyle(e); const q = e.getBoundingClientRect(); const k = e.tagName + '|' + (e.className || '') + '|' + (e.innerText || e.getAttribute('aria-label') || '').slice(0, 20) + '@' + Math.round(q.left) + ',' + Math.round(q.top + scrollY); const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none'); return { k, ring } })
    if (r) { reached.add(r.k); if (!r.ring) noRing.push(r.k) }
  }
  return { total, reached: reached.size, noRing: [...new Set(noRing)] }
}

async function run(state, w) {
  const h = w < 600 ? 800 : 900
  const errors = []
  const p = await b.newPage()
  p.on('pageerror', (e) => errors.push('page: ' + e.message))
  p.on('response', (r) => r.status() >= 400 && !/robots\.txt/.test(r.url()) && !(state === 'error' && /minigame_status|minigame/.test(r.url())) && errors.push(`${r.status()} ${r.url()}`))
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL/.test(m.text()) && !(state === 'error') && errors.push(m.text()))
  await p.setViewport({ width: w, height: h, isMobile: w < 600, hasTouch: w < 600 })
  if (state === 'reduced-motion') await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  let session = null
  if (state === 'no-pokemon') session = await freshAccount()
  else if (state !== 'guest') session = seed
  if (state === 'zero-turns') sql(`update minigame_players set used=3 where user_id=${SEED}`)
  await p.goto(`${APP}/robots.txt`)
  await p.evaluate((s) => { localStorage.clear(); sessionStorage.clear(); if (s) localStorage.setItem('pokedex:auth', JSON.stringify(s)) }, session)
  if (state === 'error') {
    await p.setRequestInterception(true)
    p.on('request', (r) => (/rpc\/minigame_status|rpc\/minigame_quests/.test(r.url()) ? r.respond({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' }) : r.continue().catch(() => {})))
  }
  await p.goto(`${APP}/mini-game`)
  await p.waitForSelector('[data-hub-shell] [data-region="booth"]', { timeout: 30000 })
  await p.waitForFunction(() => !document.querySelector('[data-page-skeleton]'), { timeout: 30000 })
  await wait(1800)
  const tag = `${state} ${w}`
  const regions = await p.evaluate(() => [...document.querySelectorAll('[data-region]')].map((e) => ({ k: e.dataset.region, over: e.scrollHeight - e.clientHeight })))
  const res = await p.evaluate(pageChecks)
  await p.evaluate(() => scrollTo(0, 0))
  const probs = []
  if (res.overflow > 0) probs.push(`horizontal overflow ${res.overflow}`)
  if (res.small.length) probs.push(`tap targets <44: ${res.small.join('; ')}`)
  if (state === 'signed-in' || state === 'guest') { const cb = await contrastOf(p, res.texts); if (cb.length) probs.push(`contrast: ${cb.slice(0, 6).join('; ')}`) }
  regions.filter((r) => r.over > 1).forEach((r) => probs.push(`${r.k} overflows ${r.over}px`))
  if (state === 'zero-turns') {
    const t = await p.evaluate(() => document.querySelector('[data-region="booth"]')?.innerText ?? '')
    if (!/Hết lượt/.test(t)) probs.push('zero-turns: booth lacks "Hết lượt"')
  }
  if (state === 'error') {
    const t = await p.evaluate(() => document.body.innerText)
    if (!/lỗi|thử lại|không tải/i.test(t)) probs.push('error: no error message visible')
  }
  if (state === 'reduced-motion') {
    const anims = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('[data-hub-shell]')).map((a) => a.animationName || a.constructor.name))
    if (anims.length) probs.push(`reduced-motion: running animations ${[...new Set(anims)].join(',')}`)
    const hidden = await p.evaluate(() => [...document.querySelectorAll('[data-region], [data-region] *')].filter((e) => !e.closest('[aria-hidden="true"]') && getComputedStyle(e).opacity === '0' && e.getBoundingClientRect().width > 0 && !e.matches('input,[hidden]')).map((e) => e.className).slice(0, 5))
    if (hidden.length) probs.push(`reduced-motion: opacity 0 left on ${hidden.join(',')}`)
  }
  if (state === 'resume') {
    await p.evaluate(() => [...document.querySelectorAll('[data-region="booth"]')].find((c) => /Candy Rush/.test(c.innerText)).querySelector('.mgp-play').click())
    await p.waitForFunction(() => [...document.querySelectorAll('.mg-pick')].some((x) => !x.disabled), { timeout: 20000 })
    await p.evaluate(() => [...document.querySelectorAll('.mg-pick')].find((x) => !x.disabled).click())
    await p.waitForFunction(() => /Dễ/.test(document.querySelector('.mg-body')?.innerText ?? ''), { timeout: 10000 })
    await p.evaluate(() => [...document.querySelectorAll('.mg-pick')].find((x) => /Dễ/.test(x.innerText)).click())
    await p.waitForSelector('.mg-candy-grid', { timeout: 20000 })
    await p.goto(`${APP}/mini-game`)
    await p.waitForSelector('[data-region="booth"] .mgp-play', { timeout: 30000 }); await wait(1500)
    await p.evaluate(() => [...document.querySelectorAll('[data-region="booth"]')].find((c) => /Candy Rush/.test(c.innerText)).querySelector('.mgp-play').click())
    const resumed = await p.waitForSelector('.mg-candy-grid', { timeout: 10000 }).then(() => true, () => false)
    if (!resumed) probs.push('resume: open round not resumed after reload')
    sql(`delete from minigame_rounds where user_id=${SEED}`); sql(`update minigame_players set used=0 where user_id=${SEED}`)
  }
  let walk = null
  if (state === 'signed-in' || state === 'guest') {
    walk = await focusWalk(p)
    if (walk.reached < walk.total) probs.push(`tab reaches ${walk.reached}/${walk.total} controls`)
    if (walk.noRing.length) probs.push(`no visible focus ring: ${walk.noRing.slice(0, 4).join('; ')}`)
  }
  if (state === 'signed-in') {
    const hidden = await p.evaluate(async () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); await new Promise((r) => setTimeout(r, 200)); return !!document.querySelector('[data-hub-shell][data-paused]') })
    if (!hidden) probs.push('hidden tab does not set data-paused')
  }
  if (errors.length) probs.push(`errors: ${errors.slice(0, 3).join(' | ')}`)
  await p.screenshot({ path: `${D}/hub-${state}-${w}.png`, fullPage: true })
  console.log(`${probs.length ? 'FAIL' : 'ok  '} ${tag}${walk ? ` tab ${walk.reached}/${walk.total}` : ''}`)
  probs.forEach(bad)
  await p.close()
}

try {
  resetSeed()
  for (const s of STATES) for (const w of WIDTHS) { try { await run(s, w) } catch (e) { bad(`${s} ${w}: ${e.message.split('\n')[0]}`) } finally { if (s === 'zero-turns') resetSeed() } }
} finally { resetSeed(); await b.close() }
console.log(fail ? `FAILED (${fail})` : 'ALL PASS')
process.exit(fail ? 1 : 0)
