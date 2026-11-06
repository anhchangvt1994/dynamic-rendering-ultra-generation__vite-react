// Who's That Pokémon? a chest won and not opened survives a reload.
//   node scripts/browser/quiz-chest-reload.mjs
// LOCAL=http://localhost:5190 (dev, local mode), SERVER=http://localhost:5191
// (Supabase signed in; skipped when empty or Supabase is down),
// SHOTS=.superpowers/qa/shots/chest-reload. Server users are disposable.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer'

const LOCAL = process.env.LOCAL || 'http://localhost:5190'
const SERVER = process.env.SERVER ?? 'http://localhost:5191'
const SHOTS = process.env.SHOTS || '.superpowers/qa/shots/chest-reload'
mkdirSync(SHOTS, { recursive: true })

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${name}${pass || !detail ? '' : ` — ${detail}`}`
  )
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const errors = []

async function open(path, { origin = LOCAL, storage = {} } = {}) {
  const page = await browser.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewport({ width: 420, height: 900 })
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ])
  await page.goto(`${origin}/robots.txt`)
  await page.evaluate((storage) => {
    localStorage.clear()
    localStorage.setItem('pokedex:quiz-coached', '1')
    localStorage.setItem('pokedex:quiz-time-coached', '1')
    for (const [k, v] of Object.entries(storage))
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
  }, storage)
  await page.goto(`${origin}${path}`, { waitUntil: 'networkidle2' })
  return page
}
const shot = (page, name) =>
  page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
const start = async (page) => {
  await page.waitForSelector('.ready-screen .next:not([disabled])', {
    timeout: 20000,
  })
  await page.click('.ready-screen .next')
  await page.waitForSelector('.stage[data-veiled]', { timeout: 20000 })
}
const answerRight = async (page, index) => {
  await page.waitForSelector('.stage[data-veiled]', { timeout: 20000 })
  await page.keyboard.press(String(index + 1))
  await page.waitForSelector('.verdict .catch', { timeout: 10000 })
}
/** what the ready screen offers after a reload */
const readyButton = async (page) => {
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('.ready-screen .next:not([disabled])', {
    timeout: 20000,
  })
  return page.$eval('.ready-screen .next', (b) => ({
    text: b.textContent,
    chest: b.getAttribute('data-chest'),
  }))
}
const crack = async (page) => {
  await page.waitForSelector('dialog[open] .orb', { timeout: 5000 })
  await page.click('dialog[open] .orb')
  await page.waitForSelector('dialog[open][data-phase="open"]', {
    timeout: 5000,
  })
}
const collect = (page) => page.click('dialog[open] .collect')
/** both chests opened from the ready screen, back to back */
const openBoth = async (page) => {
  await page.click('.ready-screen .next[data-chest]')
  await crack(page)
  await collect(page)
  await crack(page)
  await collect(page)
  await page.waitForFunction(() => !document.querySelector('dialog[open]'))
}

// ── local mode ─────────────────────────────────────────────────────────
const LOCAL_BASE = {
  'pokedex:quiz-mode': 'local',
  'pokedex:caught': '[]',
  'pokedex:quiz-streak': 4,
  'pokedex:quiz-records': 9,
}
{
  const page = await open('/whos-that-pokemon', { storage: LOCAL_BASE })
  await start(page)
  const index = await page.evaluate(() => {
    const round = JSON.parse(localStorage.getItem('pokedex:quiz-round'))
    return round.options.indexOf(round.answerId)
  })
  await answerRight(page, index)
  const bag = await page.evaluate(() => localStorage.getItem('pokedex:bag'))
  const before = await readyButton(page)
  check(
    'local: reload before opening keeps "Mở 2 quà"',
    before.text.includes('Mở 2 quà') && before.chest === 'special',
    JSON.stringify(before)
  )
  await shot(page, 'local-ready-chest')
  // a reload with the dialog open (one chest seen) still keeps both
  await page.click('.ready-screen .next[data-chest]')
  await crack(page)
  const mid = await readyButton(page)
  check(
    'local: reload mid-opening keeps the chests',
    mid.text.includes('Mở 2 quà'),
    JSON.stringify(mid)
  )
  await openBoth(page)
  const ready = await page
    .waitForFunction(
      () =>
        document.querySelector('.ready-screen .next')?.textContent ===
        'Sẵn sàng',
      { timeout: 3000 }
    )
    .then(() => 'Sẵn sàng')
    .catch(() =>
      page.$eval('.ready-screen .next', (b) => b.textContent)
    )
  check(
    'local: opened, the ready screen offers "Sẵn sàng"',
    ready === 'Sẵn sàng',
    ready
  )
  const after = await readyButton(page)
  check(
    'local: opened chests stay gone after a reload',
    after.text === 'Sẵn sàng' && !after.chest,
    JSON.stringify(after)
  )
  check(
    'local: opening after a reload pays nothing twice',
    (await page.evaluate(() => localStorage.getItem('pokedex:bag'))) === bag
  )
  await page.close()
}

// the last turn won a chest: the chest is still offered before the rest
{
  const page = await open('/whos-that-pokemon', {
    storage: {
      ...LOCAL_BASE,
      'pokedex:quiz-records': 0,
      'pokedex:quiz-turns': { start: Date.now() - 60_000, used: 9, bonus: 0 },
    },
  })
  await start(page)
  const index = await page.evaluate(() => {
    const round = JSON.parse(localStorage.getItem('pokedex:quiz-round'))
    return round.options.indexOf(round.answerId)
  })
  await answerRight(page, index)
  const offered = await readyButton(page)
  check(
    'local: out of turns, the chest is offered first',
    offered.text.includes('Mở quà') && offered.chest === 'combo',
    JSON.stringify(offered)
  )
  await page.click('.ready-screen .next[data-chest]')
  await crack(page)
  await collect(page)
  await page.waitForFunction(() => !document.querySelector('dialog[open]'))
  await wait(300)
  check(
    'local: opened, out of turns rests',
    !(await page.$('.ready-screen')),
    'ready screen still up'
  )
  await page.close()
}

// ── server mode ────────────────────────────────────────────────────────
async function serverRun() {
  let status
  try {
    status = JSON.parse(
      execFileSync('yarn', ['-s', 'supabase', 'status', '-o', 'json'], {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .replace(/^[^{]*/, '')
    )
  } catch {
    console.log('SKIP server: Supabase is not running')
    return
  }
  const sql = (q) =>
    execFileSync('docker', [
      '--context',
      'colima-supabase',
      'exec',
      'supabase_db_pokedex',
      'psql',
      '-U',
      'postgres',
      '-tAc',
      q,
    ])
      .toString()
      .trim()
  const admin = {
    apikey: status.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
  const anon = status.PUBLISHABLE_KEY || status.ANON_KEY
  const made = []
  try {
    const email = `chest-e2e-${Date.now()}@example.com`
    const password = 'chest-e2e-password-1'
    const u = await (
      await fetch(`${status.API_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: admin,
        body: JSON.stringify({ email, password, email_confirm: true }),
      })
    ).json()
    made.push(u.id)
    const session = await (
      await fetch(`${status.API_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    ).json()
    sql(
      `insert into public.quiz_players(user_id,window_start,used,streak,records) values ('${u.id}',now(),0,4,9)`
    )
    const page = await open('/whos-that-pokemon', {
      origin: SERVER,
      storage: { 'pokedex:auth': session },
    })
    await start(page)
    const [answer, options] = sql(
      `select answer_id, array_to_string(options, ',') from public.quiz_rounds where user_id='${u.id}' and answered_at is null`
    ).split('|')
    await answerRight(page, options.split(',').indexOf(answer))
    const bag = () =>
      sql(
        `select coalesce(sum(count),0) from public.bag where user_id='${u.id}'`
      )
    const paid = bag()
    const before = await readyButton(page)
    check(
      'server: reload before opening keeps "Mở 2 quà"',
      before.text.includes('Mở 2 quà') && before.chest === 'special',
      JSON.stringify(before)
    )
    await shot(page, 'server-ready-chest')
    await openBoth(page)
    await wait(500)
    check(
      'server: opened chests leave the account list',
      sql(
        `select count(*) from public.quiz_unopened_chests where user_id='${u.id}'`
      ) === '0'
    )
    const after = await readyButton(page)
    check(
      'server: opened chests stay gone after a reload',
      after.text === 'Sẵn sàng' && !after.chest,
      JSON.stringify(after)
    )
    check('server: opening pays no item twice', bag() === paid, bag())
    check(
      'server: both chest shard receipts settled after the reload',
      sql(
        `select string_agg(state, ',' order by kind) from public.quiz_chest_shard_events where user_id='${u.id}'`
      ) === 'awarded,awarded'
    )
    await page.close()
  } finally {
    for (const id of made) sql(`delete from auth.users where id='${id}'`)
    const left = sql(
      `select count(*) from auth.users where email like 'chest-e2e-%'`
    )
    check('server: disposable users removed', left === '0', left)
  }
}
if (SERVER) await serverRun()

await browser.close()
const failed = results.filter((r) => !r.pass)
if (errors.length) console.log('PAGE ERRORS', errors)
console.log(`${results.length - failed.length}/${results.length} PASS`)
process.exitCode = failed.length || errors.length ? 1 : 0
