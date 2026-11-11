// Screenshots of /mini-game at 320..1440, signed in as the local seed account. Local only.
//   node .superpowers/qa/minigame-shots.mjs <prefix> [extra-selector-to-click-text]
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
const prefix = process.argv[2] || 'now'
const b = await puppeteer.launch({ headless: true, executablePath: process.env.HOME + '/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1280, 800], [1440, 900]]) {
  const p = await b.newPage()
  await p.setViewport({ width: w, height: h, isMobile: w < 600, hasTouch: w < 600 })
  await p.goto(`${APP}/robots.txt`)
  await p.evaluate((s) => { localStorage.clear(); localStorage.setItem('pokedex:auth', JSON.stringify(s)) }, session)
  await p.goto(`${APP}/mini-game`)
  await p.waitForSelector('.mgp-play', { timeout: 30000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 1200))
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  await p.screenshot({ path: `${D}/${prefix}-${w}.png`, fullPage: true })
  console.log(w, 'overflowX', over)
  await p.close()
}
await b.close()
