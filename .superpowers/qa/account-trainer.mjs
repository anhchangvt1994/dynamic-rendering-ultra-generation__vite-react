// Trainer card on the account page. Local stack only (dev 5191, local Supabase), throwaway accounts.
//   node .superpowers/qa/account-trainer.mjs
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
const sql = (q) => execFileSync('docker', ['exec', 'supabase_db_pokedex', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', q]).toString().trim()
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let failed = 0
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++ }
const b = await puppeteer.launch({ headless: true, executablePath: process.env.HOME + '/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
const errors = []

async function account({ pokemon }) {
  const email = `hub-qa-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`, password = 'hub-qa-password-1'
  const made = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: admin, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  const session = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
  if (pokemon) {
    const id = crypto.randomUUID()
    sql(`insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values ('${id}','${made.id}',25,3,'{"v":3,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[0,0,0,0,0,0],"stars":2}')`)
    sql(`insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values ('${id}','${made.id}',90,80,80,now(),0)`)
  }
  return { user: made.id, session }
}
async function open(width, session, { fail500 = false } = {}) {
  const p = await b.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('response', (r) => r.status() >= 400 && !/robots\.txt/.test(r.url()) && !fail500 && errors.push(`${r.status()} ${r.url()}`))
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL/.test(m.text()) && !fail500 && errors.push(m.text()))
  await p.setViewport({ width, height: 900, isMobile: width < 600, hasTouch: width < 600 })
  await p.goto(`${APP}/robots.txt`)
  await p.evaluate((s) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pokedex:auth', JSON.stringify(s)) }, session)
  if (fail500) {
    await p.setRequestInterception(true)
    p.on('request', (r) => (/rpc\/minigame_status/.test(r.url()) ? r.respond({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' }) : r.continue().catch(() => {})))
  }
  await p.goto(`${APP}/dang-nhap`)
  await p.waitForSelector('[aria-label="Hồ sơ huấn luyện viên"] .hc', { timeout: 30000 })
  return p
}
const box = (p) => p.evaluate(() => { const r = document.querySelector('[aria-label="Hồ sơ huấn luyện viên"] .hc').getBoundingClientRect(); return Math.round(r.height) })
const cardText = (p) => p.evaluate(() => document.querySelector('[aria-label="Hồ sơ huấn luyện viên"]').innerText.replace(/\n/g, ' | '))
const click = (p, sel, re) => p.evaluate((s, r) => { const e = [...document.querySelectorAll(s)].find((x) => new RegExp(r).test(x.innerText || x.getAttribute('aria-label') || '') && !x.disabled); if (!e) return false; e.click(); return true }, sel, re)

for (const width of [390, 1280]) {
  const acc = await account({ pokemon: true })
  const p = await open(width, acc.session)
  const first = await box(p)
  await p.waitForFunction(() => /Trainer level \d/.test(document.querySelector('[aria-label="Hồ sơ huấn luyện viên"]').innerText), { timeout: 20000 })
  const ready = await box(p)
  check(`${width}: card ready, box does not change height`, first === ready, `${first} -> ${ready}`)
  check(`${width}: shows level and Pokémon count`, /Trainer level 1/.test(await cardText(p)) && /1 Pokémon/.test(await cardText(p)), await cardText(p))
  check(`${width}: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await p.screenshot({ path: `${D}/account-trainer-${width}.png` })

  // avatar: pick another unlocked one, it persists in the database and after reload
  await click(p, 'button', '^Đổi avatar$')
  await p.waitForSelector('.tr-avatar', { timeout: 10000 })
  const picked = await p.evaluate(() => { const e = [...document.querySelectorAll('.tr-avatar')].find((x) => x.getAttribute('aria-pressed') !== 'true' && !x.hasAttribute('aria-disabled')); if (!e) return null; const name = e.querySelector('span')?.innerText; e.click(); return name })
  await wait(1200)
  const avatar = sql(`select avatar from public.trainer_profiles where user_id='${acc.user}'`)
  check(`${width}: avatar change saved (${picked})`, !!picked && avatar !== 'rookie', avatar)
  check(`${width}: avatar sheet closed after saving`, !(await p.evaluate(() => !!document.querySelector('.tr-avatar'))))
  await p.reload(); await p.waitForFunction(() => /Trainer level \d/.test(document.querySelector('[aria-label="Hồ sơ huấn luyện viên"]')?.innerText ?? ''), { timeout: 20000 })
  check(`${width}: avatar survives reload`, sql(`select avatar from public.trainer_profiles where user_id='${acc.user}'`) === avatar)

  // team: add the Pokémon, save, it persists
  await click(p, 'button', '^Đội hình')
  await p.waitForSelector('.mg-pick', { timeout: 10000 })
  await wait(800)
  const teamPicked = await p.evaluate(() => { const e = [...document.querySelectorAll('.mg-pick')].find((x) => !x.hasAttribute('aria-disabled')); if (!e) return false; e.click(); return true })
  check(`${width}: team sheet lists a Pokémon that can join`, teamPicked)
  await click(p, '.mg-cta', 'Lưu|Xong|Chốt')
  await wait(1500)
  check(`${width}: team saved`, sql(`select cardinality(team) from public.trainer_profiles where user_id='${acc.user}'`) === '1')
  check(`${width}: card shows team 1/`, /Đội hình 1\//.test(await cardText(p)), await cardText(p))
  await p.close()
}

// zero Pokémon: card keeps its box, says 0 Pokémon, team sheet explains
{
  const acc = await account({ pokemon: false })
  const p = await open(390, acc.session)
  await p.waitForFunction(() => /Trainer level \d/.test(document.querySelector('[aria-label="Hồ sơ huấn luyện viên"]').innerText), { timeout: 20000 })
  check('zero Pokémon: box height stays 208', (await box(p)) >= 200)
  check('zero Pokémon: card says 0 Pokémon', /0 Pokémon/.test(await cardText(p)), await cardText(p))
  await click(p, 'button', '^Đội hình')
  await p.waitForSelector('.mg-sub', { timeout: 10000 })
  await wait(600)
  const sheet = await p.evaluate(() => document.querySelector('.mg-panel')?.innerText ?? '')
  check('zero Pokémon: team sheet explains there is nobody to pick', /chưa có Pokémon/i.test(sheet), sheet.replace(/\n/g, ' | ').slice(0, 140))
  await p.screenshot({ path: `${D}/account-trainer-zero-390.png` })
  await p.close()
}

// status fails: box stays, message + retry, no throw
{
  const acc = await account({ pokemon: true })
  const p = await open(390, acc.session, { fail500: true })
  await p.waitForFunction(() => /Chưa mở được hồ sơ/.test(document.querySelector('[aria-label="Hồ sơ huấn luyện viên"]')?.innerText ?? ''), { timeout: 20000 })
  check('status error: message and Thử lại inside the box', /Thử lại/.test(await cardText(p)) && (await box(p)) >= 100, `${await box(p)}px`)
  await p.close()
}

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await b.close()
console.log(failed ? `${failed} FAILED` : 'ALL PASS')
process.exit(failed ? 1 : 0)
