// Candy Rush in a browser, local stack only (dev 5191). Moves come from engine.mjs run on the
// round's layout read from the local database; the browser is driven by taps only.
//   ENABLE_SUPABASE=true DEV_PORT=5191 node config/scripts/dev.mjs --port 5191
//   node .superpowers/qa/minigame-candy.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import puppeteer from '/Users/jupiter/Documents/development/vite-react-seo-project/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js'
import { trySwap } from '/Users/jupiter/Documents/development/vite-react-seo-project/src/pages/MiniGamePage/games/candy/engine.mjs'
const ROOT = '/Users/jupiter/Documents/development/vite-react-seo-project'
const D = `${ROOT}/.superpowers/qa/shots`
const APP = process.env.APP || 'http://localhost:5191'
const status = JSON.parse(execFileSync(`${ROOT}/node_modules/.bin/supabase`, ['status', '-o', 'json'], { cwd: ROOT }).toString().replace(/^[^{]*/, ''))
const API = status.API_URL, service = status.SERVICE_ROLE_KEY, anon = status.PUBLISHABLE_KEY || status.ANON_KEY
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(API)) throw new Error('local only: ' + API)
const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
const sql = (q) => execFileSync('docker', ['exec', 'supabase_db_pokedex', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', q]).toString().trim()
const vectors = JSON.parse(readFileSync(`${ROOT}/src/pages/MiniGamePage/games/candy/vectors.json`, 'utf8'))
let failed = 0
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++ }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const until = async (p, fn, arg, timeout = 10000) => {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    if (await p.evaluate(fn, arg).catch(() => false)) return true
    await wait(80)
  }
  throw new Error(`timeout ${String(fn).slice(0, 90)}`)
}
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.HOME + '/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
const errors = []

async function account() {
  const email = `candy-qa-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`, password = 'candy-qa-password-1'
  const made = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: admin, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  const session = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
  const id = crypto.randomUUID()
  sql(`insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values ('${id}','${made.id}',25,3,'{"v":3,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[0,0,0,0,0,0],"stars":2}')`)
  sql(`insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values ('${id}','${made.id}',90,80,80,now(),0)`)
  return { user: made.id, session }
}
async function open(width, height, session, { reduced = false } = {}) {
  const p = await browser.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('response', (r) => r.status() >= 400 && !/robots\.txt|rpc\/minigame_finish|\/api\/image\/rig\//.test(r.url()) && errors.push(`${r.status()} ${r.url()}`))
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL/.test(m.text()) && errors.push(m.text()))
  await p.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 })
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(`${APP}/robots.txt`)
  await p.evaluate((s) => { localStorage.clear(); sessionStorage.clear(); if (s) localStorage.setItem('pokedex:auth', JSON.stringify(s)) }, session ?? null)
  await goPage(p)
  return p
}
async function goPage(p) {
  await p.goto(`${APP}/mini-game`)
  await until(p, () => !!document.querySelector('.mgp-play'), null, 30000)
  await wait(400)
}
const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.innerText ?? '', sel)
const clickText = (p, sel, re) => p.evaluate((s, r) => {
  const el = [...document.querySelectorAll(s)].find((b) => new RegExp(r).test(b.innerText) && !b.disabled)
  if (!el) return false
  el.click()
  return true
}, sel, re)
const openCandy = async (p) => {
  await p.evaluate(() => [...document.querySelectorAll('[data-region="booth"]')].find((c) => /Candy Rush/.test(c.innerText)).querySelector('.mgp-play').click())
  await until(p, () => !!document.querySelector('.mg-panel'))
  await wait(400)
}
async function startRound(p, guest) {
  if (guest) {
    await clickText(p, '.mg-cta', 'Chơi thử')
  } else {
    await until(p, () => [...document.querySelectorAll('.mg-pick')].some((b) => !b.disabled), null, 15000)
    await p.evaluate(() => [...document.querySelectorAll('.mg-pick')].find((b) => !b.disabled).click())
  }
  await until(p, () => /Dễ/.test(document.querySelector('.mg-body')?.innerText ?? ''))
  await clickText(p, '.mg-pick', 'Dễ')
  await until(p, () => !!document.querySelector('.mg-candy-grid'), null, 20000)
  await wait(300)
}
const head = (p) => text(p, '.mg-candy-head')
const nums = async (p) => { const m = /Điểm\s+(\d+)\/(\d+)\s+Còn\s+(\d+)/.exec((await head(p)).replace(/\n/g, ' ')); return m ? { score: +m[1], target: +m[2], left: +m[3] } : null }
const idle = (p) => until(p, () => !!document.querySelector('.mg-result') || ![...document.querySelectorAll('.mg-candy-cell')].some((c) => c.disabled), null, 15000)
const tapMove = async (p, a, b) => {
  await idle(p)
  await p.evaluate((i) => document.querySelector(`.mg-candy-cell[data-i="${i}"]`)?.click(), a)
  await p.evaluate((i) => document.querySelector(`.mg-candy-cell[data-i="${i}"]`)?.click(), b)
}
const layoutOf = (user) => JSON.parse(sql(`select layout::text from public.minigame_rounds where user_id='${user}' and game='candy' and status='open'`))
const roundOf = (user) => sql(`select id from public.minigame_rounds where user_id='${user}' and game='candy' and status='open'`)
// every legal move from a state, best/worst by immediate gain
const options = (st, tape, kinds) => {
  const out = []
  for (let i = 0; i < 42; i += 1) {
    if (i % 6 < 5) out.push([i, i + 1])
    if (i + 6 < 42) out.push([i, i + 6])
  }
  return out.map(([a, b]) => [a, b, trySwap(st, tape, kinds, a, b)]).filter((x) => x[2])
}
const plan = (layout, kinds, n, pick) => {
  let st = { board: layout.board, pos: layout.pos, score: 0 }
  const moves = []
  for (let i = 0; i < n; i += 1) {
    const o = options(st, layout.tape, kinds)
    if (!o.length) break
    const [a, b, r] = pick(o)
    moves.push([a, b]); st = r.state
  }
  return moves
}
const lowest = (o) => o.reduce((x, y) => (y[2].state.score < x[2].state.score ? y : x))
const setLayout = (user, v) => sql(`update public.minigame_rounds set layout='${JSON.stringify({ tape: v.tape, board: v.board0, pos: v.pos0 })}'::jsonb where user_id='${user}' and game='candy' and status='open'`)
const reload = async (p) => { await goPage(p); await openCandy(p); await until(p, () => !!document.querySelector('.mg-candy-grid'), null, 20000); await wait(300) }
const winVec = vectors.find((v) => v.name === 'win')

