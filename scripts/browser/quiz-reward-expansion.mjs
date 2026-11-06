// Who's That Pokémon? rewards: 10 turns per window, the chests' amber shards.
//   node scripts/browser/quiz-reward-expansion.mjs
// LOCAL=http://localhost:5190 (dev, local mode), SERVER=http://localhost:5191
// (Supabase signed in; skipped when empty or Supabase is down),
// SHOTS=.superpowers/qa/shots/chest. Server users are disposable and removed.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer'

const LOCAL = process.env.LOCAL || 'http://localhost:5190'
const SERVER = process.env.SERVER ?? 'http://localhost:5191'
const SHOTS = process.env.SHOTS || '.superpowers/qa/shots/chest'
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

// three pieces with the same rolls: N from countRoll, group and species fixed
const entropy = (countRoll, pieces) => ({
  countRoll,
  pieces: pieces.map(([groupRoll, speciesRoll]) => ({
    groupRoll,
    speciesRoll,
  })),
})
const NONE = entropy(0, [
  [0, 0],
  [0, 0],
  [0, 0],
])
const THREE_RARE = entropy(0.9, [
  [0.1, 0.05],
  [0.2, 0.5],
  [0.3, 0.95],
])
const SAME = entropy(0.9, [
  [0.1, 0.3],
  [0.1, 0.3],
  [0.1, 0.3],
])

async function open(
  path,
  {
    width = 420,
    height = 900,
    reduced = true,
    origin = LOCAL,
    storage = {},
  } = {}
) {
  const page = await browser.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewport({ width, height })
  if (reduced)
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
const overflow = (page) =>
  page.evaluate(() => {
    const out = []
    if (document.documentElement.scrollWidth > innerWidth + 1)
      out.push(`page ${document.documentElement.scrollWidth}>${innerWidth}`)
    const dialog = document.querySelector('dialog[open]')
    if (dialog && dialog.scrollWidth > dialog.clientWidth + 1)
      out.push(`dialog ${dialog.scrollWidth}>${dialog.clientWidth}`)
    // decorative light (rays, ring) is clipped by the dialog on purpose
    for (const el of document.querySelectorAll('dialog[open] *')) {
      if (el.closest('[aria-hidden="true"]')) continue
      const r = el.getBoundingClientRect()
      if (r.width && (r.right > innerWidth + 1 || r.left < -1))
        out.push(
          `${el.tagName}.${el.className}|${Math.round(r.left)}..${Math.round(r.right)}`
        )
    }
    return out.slice(0, 4)
  })
/** Press "Sẵn sàng": one turn is spent and the veiled round starts. */
const start = async (page) => {
  await page.waitForSelector('.ready-screen .next:not([disabled])', {
    timeout: 20000,
  })
  await page.click('.ready-screen .next')
  await page.waitForSelector('.stage[data-veiled]', { timeout: 20000 })
}
const turnsText = async (page) => {
  await page.click('.meter[data-kind="turns"]')
  const text = await page.$eval('.trainer-hint', (e) => e.textContent)
  await page.click('.meter[data-kind="turns"]')
  return text
}
/** Answer right with the keyboard; `before` runs between the answer and the verdict wait. */
async function answerRight(page, index) {
  await page.waitForSelector('.stage[data-veiled]', { timeout: 20000 })
  await page.keyboard.press(String(index + 1))
  await page.waitForSelector('.verdict .catch', { timeout: 10000 })
}
const openChest = async (page) => {
  await page.waitForSelector('.next[data-chest]', { timeout: 10000 })
  await page.click('.next[data-chest]')
  await page.waitForSelector('dialog[open] .orb', { timeout: 5000 })
  await page.click('dialog[open] .orb')
  await page.waitForSelector('dialog[open][data-phase="open"]', {
    timeout: 5000,
  })
}
const shardState = (page) =>
  page
    .waitForFunction(
      () => {
        const s = document.querySelector('dialog[open] .chest-shards')
        if (!s) return null
        if (s.querySelector('[role="alert"]')) return 'error'
        if (s.querySelector('li')) return 'shards'
        if (s.textContent.includes('không có mảnh')) return 'empty'
        return null
      },
      { timeout: 10000 }
    )
    .then((h) => h.jsonValue())
const shardRows = (page) =>
  page.$$eval('dialog[open] .chest-shards li', (lis) =>
    lis.map((li) => ({
      who: li.querySelector('.who')?.textContent,
      many: li.querySelector('.many')?.textContent,
      rare: li.hasAttribute('data-rare'),
    }))
  )
const giftCount = (page) =>
  page.$$eval('dialog[open] .cards li', (l) => l.length)
const nextChest = (page) =>
  page.evaluate(() => {
    const b = document.querySelector('dialog[open] .collect')
    const more = b.textContent.includes('Còn một')
    b.click()
    return more
  })

// ── local mode ─────────────────────────────────────────────────────────
const LOCAL_BASE = { 'pokedex:quiz-mode': 'local', 'pokedex:caught': '[]' }
const localSnapshot = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('pokedex:quiz-shards-v1'))
  )
