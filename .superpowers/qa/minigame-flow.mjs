// The mini game in a browser (dev 5191 with the local stack): server rounds when
// signed in, practice when a guest. Mobile 390x844 and desktop 1280x800.
//   ENABLE_SUPABASE=true DEV_PORT=5191 node config/scripts/dev.mjs --port 5191
//   node .superpowers/qa/minigame-flow.mjs
import { execFileSync } from 'node:child_process'
import puppeteer from '/Users/jupiter/Documents/development/vite-react-seo-project/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js'
const ROOT = '/Users/jupiter/Documents/development/vite-react-seo-project'
const D = `${ROOT}/.superpowers/qa/shots`
const APP = process.env.APP || 'http://localhost:5191'
const status = JSON.parse(execFileSync(`${ROOT}/node_modules/.bin/supabase`, ['status', '-o', 'json'], { cwd: ROOT }).toString().replace(/^[^{]*/, ''))
const API = status.API_URL, service = status.SERVICE_ROLE_KEY, anon = status.PUBLISHABLE_KEY || status.ANON_KEY
const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
const sql = (q) => execFileSync('docker', ['exec', 'supabase_db_pokedex', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', q]).toString().trim()
let failed = 0
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++ }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const until = async (p, fn, arg, timeout = 10000) => {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    if (await p.evaluate(fn, arg).catch(() => false)) return true
    await wait(100)
  }
  throw new Error(`timeout ${fn}`)
}
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.HOME + '/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
const errors = []

async function account() {
  const email = `minigame-qa-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`, password = 'minigame-qa-password-1'
  const made = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: admin, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  const session = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
  const ids = {}
  for (const [key, species, hunger] of [['fed', 25, 90], ['hungry', 4, 10]]) {
    const id = crypto.randomUUID()
    ids[key] = id
    sql(`insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values ('${id}','${made.id}',${species},3,'{"v":3,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[0,0,0,0,0,0],"stars":2}')`)
    sql(`insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values ('${id}','${made.id}',${hunger},80,80,now(),0)`)
  }
  return { user: made.id, session, ids }
}

async function open(width, height, session) {
  const p = await browser.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  // finishing right at the deadline is refused until the server's grace passes (not_finished); the sheet retries by design
  p.on('response', (r) => r.status() >= 400 && !/robots\.txt|rpc\/minigame_finish/.test(r.url()) && errors.push(`${r.status()} ${r.url()}`))
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL/.test(m.text()) && errors.push(m.text()))
  await p.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 })
  await p.goto(`${APP}/robots.txt`)
  await p.evaluate((s) => { localStorage.clear(); if (s) localStorage.setItem('pokedex:auth', JSON.stringify(s)) }, session ?? null)
  await goPage(p)
  return p
}
async function goPage(p) {
  await p.goto(`${APP}/mini-game`)
  await until(p, () => !!document.querySelector('.mgp-play'), null, 30000)
  await wait(400)
}
const openSheet = async (p) => {
  await p.evaluate(() => document.querySelector('.mgp-play').click())
  await until(p, () => !!document.querySelector('.mg-panel'))
  await wait(500)
}
const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.innerText ?? '', sel)
const clickText = (p, sel, re) => p.evaluate((s, r) => {
  const el = [...document.querySelectorAll(s)].find((b) => new RegExp(r).test(b.innerText) && !b.disabled)
  if (!el) return false
  el.click()
  return true
}, sel, re)
const pickFirstEnabled = (p) => p.evaluate(() => {
  const b = [...document.querySelectorAll('.mg-pick')].find((x) => !x.disabled)
  if (!b) return false
  b.click()
  return true
})
// start a round: Pokémon (when the sheet asks), the easiest level, the 3-2-1
async function startRound(p) {
  await until(p, () => /Chọn Pokémon|Đổi Pokémon|Chơi thử|Dễ/.test(document.querySelector('.mg-body')?.innerText ?? ''), null, 15000)
  if (/Chọn Pokémon cùng chơi/.test(await text(p, '.mg-body'))) {
    await until(p, () => [...document.querySelectorAll('.mg-pick')].some((b) => !b.disabled), null, 15000)
    await pickFirstEnabled(p)
    await wait(300)
  } else if (/Chơi thử/.test(await text(p, '.mg-body')) && !/Dễ/.test(await text(p, '.mg-body'))) {
    await clickText(p, '.mg-cta', 'Chơi thử')
    await wait(300)
  }
  await until(p, () => /Dễ/.test(document.querySelector('.mg-body')?.innerText ?? ''))
  await clickText(p, '.mg-pick', 'Dễ')
  await until(p, () => !!document.querySelector('.mg-board'), null, 20000)
  await wait(300)
}
const faceOf = (p, i) => p.evaluate((n) => document.querySelectorAll('.mg-card')[n]?.querySelector('.mg-face img')?.getAttribute('src') ?? null, i)
const cardState = (p) => p.evaluate(() => [...document.querySelectorAll('.mg-card')].map((c) => ({ matched: c.dataset.matched === 'true' || c.hasAttribute('data-matched'), up: c.hasAttribute('data-up'), spin: c.hasAttribute('data-spin') })))
async function tapCard(p, i) {
  await until(p, (n) => { const c = document.querySelectorAll('.mg-card')[n]; return c && !c.disabled }, i, 8000)
  await p.evaluate((n) => document.querySelectorAll('.mg-card')[n].click(), i)
  try {
    await until(p, (n) => { if (document.querySelector('.mg-result')) return true; const c = document.querySelectorAll('.mg-card')[n]; return c.hasAttribute('data-up') && !c.hasAttribute('data-spin') }, i, 8000)
  } catch (e) {
    console.log('TAP DEBUG', i, JSON.stringify(await p.evaluate(() => ({ err: document.querySelector('.mg-error')?.innerText, cards: [...document.querySelectorAll('.mg-card')].map((c) => [...c.attributes].map((a) => a.name).filter((n) => n.startsWith('data-')).join('+') + (c.disabled ? '!' : '')) }))))
    throw e
  }
}
// solve by looking only at what the board shows
async function solve(p) {
  const total = (await cardState(p)).length
  const known = {}
  let flips = 0
  const matchedCount = async () => (await cardState(p)).filter((c) => c.matched).length
  const settled = async () => { await until(p, () => !!document.querySelector('.mg-result') || ![...document.querySelectorAll('.mg-card')].some((c) => c.hasAttribute('data-miss') || c.hasAttribute('data-spin')), null, 8000) }
  for (let guard = 0; guard < total * 4; guard += 1) {
    const state = await cardState(p)
    if (state.every((c) => c.matched)) return flips
    if (await p.evaluate(() => !!document.querySelector('.mg-result'))) return flips
    // a pair already seen
    const seen = {}
    let pair = null
    for (let i = 0; i < total; i += 1) {
      if (state[i].matched) continue
      const f = known[i]
      if (!f) continue
      if (seen[f] !== undefined) { pair = [seen[f], i]; break }
      seen[f] = i
    }
    if (pair) {
      await tapCard(p, pair[0]); flips += 1
      await tapCard(p, pair[1]); flips += 1
      await settled()
      continue
    }
    const unknown = []
    for (let i = 0; i < total; i += 1) if (!state[i].matched && !known[i]) unknown.push(i)
    // a card already turned (a resumed round): it is the first of the pair
    const lone = state.findIndex((c) => c.up && !c.matched)
    if (lone >= 0) {
      known[lone] = await faceOf(p, lone)
      const mate = Object.keys(known).map(Number).find((i) => i !== lone && known[i] === known[lone] && !state[i].matched)
      if (mate !== undefined) { await tapCard(p, mate); flips += 1; await settled(); continue }
      const b2 = unknown.find((i) => i !== lone)
      await tapCard(p, b2); flips += 1
      known[b2] = await faceOf(p, b2)
      await settled()
      continue
    }
    const a = unknown[0]
    await tapCard(p, a); flips += 1
    known[a] = await faceOf(p, a)
    const partner = Object.keys(known).map(Number).find((i) => i !== a && known[i] === known[a] && !state[i].matched)
    if (partner !== undefined) {
      await tapCard(p, partner); flips += 1
      await settled()
      continue
    }
    const b = unknown[1]
    await tapCard(p, b); flips += 1
    known[b] = await faceOf(p, b)
    await settled()
  }
  return flips
}

