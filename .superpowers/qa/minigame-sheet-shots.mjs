// Screenshots of the play sheet phases (pick, level, count, play, confirm). Local only.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from '/Users/jupiter/Documents/development/vite-react-seo-project/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js'
const ROOT = '/Users/jupiter/Documents/development/vite-react-seo-project'
const D = `${ROOT}/.superpowers/qa/shots`; mkdirSync(D, { recursive: true })
const APP = process.env.APP || 'http://localhost:5191'
const st = JSON.parse(execFileSync(`${ROOT}/node_modules/.bin/supabase`, ['status', '-o', 'json'], { cwd: ROOT }).toString().replace(/^[^{]*/, ''))
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(st.API_URL)) throw new Error('local only')
const session = await (await fetch(`${st.API_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: st.PUBLISHABLE_KEY || st.ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'abc@gmail.com', password: 'abc12345' }) })).json()
const b = await puppeteer.launch({ headless: true, executablePath: process.env.HOME + '/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
const psql = (q) => execFileSync('docker', ['--context', 'colima-supabase', 'exec', 'supabase_db_pokedex', 'psql', '-U', 'postgres', '-tAc', q]).toString().trim()
const clearOpen = () => { psql("update minigame_players set used=0 where user_id=(select id from auth.users where email='abc@gmail.com')"); psql("delete from minigame_rounds where user_id=(select id from auth.users where email='abc@gmail.com')") }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const VIEWS = (process.env.VIEWS || '320x568,390x844,1280x800,640x360').split(',')
const GAME = process.env.GAME || 'Candy Rush'
for (const v of VIEWS) {
  const [w, h] = v.split('x').map(Number)
  clearOpen()
  const p = await b.newPage()
  await p.setViewport({ width: w, height: h, isMobile: w < 600, hasTouch: w < 600 })
  await p.goto(`${APP}/robots.txt`)
  await p.evaluate((s) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pokedex:auth', JSON.stringify(s)) }, session)
  await p.goto(`${APP}/mini-game`)
  await p.waitForSelector('[data-region="booth"] .mgp-play', { timeout: 30000 })
  await wait(1500)
  const shot = (n) => p.screenshot({ path: `${D}/sheet-${w}x${h}-${n}.png` })
  await p.evaluate((g) => [...document.querySelectorAll('[data-region="booth"]')].find((c) => c.innerText.includes(g)).querySelector('.mgp-play').click(), GAME)
  await wait(900); await shot('1-pick')
  const until = (fn, t = 20000) => p.waitForFunction(fn, { timeout: t })
  await until(() => [...document.querySelectorAll('.mg-pick')].some((x) => !x.disabled))
  await p.evaluate(() => [...document.querySelectorAll('.mg-pick')].find((x) => !x.disabled).click())
  await until(() => /Dễ/.test(document.querySelector('.mg-body')?.innerText ?? '')); await wait(500); await shot('2-level')
  await p.evaluate(() => [...document.querySelectorAll('.mg-pick')].find((x) => /Dễ/.test(x.innerText) && !x.disabled).click())
  await wait(350); await shot('3-count')
  await until(() => !!document.querySelector('.mg-candy-grid')); await wait(900); await shot('4-play')
  await p.evaluate(() => document.querySelector('.mg-x, .mg-close, [aria-label*="Đóng"]')?.click()); await wait(500); await shot('5-confirm')
  await p.close()
}
await b.close()
console.log('done')