const sum = (o = {}) => Object.values(o).reduce((a, b) => a + b, 0)
// the answer's own shard may drop too (v2 rule): counted apart from chests
const answerShards = (snap) =>
  Object.values(snap.events ?? {}).filter((e) => e.state === 'awarded').length
const chestShards = (snap) =>
  Object.values(snap.chestEvents ?? {}).reduce(
    (n, e) => n + e.shards.reduce((m, r) => m + r.count, 0),
    0
  )
/** Start a round, pin its chest entropy, answer right. */
async function localChest(page, combo, special) {
  await start(page)
  const index = await page.evaluate(
    (combo, special) => {
      const round = JSON.parse(localStorage.getItem('pokedex:quiz-round'))
      round.chestEntropy = [combo, special]
      localStorage.setItem('pokedex:quiz-round', JSON.stringify(round))
      return round.options.indexOf(round.answerId)
    },
    combo,
    special
  )
  await answerRight(page, index)
}

{
  const fresh = await open('/whos-that-pokemon', { storage: LOCAL_BASE })
  await start(fresh)
  const text = await turnsText(fresh)
  check(
    'local: a fresh window of 10, one spent, shows 9/10',
    /9\/10/.test(text),
    text
  )
  await fresh.close()

  const used = await open('/whos-that-pokemon', {
    storage: {
      ...LOCAL_BASE,
      'pokedex:quiz-turns': { start: Date.now() - 60_000, used: 4, bonus: 0 },
    },
  })
  await start(used)
  const usedText = await turnsText(used)
  check(
    'local: 4 used then one more leaves 5/10',
    /5\/10/.test(usedText),
    usedText
  )
  await used.close()
}