async function signedIn(label, width, height) {
  const acc = await account()
  const p = await open(width, height, acc.session)
  const tag = `${label} ${width}x${height}`
  check(`${tag}: page shows 3 turns before playing`, /Còn 3\/3 lượt/.test(await text(p, '.mgp-turns')), await text(p, '.mgp-turns'))
  check(`${tag}: no horizontal scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await p.screenshot({ path: `${D}/minigame-page-${width}.png` })

  // pick: the hungry Pokémon is blocked and says why, the fed one is not
  await openSheet(p)
  await until(p, () => document.querySelectorAll('.mg-pick').length >= 2, null, 15000)
  const picks = await p.evaluate(() => [...document.querySelectorAll('.mg-pick')].map((b) => ({ disabled: b.disabled, why: b.querySelector('.mg-why')?.innerText ?? '' })))
  check(`${tag}: a hungry Pokémon is blocked with a reason`, picks.filter((x) => x.disabled).length === 1 && /đói/i.test(picks.find((x) => x.disabled)?.why ?? ''), JSON.stringify(picks))
  check(`${tag}: the fed Pokémon can be picked`, picks.filter((x) => !x.disabled).length === 1)
  await p.screenshot({ path: `${D}/minigame-pick-${width}.png` })
  await pickFirstEnabled(p)
  await until(p, () => /Dễ/.test(document.querySelector('.mg-body')?.innerText ?? ''))
  await p.screenshot({ path: `${D}/minigame-level-${width}.png` })
  await clickText(p, '.mg-pick', 'Dễ')
  await until(p, () => !!document.querySelector('.mg-count'))
  await p.screenshot({ path: `${D}/minigame-count-${width}.png` })
  await until(p, () => !!document.querySelector('.mg-board'), null, 20000)
  await wait(300)
  check(`${tag}: a round opened on the server`, sql(`select count(*) from public.minigame_rounds where user_id='${acc.user}' and status='open'`) === '1')
  check(`${tag}: a turn was spent`, sql(`select used from public.minigame_players where user_id='${acc.user}' and game='memory'`) === '1')
  const clock = await text(p, '.mg-time strong')
  const secs = (() => { const m = /(\d+):(\d+)/.exec(clock); return m ? Number(m[1]) * 60 + Number(m[2]) : -1 })()
  check(`${tag}: the 5 minute clock runs`, secs > 285 && secs <= 300, clock)
  await tapCard(p, 0); await wait(900)
  await p.screenshot({ path: `${D}/minigame-play-${width}.png` })
  const sizes = await p.evaluate(() => [...document.querySelectorAll('.mg-card')].map((c) => { const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }))
  check(`${tag}: every card has a tappable size`, sizes.length > 0 && sizes.every(([w, h]) => w >= 40 && h >= 52), JSON.stringify(sizes.slice(0, 3)))
  check(`${tag}: the turned card shows its face`, await p.evaluate(() => { const i = document.querySelector('.mg-card[data-up] .mg-face img'); return !!i && i.getBoundingClientRect().width > 20 }))
  check(`${tag}: no horizontal scroll while playing`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

  // closing mid-round asks first
  await p.evaluate(() => document.querySelector('.mg-x').click())
  await until(p, () => !!document.querySelector('.mg-confirm'))
  check(`${tag}: closing mid-round asks for confirmation`, /Thoát giữa ván/.test(await text(p, '.mg-confirm')))
  await p.screenshot({ path: `${D}/minigame-confirm-${width}.png` })
  await clickText(p, '.mg-confirm .mg-cta', 'Chơi tiếp')
  await until(p, () => !document.querySelector('.mg-confirm'))
  check(`${tag}: 'keep playing' keeps the board`, await p.evaluate(() => !!document.querySelector('.mg-board')))
  await p.evaluate(() => document.querySelector('.mg-x').click())
  await until(p, () => !!document.querySelector('.mg-confirm'))
  await clickText(p, '.mg-confirm .mg-cta', 'Thoát')
  await until(p, () => !document.querySelector('.mg-panel'), null, 8000)
  check(`${tag}: leaving closes the sheet`, true)
  check(`${tag}: the round is still open after leaving`, sql(`select count(*) from public.minigame_rounds where user_id='${acc.user}' and status='open'`) === '1')

  // reopen: the open round comes back
  await openSheet(p)
  await until(p, () => !!document.querySelector('.mg-board'), null, 15000)
  check(`${tag}: reopening shows the open round`, true)
  const flipsBefore = (await cardState(p)).filter((c) => c.up).length
  check(`${tag}: the card turned before leaving is still up`, flipsBefore >= 1, String(flipsBefore))

  // win it
  await solve(p)
  await until(p, () => !!document.querySelector('.mg-result'), null, 20000)
  await wait(900)
  const result = await text(p, '.mg-result')
  check(`${tag}: a won round says so`, /Chiến thắng/.test(result), result.split('\n')[0])
  check(`${tag}: the result shows exp`, /\+\d+ exp/.test(result), result.replace(/\n/g, ' | ').slice(0, 120))
  check(`${tag}: the result shows gifts`, (await p.$$('.mg-result .mg-chips .mg-chip')).length >= 1)
  check(`${tag}: the result shows the turns left`, /Còn 2\/3 lượt/.test(result))
  await p.screenshot({ path: `${D}/minigame-result-${width}.png` })
  check(`${tag}: the round is won in the database`, sql(`select status from public.minigame_rounds where user_id='${acc.user}' order by started_at desc limit 1`) === 'won')
  check(`${tag}: gifts landed in the bag`, Number(sql(`select coalesce(sum(count),0) from public.bag where user_id='${acc.user}'`)) > 0)

  // out of time: shorten the deadline of the next round
  sql(`update public.minigame_players set used = 2 where user_id='${acc.user}' and game='memory'`)
  await clickText(p, '.mg-result .mg-cta', 'Chơi tiếp')
  await startRound(p)
  sql(`update public.minigame_rounds set deadline = now() + interval '3 seconds' where user_id='${acc.user}' and status='open'`)
  await p.reload()
  await until(p, () => !!document.querySelector('.mgp-play'), null, 30000)
  await wait(400)
  await openSheet(p)
  await until(p, () => /Hết giờ rồi/.test(document.querySelector('.mg-result')?.innerText ?? ''), null, 30000)
  const lost = await text(p, '.mg-result')
  check(`${tag}: running out of time shows a loss`, /Hết giờ rồi/.test(lost))
  check(`${tag}: the loss says the pet is tired`, /mệt hơn/.test(lost), lost.replace(/\n/g, ' | ').slice(0, 140))
  check(`${tag}: out of turns shows the refill time, not an error`, /Hết lượt\. Lượt mới sau \d+/.test(lost), lost.replace(/\n/g, ' | ').slice(0, 160))
  check(`${tag}: no 'play again' once out of turns`, !(await p.evaluate(() => [...document.querySelectorAll('.mg-result .mg-cta')].some((b) => /Chơi tiếp/.test(b.innerText)))))
  await p.screenshot({ path: `${D}/minigame-lost-${width}.png` })
  check(`${tag}: the loss is stored`, sql(`select status from public.minigame_rounds where user_id='${acc.user}' order by started_at desc limit 1`) === 'lost')
  await clickText(p, '.mg-result .mg-cta', 'Xong')
  await until(p, () => !document.querySelector('.mg-panel'), null, 8000)
  await until(p, () => /Hết lượt, hồi sau/.test(document.querySelector('.mgp-turns')?.innerText ?? ''), null, 8000)
  check(`${tag}: the page shows when turns refill`, true, await text(p, '.mgp-turns'))
  await openSheet(p)
  await until(p, () => /Hết lượt/.test(document.querySelector('.mg-body')?.innerText ?? ''), null, 15000)
  check(`${tag}: no Pokémon can be picked without turns`, await p.evaluate(() => [...document.querySelectorAll('.mg-pick')].every((b) => b.disabled)))
  await p.screenshot({ path: `${D}/minigame-noturns-${width}.png` })
  await p.evaluate(() => document.querySelector('.mg-x').click())
  await until(p, () => !document.querySelector('.mg-panel'), null, 8000)

  // trainer card: avatar and team pickers open, show locks and reasons
  await p.evaluate(() => document.querySelector('.tr-face').click())
  await until(p, () => !!document.querySelector('.mg-panel'), null, 8000)
  await wait(500)
  check(`${tag}: the avatar picker opens`, (await text(p, '.mg-panel')).length > 20)
  await p.screenshot({ path: `${D}/minigame-avatar-${width}.png` })
  await p.evaluate(() => document.querySelector('.mg-x').click())
  await until(p, () => !document.querySelector('.mg-panel'), null, 8000)
  await clickText(p, '.tr-actions button', 'Đội hình')
  await until(p, () => !!document.querySelector('.mg-panel'), null, 8000)
  await wait(500)
  check(`${tag}: the team picker opens`, (await text(p, '.mg-panel')).length > 20)
  await p.screenshot({ path: `${D}/minigame-team-${width}.png` })
  await p.close()
}

async function guest(width, height) {
  const p = await open(width, height, null)
  const tag = `guest ${width}x${height}`
  await until(p, () => /chưa đăng nhập/.test(document.body.innerText), null, 15000)
  check(`${tag}: sees the list with a sign-in note`, true)
  await openSheet(p)
  await until(p, () => /Chơi thử: không mất lượt/.test(document.body.innerText), null, 10000)
  check(`${tag}: the sheet says practice, no turns, no rewards`, true)
  await startRound(p)
  await solve(p)
  await until(p, () => !!document.querySelector('.mg-result'), null, 20000)
  await wait(500)
  const result = await text(p, '.mg-result')
  check(`${tag}: practice can be won`, /Chiến thắng/.test(result))
  check(`${tag}: practice gives no exp, gifts or turns`, !/\+\d+ exp/.test(result) && !(await p.$('.mg-result .mg-chip')) && !/lượt/.test(result), result.replace(/\n/g, ' | ').slice(0, 140))
  check(`${tag}: practice nudges to sign in`, /Đăng nhập/.test(result))
  await p.screenshot({ path: `${D}/minigame-guest-${width}.png` })
  await p.close()
}

try {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    await signedIn('player', w, h)
    await guest(w, h)
  }
  const real = errors.filter((e) => !/favicon|manifest|google|gtag|analytics/i.test(e))
  check('no page or console errors', real.length === 0, real.slice(0, 3).join(' || '))
} catch (e) {
  check('script ran to the end', false, e.message)
  console.log(e.stack)
} finally {
  await browser.close()
}
console.log(failed ? `${failed} FAILED` : 'ALL PASS')
process.exit(failed ? 1 : 0)