async function signedIn(width, height) {
  const tag = `${width}x${height}`
  const acc = await account()
  const p = await open(width, height, acc.session)
  check(`${tag}: page lists Candy Rush with its own 3 turns`, await p.evaluate(() => { const c = [...document.querySelectorAll('[data-region="booth"]')].find((x) => /Candy Rush/.test(x.innerText)); return !!c && /Còn 3\/3 lượt/.test(c.querySelector('.hub-tickets')?.innerText ?? '') }))
  await p.screenshot({ path: `${D}/candy-page-${width}.png` })
  await openCandy(p)
  await until(p, () => document.querySelectorAll('.mg-pick').length >= 1, null, 15000)
  await startRound(p)
  check(`${tag}: a candy round opened on the server`, sql(`select count(*) from public.minigame_rounds where user_id='${acc.user}' and game='candy' and status='open'`) === '1')
  const first = await nums(p)
  check(`${tag}: score and moves show`, first && first.score === 0 && first.target === 3000 && first.left === 20, JSON.stringify(first))
  const cells = await p.evaluate(() => [...document.querySelectorAll('.mg-candy-cell')].map((c) => { const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }))
  check(`${tag}: 42 cells, each at least 44px`, cells.length === 42 && cells.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(cells[0]))
  check(`${tag}: no horizontal scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  check(`${tag}: every cell has a name`, await p.evaluate(() => [...document.querySelectorAll('.mg-candy-cell')].every((c) => /Ô \d+, \d+: \w+/.test(c.getAttribute('aria-label')))))
  await p.screenshot({ path: `${D}/candy-play-${width}.png` })

  // invalid move: shake, not counted
  const lay = layoutOf(acc.user)
  const bad = (() => { for (let i = 0; i < 41; i += 1) if (i % 6 < 5 && !trySwap({ board: lay.board, pos: lay.pos, score: 0 }, lay.tape, 4, i, i + 1)) return [i, i + 1] })()
  await tapMove(p, bad[0], bad[1])
  await until(p, () => !!document.querySelector('.mg-candy-cell[data-miss]'), null, 2000)
  check(`${tag}: a move that makes no line shakes and is not counted`, (await nums(p)).left === 20)
  await p.screenshot({ path: `${D}/candy-miss-${width}.png` })
  await wait(500)

  // reload mid-round restores the moves: two low-scoring moves, reload, same numbers
  const two = plan(lay, 4, 2, lowest)
  for (const [a, b] of two) { await tapMove(p, a, b); await wait(200) }
  await idle(p)
  const mid = await nums(p)
  check(`${tag}: two moves counted`, mid.left === 18 && mid.score > 0, JSON.stringify(mid))
  await reload(p)
  const back = await nums(p)
  check(`${tag}: reload mid-round restores score and moves`, back && back.score === mid.score && back.left === mid.left, JSON.stringify(back))

  // win: swap to the 'win' vector layout and play its 3 moves (combo chip on a deep cascade)
  sql(`update public.minigame_rounds set layout=layout where id='${roundOf(acc.user)}'`)
  setLayout(acc.user, winVec)
  await p.evaluate(() => sessionStorage.clear())
  await reload(p)
  let chip = false
  for (const [a, b] of winVec.moves) {
    await tapMove(p, a, b)
    for (let k = 0; k < 20 && !chip; k += 1) { chip = await p.evaluate(() => !!document.querySelector('.mg-combo, [class*="combo"]')?.innerText?.match(/×\d/)); await wait(100) }
  }
  await until(p, () => !!document.querySelector('.mg-result'), null, 20000)
  const result = await text(p, '.mg-result')
  check(`${tag}: a deep cascade shows the combo chip`, chip)
  check(`${tag}: win shows Chiến thắng and a reward`, /Chiến thắng/.test(result) && /exp/.test(result), result.replace(/\n/g, ' | ').slice(0, 120))
  check(`${tag}: round settled won on the server`, sql(`select status from public.minigame_rounds where user_id='${acc.user}' and game='candy' order by started_at desc limit 1`) === 'won')
  await p.screenshot({ path: `${D}/candy-result-${width}.png` })
  await p.close()
}

async function lose() {
  const acc = await account()
  const p = await open(390, 844, acc.session)
  await openCandy(p); await startRound(p)
  const lay = layoutOf(acc.user)
  // keep the 20 lowest-scoring moves from a fixed layout so the target stays out of reach
  for (const [a, b] of plan(lay, 4, 20, lowest)) {
    if (await p.evaluate(() => !!document.querySelector('.mg-result'))) break
    await tapMove(p, a, b); await wait(120)
  }
  await until(p, () => !!document.querySelector('.mg-result'), null, 30000)
  const t = await text(p, '.mg-result')
  check('out of moves: says so and shows score and moves', /Hết nước đi rồi/.test(t) && /\/3000 điểm · 20 nước/.test(t), t.replace(/\n/g, ' | ').slice(0, 140))
  check('out of moves: settled lost on the server', sql(`select status from public.minigame_rounds where user_id='${acc.user}' and game='candy' order by started_at desc limit 1`) === 'lost')
  await p.screenshot({ path: `${D}/candy-lost-390.png` })
  await p.close()
}

async function reducedMotion() {
  const acc = await account()
  const p = await open(390, 844, acc.session, { reduced: true })
  await openCandy(p); await startRound(p)
  const lay = layoutOf(acc.user)
  const [a, b] = plan(lay, 4, 1, lowest)[0]
  let animated = false
  await p.evaluate(() => { window.__pop = false; new MutationObserver(() => { if (document.querySelector('.mg-candy-cell[data-pop],.mg-candy-cell[data-drop]')) window.__pop = true }).observe(document.body, { subtree: true, attributes: true, childList: true }) })
  const t0 = Date.now()
  await tapMove(p, a, b)
  await until(p, () => { const m = /Còn\s+(\d+)/.exec(document.querySelector('.mg-candy-head')?.innerText ?? ''); return m && +m[1] === 19 }, null, 3000)
  animated = await p.evaluate(() => window.__pop)
  check('reduced motion: move applies at once, no pop/drop phases', !animated && Date.now() - t0 < 1500, `${Date.now() - t0}ms`)
  await p.close()
}

async function timeout() {
  const acc = await account()
  const p = await open(390, 844, acc.session)
  await openCandy(p); await startRound(p)
  const lay = layoutOf(acc.user)
  sql(`update public.minigame_rounds set deadline = now() + interval '9 seconds' where user_id='${acc.user}' and game='candy' and status='open'`)
  await reload(p)
  const [a, b] = plan(lay, 4, 1, lowest)[0]
  await until(p, () => /^0:0[0-2]$/.test(document.querySelector('.mg-time strong')?.innerText ?? ''), null, 15000)
  await tapMove(p, a, b) // the clock runs out while the cascade animates
  await until(p, () => !!document.querySelector('.mg-result'), null, 30000)
  const t = await text(p, '.mg-result')
  check('time out while animating: result shown, no crash', /Hết giờ rồi|Chiến thắng/.test(t), t.replace(/\n/g, ' | ').slice(0, 80))
  check('time out while animating: round closed on the server', ['lost', 'expired', 'won'].includes(sql(`select status from public.minigame_rounds where user_id='${acc.user}' and game='candy' order by started_at desc limit 1`)))
  await p.close()
}

async function guest() {
  const p = await open(390, 844, null)
  await openCandy(p); await startRound(p, true)
  check('guest: practice banner, no reward promise', /Chơi thử: không mất lượt/.test(await text(p, '.mg-panel')))
  check('guest: board is playable (42 cells)', (await p.evaluate(() => document.querySelectorAll('.mg-candy-cell').length)) === 42)
  // find any legal move by trying neighbours until the counter drops
  let moved = false
  for (let i = 0; i < 41 && !moved; i += 1) {
    if (i % 6 === 5) continue
    await tapMove(p, i, i + 1)
    await wait(150)
    await idle(p)
    moved = (await nums(p)).left < 20
  }
  check('guest: a legal move counts', moved)
  check('guest: no reward text', !/\+\d+ exp|điểm huấn luyện/.test(await text(p, '.mg-panel')))
  await p.close()
}

const run = async (name, fn) => { try { await fn() } catch (e) { check(`${name} ran`, false, e.message) } }
await run('signed in 390', () => signedIn(390, 844))
await run('signed in 1280', () => signedIn(1280, 800))
await run('lose', lose)
await run('reduced motion', reducedMotion)
await run('time out', timeout)
await run('guest', guest)
check('no console / page / network errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
console.log(failed ? `${failed} FAILED` : 'ALL PASS')
process.exit(failed ? 1 : 0)