// combo N=0 then special N=3 distinct rare, opened back to back
{
  const page = await open('/whos-that-pokemon', {
    storage: {
      ...LOCAL_BASE,
      'pokedex:quiz-streak': 4,
      'pokedex:quiz-records': 9,
    },
  })
  await localChest(page, NONE, THREE_RARE)
  const label = await page.$eval('.next[data-chest]', (b) => b.textContent)
  check(
    'local: two chests at once offer "Mở 2 quà"',
    label.includes('Mở 2 quà'),
    label
  )
  await openChest(page)
  check(
    'local combo: N=0 reads as an empty draw',
    (await shardState(page)) === 'empty'
  )
  const comboGifts = await giftCount(page)
  check(
    'local combo: item gifts still shown (3–5)',
    comboGifts >= 3 && comboGifts <= 5,
    `${comboGifts}`
  )
  await shot(page, 'local-combo-empty-420')
  check(
    'local: "Còn một quả nữa" moves to the special chest',
    await nextChest(page)
  )
  await page.waitForSelector('dialog[open] .orb')
  await page.click('dialog[open] .orb')
  await page.waitForSelector('dialog[open][data-phase="open"]')
  check('local special: shards shown', (await shardState(page)) === 'shards')
  const rows = await shardRows(page)
  check(
    'local special: N=3, three distinct rare species ×1',
    rows.length === 3 &&
      new Set(rows.map((r) => r.who)).size === 3 &&
      rows.every((r) => r.rare && r.many === '×1 mảnh'),
    JSON.stringify(rows)
  )
  check(
    'local special: names are labels, not raw slugs',
    rows.every((r) => /^[A-Z]/.test(r.who ?? '')),
    JSON.stringify(rows)
  )
  check(
    'local special: 10 item gifts still shown',
    (await giftCount(page)) === 10
  )
  const snap = await localSnapshot(page)
  check(
    'local: both receipts awarded, balance +3',
    Object.values(snap.chestEvents)
      .map((e) => e.state)
      .join() === 'awarded,awarded' &&
      chestShards(snap) === 3 &&
      sum(snap.balances) === 3 + answerShards(snap),
    JSON.stringify(snap.balances)
  )
  // keyboard: Tab reaches the collect button and focus never falls to body
  let lost = false
  let reached = false
  for (let i = 0; i < 20 && !reached; i++) {
    await page.keyboard.press('Tab')
    const at = await page.evaluate(
      () => document.activeElement?.className ?? 'body'
    )
    if (at === 'body' || at === '') lost = true
    if (String(at).includes('collect')) reached = true
  }
  check('local: Tab walks the open chest to its button', reached && !lost)
  const anim = await page.$eval(
    'dialog[open] .chest-shards',
    (e) => getComputedStyle(e).animationName
  )
  check('local: reduced motion stills the shard strip', anim === 'none', anim)
  for (const width of [320, 420, 1280]) {
    await page.setViewport({ width, height: 900 })
    await wait(250)
    const over = await overflow(page)
    check(
      `local special: no overflow at ${width}px`,
      !over.length,
      over.join(' ; ')
    )
    await shot(page, `local-special-${width}`)
  }
  await nextChest(page)
  await page.waitForFunction(() => !document.querySelector('dialog[open]'))
  // reload: the reconcile on the quiz and in the bag never awards twice
  await page.reload({ waitUntil: 'networkidle2' })
  await wait(800)
  await page.goto(`${LOCAL}/tui-do`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('.pockets', { timeout: 15000 })
  await wait(800)
  const after = await localSnapshot(page)
  const expected = 3 + answerShards(after)
  check(
    'local: reload and bag leave the balance unchanged',
    sum(after.balances) === expected && chestShards(after) === 3,
    JSON.stringify(after.balances)
  )
  const tag = await page.$eval('.pockets .tag:last-child', (b) =>
    b.getAttribute('aria-label')
  )
  check(
    'local bag: the shard pocket counts every shard',
    (tag ?? '').endsWith(`, ${expected}`),
    tag
  )
  await page.close()
}

// the same species three times aggregates into one tile
{
  const page = await open('/whos-that-pokemon', {
    storage: {
      ...LOCAL_BASE,
      'pokedex:quiz-streak': 4,
      'pokedex:quiz-records': 0,
    },
  })
  await localChest(page, SAME, NONE)
  await openChest(page)
  await shardState(page)
  const rows = await shardRows(page)
  check(
    'local combo: same species ×3 is one tile',
    rows.length === 1 && rows[0].many === '×3 mảnh',
    JSON.stringify(rows)
  )
  await shot(page, 'local-combo-same-320')
  await page.close()
}

// a pending local receipt (no catalog) is settled by the bag's reconcile
{
  const page = await open('/tui-do', {
    storage: {
      ...LOCAL_BASE,
      'pokedex:quiz-shards-v1': {
        version: 1,
        events: {},
        balances: {},
        chestEvents: {
          'local-1-25:combo': {
            roundId: 'local-1-25',
            kind: 'combo',
            entropy: SAME,
            state: 'pending',
            shards: [],
          },
        },
      },
    },
  })
  await page.waitForSelector('.pockets', { timeout: 15000 })
  await wait(1200)
  const snap = await localSnapshot(page)
  check(
    'local bag: a pending chest receipt is reconciled once',
    snap.chestEvents?.['local-1-25:combo']?.state === 'awarded' &&
      sum(snap.balances) === 3,
    JSON.stringify(snap.balances)
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
  const user = async () => {
    const email = `chest-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
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
    return { id: u.id, session }
  }
  // chest shards = balance minus the answers' own drops
  const total = (id) =>
    Number(
      sql(
        `select coalesce(sum(count),0) from public.pokemon_shards where user_id='${id}'`
      )
    ) -
    Number(
      sql(
        `select count(*) from public.quiz_shard_events where user_id='${id}' and state='awarded'`
      )
    )
  const serverAnswer = async (page, id) => {
    if (!(await page.$('.stage[data-veiled]'))) await start(page)
    const [answer, options] = sql(
      `select answer_id, array_to_string(options, ',') from public.quiz_rounds where user_id='${id}' and answered_at is null order by started_at desc limit 1`
    ).split('|')
    await answerRight(page, options.split(',').indexOf(answer))
  }
  try {
    // windows: fresh is 10, a window with 3 used shows 7
    const a = await user()
    sql(
      `insert into public.quiz_players(user_id,window_start,used,streak,records) values ('${a.id}',now(),3,4,9) on conflict (user_id) do update set window_start=now(),used=3,streak=4,records=9`
    )
    const page = await open('/whos-that-pokemon', {
      origin: SERVER,
      storage: { 'pokedex:auth': a.session },
    })
    await start(page)
    const t = await turnsText(page)
    check('server: 3 used then one more leaves 6/10', /6\/10/.test(t), t)
    await serverAnswer(page, a.id)
    const rows = sql(
      `select kind from public.quiz_chest_shard_events where user_id='${a.id}' order by kind`
    )
    check(
      'server: a combo+special answer writes two entitlements',
      rows === 'combo\nspecial',
      rows
    )
    sql(
      `update public.quiz_chest_shard_events set entropy='${JSON.stringify(NONE)}' where user_id='${a.id}' and kind='combo'`
    )
    sql(
      `update public.quiz_chest_shard_events set entropy='${JSON.stringify(THREE_RARE)}' where user_id='${a.id}' and kind='special'`
    )
    // the first claim fails in flight: the error and its retry
    await page.setRequestInterception(true)
    let block = true
    page.on('request', (r) =>
      block && r.url().includes('quiz_claim_chest_shards')
        ? r.abort()
        : r.continue()
    )
    await openChest(page)
    check(
      'server combo: a failed claim shows its error',
      (await shardState(page)) === 'error'
    )
    const retry = await page.$('dialog[open] .chest-shards button')
    check('server combo: the error offers "Thử lại"', !!retry)
    await shot(page, 'server-combo-error-420')
    block = false
    await retry.click()
    check(
      'server combo: retry settles N=0 as empty',
      (await shardState(page)) === 'empty'
    )
    check('server combo: item gifts still shown', (await giftCount(page)) >= 3)
    await nextChest(page)
    await page.waitForSelector('dialog[open] .orb')
    await page.click('dialog[open] .orb')
    await page.waitForSelector('dialog[open][data-phase="open"]')
    await shardState(page)
    const srows = await shardRows(page)
    check(
      'server special: three distinct rare species, same as SQL',
      srows.length === 3 && srows.every((r) => r.rare) && total(a.id) === 3,
      `${JSON.stringify(srows)} total=${total(a.id)}`
    )
    await shot(page, 'server-special-420')
    await page.setViewport({ width: 320, height: 800 })
    await wait(250)
    const over = await overflow(page)
    check(
      'server special: no overflow at 320px',
      !over.length,
      over.join(' ; ')
    )
    await shot(page, 'server-special-320')
    await nextChest(page)
    await page.reload({ waitUntil: 'networkidle2' })
    await wait(800)
    await page.goto(`${SERVER}/tui-do`, { waitUntil: 'networkidle2' })
    await wait(1200)
    check(
      'server: reload and bag keep the chest shards at 3',
      total(a.id) === 3,
      `${total(a.id)}`
    )

    // account switch: another account's open chest never shows these shards
    const b = await user()
    sql(
      `insert into public.quiz_players(user_id,window_start,used,streak,records) values ('${b.id}',now(),0,4,0) on conflict (user_id) do update set streak=4,records=0`
    )
    const pb = await open('/whos-that-pokemon', {
      origin: SERVER,
      storage: { 'pokedex:auth': b.session },
    })
    await start(pb)
    const tb = await turnsText(pb)
    check(
      'server: a fresh window of 10, one spent, shows 9/10',
      /9\/10/.test(tb),
      tb
    )
    await serverAnswer(pb, b.id)
    sql(
      `update public.quiz_chest_shard_events set entropy='${JSON.stringify(SAME)}' where user_id='${b.id}'`
    )
    await openChest(pb)
    await shardState(pb)
    const brows = await shardRows(pb)
    check(
      'server account B: its own receipt only (one tile ×3), A untouched',
      brows.length === 1 &&
        brows[0].many === '×3 mảnh' &&
        total(a.id) === 3 &&
        total(b.id) === 3,
      JSON.stringify(brows)
    )
    // sign out in another tab while B's chest is open: the dialog goes, and
    // no claim against the new engine says "no shards"
    const other = await browser.newPage()
    await other.goto(`${SERVER}/dang-nhap`)
    await other.waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some((b) =>
          b.textContent.includes('Đăng xuất')
        ),
      { timeout: 15000 }
    )
    await other.evaluate(() =>
      [...document.querySelectorAll('button')]
        .find((b) => b.textContent.includes('Đăng xuất'))
        .click()
    )
    await wait(2500)
    const stale = await pb.evaluate(() => ({
      auth: !!localStorage.getItem('pokedex:auth'),
      ready: !!document.querySelector('.ready-screen'),
      shards:
        document.querySelector('dialog .chest-shards')?.textContent ?? null,
      open: !!document.querySelector('dialog[open]'),
      wrong: document.body.textContent.includes('không có phần thưởng mảnh'),
    }))
    check(
      'server: signing out elsewhere closes the open chest, no false "no shards"',
      !stale.open && !stale.wrong,
      JSON.stringify(stale)
    )
    await other.close()
    await pb.close()
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
