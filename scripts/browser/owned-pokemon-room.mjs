// The owned card in the collection, the Pokémon's room and its care.
//   node scripts/browser/owned-pokemon-room.mjs            local journal (dev app)
//   node scripts/browser/owned-pokemon-room.mjs --guest    guest status only
//   node scripts/browser/owned-pokemon-room.mjs --canvas   the WebGL canvas only
// LOCAL=http://localhost:5190 (dev, local mode), SERVER=http://localhost:5191
// (Supabase signed in; skipped when unset or down), SHOTS=.superpowers/qa/shots/room
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import puppeteer from 'puppeteer'
import {
  marksLabel,
  paletteLabel,
  sizeOf,
} from '../../src/pages/BagPage/individuals/display.mjs'

const LOCAL =
  process.env.LOCAL ||
  process.env.POKEMON_TEST_ORIGIN ||
  'http://localhost:5190'
const SERVER = process.env.SERVER ?? 'http://localhost:5191'
const SHOTS = process.env.SHOTS || '.superpowers/qa/shots/room'
mkdirSync(SHOTS, { recursive: true })

const golden = JSON.parse(
  readFileSync('src/pages/BagPage/individuals/golden.json', 'utf8')
)
const withMark = golden[0]
// two of one species in two palettes: one with marks, one without
const withMarks = golden.find(
  (g) => g.traits.appearance.marks && g.traits.appearance.palette !== 'origin'
)
const withoutMarks = golden.find(
  (g) =>
    !g.traits.appearance.marks &&
    g.traits.appearance.palette !== withMarks.traits.appearance.palette
)
const SPECIES = [25, 197, 282]
const DISHES = { 'poffin-cheri': 2, 'tra-da-chesto': 1 }

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

const individual = (g, speciesId, extra = {}) => ({
  id: g.id,
  speciesId,
  nickname: null,
  personality: g.traits.personality,
  appearance: g.traits.appearance,
  potential: g.traits.potential,
  createdAt: new Date(Date.now() - 3600_000).toISOString(),
  ...extra,
})

/** A page with the local journal seeded; `care` is the care journal. */
async function open(
  path,
  {
    individuals = {},
    cards = {},
    care,
    width = 420,
    height = 900,
    reduced = false,
    block,
    mode = 'local',
    origin = LOCAL,
    storage,
  } = {}
) {
  const page = await browser.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  if (block) {
    await page.setRequestInterception(true)
    page.on('request', (r) => (block.test(r.url()) ? r.abort() : r.continue()))
  }
  await page.setViewport({ width, height })
  if (reduced)
    await page.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ])
  await page.goto(`${origin}/robots.txt`)
  await page.evaluate(
    (args) => {
      localStorage.clear()
      for (const [k, v] of Object.entries(args.storage ?? {}))
        localStorage.setItem(k, JSON.stringify(v))
      if (args.mode) localStorage.setItem('pokedex:quiz-mode', args.mode)
      if (args.mode === 'local') {
        localStorage.setItem('pokedex:caught', '[]')
        localStorage.setItem(
          'pokedex:quiz-shards-v1',
          JSON.stringify({
            version: 1,
            events: {},
            balances: {},
            cards: args.cards,
            extra: {},
            individuals: args.individuals,
          })
        )
        localStorage.setItem(
          'pokedex:kitchen',
          JSON.stringify({ dishes: args.dishes })
        )
        if (args.care)
          localStorage.setItem(
            'pokedex:pokemon-care-v1',
            JSON.stringify(args.care)
          )
      }
    },
    { individuals, cards, care, mode, dishes: DISHES, storage }
  )
  await page.goto(`${origin}${path}`)
  return page
}
const ready = (page) => page.waitForSelector('.rm-ring', { timeout: 15000 })
const box = (page, sel) =>
  page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect()
    return {
      x: r.x,
      y: r.y,
      w: r.width,
      h: r.height,
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
    }
  })
const rings = (page) =>
  page.$$eval('.rm-ring', (all) => all.map((x) => x.getAttribute('aria-label')))
const moodOf = (page) => page.$eval('.rm-room', (el) => el.dataset.mood)
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` })

try {
  if (process.argv.includes('--guest')) {
    const page = await open('/?view=caught&owned=1', { mode: 'guest' })
    await page.waitForSelector('[data-filter="owned"]')
    check(
      'guest ownership is not pending',
      !(await page.evaluate(() =>
        document.body.textContent.includes('Đang kiểm tra Pokémon sở hữu…')
      ))
    )
  } else if (process.argv.includes('--canvas')) {
    await canvasChecks()
  } else {
    // ── 1. trade three cards for individuals through the real UI ──
    const page = await open('/tui-do', {
      cards: Object.fromEntries(SPECIES.map((s) => [s, 1])),
    })
    await page.waitForSelector('.tag')
    await page.waitForFunction(() => {
      const tab = [...document.querySelectorAll('.tag')].at(-1)
      if (tab?.getAttribute('aria-pressed') === 'true') return true
      tab?.click()
      return false
    })
    for (const species of SPECIES) {
      await page.waitForSelector(`[data-trade="${species}"]`)
      await page.click(`[data-trade="${species}"]`)
      await page.waitForSelector('dialog[data-dialog="trade"][open]')
      await page.click('dialog[data-dialog="trade"] [data-action="confirm"]')
      await page.waitForSelector('dialog[data-dialog="welcome"][open]')
      await page.keyboard.press('Escape')
      await page.waitForFunction(
        () => !document.querySelector('dialog[data-dialog="welcome"][open]')
      )
    }
    const traded = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('pokedex:quiz-shards-v1')).individuals
    )
    const idOf = Object.fromEntries(
      Object.values(traded).map((one) => [one.speciesId, one.id])
    )
    check(
      'trade: three individuals',
      SPECIES.every((s) => idOf[s]),
      JSON.stringify(idOf)
    )

    // ── 2. the collection's owned card ──
    for (const width of [420, 1280]) {
      await page.setViewport({ width, height: 900 })
      await page.goto(`${LOCAL}/?view=caught`)
      await page.waitForSelector('[data-owned="25"]', { timeout: 15000 })
      await page.$eval('[data-owned="25"]', (el) =>
        el.scrollIntoView({ block: 'center' })
      )
      await page.mouse.move(0, 0) // no hover: a hovered card scales its art
      await wait(500) // the frame's colour eases in
      const card = await page.$eval('[data-owned="25"]', (badge) => {
        const wrap = badge.parentElement
        const art = wrap.querySelector('.card-art img').getBoundingClientRect()
        // the pill is what shows; the link around it is a 44px touch target
        const b = badge.firstElementChild.getBoundingClientRect()
        const frame = wrap.querySelector('[data-owned-card]')
        const R = (r) =>
          [r.left, r.top, r.right, r.bottom].map(Math.round).join(',')
        return {
          rects: `pill ${R(b)} art ${R(art)}`,
          hits: !(
            b.right <= art.left ||
            b.left >= art.right ||
            b.bottom <= art.top ||
            b.top >= art.bottom
          ),
          border: getComputedStyle(frame).borderTopColor,
          text: wrap.textContent.includes('Bạn đồng hành'),
        }
      })
      check(
        `collection ${width}: badge clear of the art`,
        !card.hits,
        card.rects
      )
      check(
        `collection ${width}: gold frame`,
        card.border === 'rgb(240, 180, 60)',
        card.border
      )
      check(`collection ${width}: no "Bạn đồng hành"`, !card.text)
      await shot(page, `collection-${width}`)
    }

    // ── 3. each room at 320, 420, 1280: centred, wall above the circle, no scroll ──
    for (const species of SPECIES) {
      await page.goto(`${LOCAL}/pokemon-cua-toi/${idOf[species]}`)
      await ready(page)
      for (const [width, height] of [
        [320, 640],
        [420, 900],
        [1280, 800],
      ]) {
        await page.setViewport({ width, height })
        await wait(600)
        const m = await page.evaluate(() => {
          const r = (s) => document.querySelector(s)?.getBoundingClientRect()
          const disc = r('.rm-disc'),
            body = r('.rm-body'),
            wall = r('.rm-wall'),
            bub = r('.rm-bubble'),
            name = r('.rm-name'),
            needs = r('.rm-needs'),
            back = r('.rm-back'),
            sprite = r('.rm-stage .rm-sprite')
          // the picture is shifted so its visible body, not its frame, is centred
          const el = document.querySelector('.rm-body')
          const [sx, sy] = (el.dataset.shift ?? '0,0').split(',').map(Number)
          return {
            measured: el.dataset.measured,
            dx: body.x + body.width / 2 - sx - (disc.x + disc.width / 2),
            dy: body.y + body.height / 2 - sy - (disc.y + disc.height / 2),
            wallGap: disc.top - wall.bottom,
            overflow: document.documentElement.scrollWidth - innerWidth,
            overlaps:
              [name, needs].some(
                (o) =>
                  !(
                    bub.right <= o.left ||
                    bub.left >= o.right ||
                    bub.bottom <= o.top ||
                    bub.top >= o.bottom
                  )
              ) || bub.bottom > disc.top,
            wall: document.querySelector('.rm-wall').textContent,
            noTopRow: !document.querySelector('.rm-top'),
            backInHead: !!document.querySelector('.rm-room .rm-head .rm-back'),
            backMid: back.top + back.height / 2 - (name.top + name.height / 2),
            spriteFill: sprite.width / disc.width,
          }
        })
        // the bob animation lifts it a few px
        check(
          `room ${species} @${width}: visible body centred`,
          m.measured === 'body' && Math.abs(m.dx) <= 1 && Math.abs(m.dy) <= 6,
          `${m.measured} ${m.dx},${m.dy}`
        )
        check(
          `room ${species} @${width}: wall above the circle`,
          m.wallGap >= 0,
          String(m.wallGap)
        )
        check(
          `room ${species} @${width}: no horizontal scroll`,
          m.overflow === 0,
          String(m.overflow)
        )
        check(
          `room ${species} @${width}: bubble clear of name, needs, circle`,
          !m.overlaps
        )
        check(
          `room ${species} @${width}: back sits in the head row, level with the name`,
          m.noTopRow && m.backInHead && Math.abs(m.backMid) <= 1,
          String(m.backMid)
        )
        check(
          `room ${species} @${width}: the Pokémon fills the circle`,
          m.spriteFill >= 0.75,
          m.spriteFill.toFixed(2)
        )
        if (species === 197 && width === 420)
          check('room 197: the wall says BÓNG TỐI', /BÓNG TỐI/i.test(m.wall))
        if (width !== 320) await shot(page, `room-${species}-${width}`)
      }
    }

    // ── 4. care: feed, bathe twice, pet four times ──
    await page.setViewport({ width: 420, height: 900 })
    await page.goto(`${LOCAL}/pokemon-cua-toi/${idOf[25]}`)
    await ready(page)
    const before = await rings(page)
    await page.click('[data-action="feed"]')
    await page.waitForSelector('dialog.rm-feed[open]')
    await wait(300)
    await shot(page, 'feed-420')
    const first = await page.$eval(
      '.rm-dish',
      (el) => el.dataset.dish ?? el.textContent
    )
    await page.click('.rm-dish')
    await page.waitForFunction(
      () => !document.querySelector('dialog.rm-feed[open]')
    )
    check(
      'feed: the feed effect plays, the hunger ring flashes',
      !!(await page.$('.rm-fx[data-fx="feed"]')) &&
        !!(await page.$('.rm-ring[data-need="hunger"] .rm-ring-flash'))
    )
    await wait(300)
    const dishes = await page.evaluate(
      () => JSON.parse(localStorage.getItem('pokedex:kitchen')).dishes
    )
    const spent = Object.entries(DISHES).filter(([id, n]) => dishes[id] !== n)
    check(
      'feed: exactly one dish spent',
      spent.length === 1 && dishes[spent[0][0]] === spent[0][1] - 1,
      `${first} ${JSON.stringify(dishes)}`
    )
    const after = await rings(page)
    check(
      'feed: the No ring moves',
      before[0] !== after[0],
      `${before[0]} → ${after[0]}`
    )
    await page.click('[data-action="bathe"]')
    await page
      .waitForSelector('.rm-fx[data-fx="bathe"]', { timeout: 3000 })
      .catch(() => {})
    check(
      'bathe: the bubbles play',
      !!(await page.$('.rm-fx[data-fx="bathe"]'))
    )
    await wait(500)
    await page.click('[data-action="bathe"]')
    await wait(300)
    check(
      'bathe twice: "Vừa tắm xong"',
      /Vừa tắm xong/.test(
        await page.$eval('.rm-reasons', (el) => el.textContent)
      )
    )
    const petFx = []
    for (let i = 0; i < 4; i++) {
      await page.click('[data-action="pet"]')
      await wait(500)
      petFx.push(
        await page.$eval('.rm-fx', (el) => el.dataset.fx).catch(() => null)
      )
    }
    check(
      'pet: hearts, then anger once it has had enough',
      petFx[0] === 'pet' && petFx[3] === 'angry',
      petFx.join(',')
    )
    check(
      'pet four times: 💢',
      (await moodOf(page)) === 'angry' &&
        (await page.$eval('.rm-bubble', (el) => el.textContent)).includes('💢')
    )
    await shot(page, 'after-pet-420')
    await page.click('.rm-sheet-toggle')
    await wait(400)
    check(
      'profile sheet: no horizontal scroll',
      (await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )) === 0
    )
    await shot(page, 'sheet-420')

    // ── 5. cook → kitchen → back to this room ──
    await page.goto(`${LOCAL}/pokemon-cua-toi/${idOf[25]}`)
    await ready(page)
    const room = page.url()
    await page.click('[data-action="cook"]')
    await page.waitForSelector('.kitchen-back')
    await shot(page, 'kitchen-back-420')
    await page.click('.kitchen-back')
    await page.waitForSelector('.rm-room')
    check(
      'cook → kitchen → "Quay về phòng" → the same room',
      page.url() === room
    )
    await page.close()

    // ── 6. the six moods, from the care journal ──
    const now = Date.now()
    const iso = (minutesAgo) =>
      new Date(now - minutesAgo * 60_000).toISOString()
    const careOf = (over) => ({
      needs: { hunger: 70, clean: 70, fun: 70 },
      needsAt: iso(0),
      affection: 0,
      stats: {
        power: 0,
        beauty: 0,
        happiness: 0,
        agility: 0,
        wisdom: 0,
        friendship: 0,
      },
      lastCaredAt: iso(5),
      moodEvent: null,
      moodEventAt: null,
      petWindowStart: null,
      petWindowCount: 0,
      bathedAt: null,
      ...over,
    })
    const MOODS = {
      angry: careOf({ moodEvent: 'disliked', moodEventAt: iso(1) }),
      ignoring: careOf({ lastCaredAt: iso(49 * 60) }),
      hungry: careOf({ needs: { hunger: 30, clean: 70, fun: 70 } }),
      sad: careOf({ needs: { hunger: 70, clean: 70, fun: 25 } }),
      happy: careOf({ moodEvent: 'liked', moodEventAt: iso(1) }),
      glad: careOf({}),
    }
    const one = individual(withMark, 197)
    for (const [mood, state] of Object.entries(MOODS)) {
      const p = await open(`/pokemon-cua-toi/${one.id}`, {
        individuals: { [one.id]: one },
        care: { states: { [one.id]: state }, ops: {} },
      })
      await ready(p)
      check(`mood ${mood}`, (await moodOf(p)) === mood, await moodOf(p))
      if (mood === 'ignoring')
        check(
          'ignoring shows the back sprite',
          /\/back\//.test(await p.$eval('.rm-body img', (img) => img.src))
        )
      await p
        .waitForSelector(
          '.rm-stage .rm-body img[data-ready], .rm-stage .rm-letter',
          { timeout: 10000 }
        )
        .catch(() => {})
      check(
        `mood ${mood}: the Pokémon shows`,
        !!(await p.$('.rm-stage .rm-body img[data-ready]')),
        await p.$eval(
          '.rm-stage .rm-sprite',
          (el) => el.dataset.phase + ' ' + (el.querySelector('img')?.src ?? '')
        )
      )
      await shot(p, `mood-${mood}-420`)
      await p.close()
    }

    // ── 7. an individual's palette, marks and size ──
    const pair = [withMarks, withoutMarks].map((g) => individual(g, 25))
    const p = await open(`/pokemon-cua-toi/${pair[0].id}`, {
      individuals: Object.fromEntries(pair.map((one) => [one.id, one])),
    })
    for (const one of pair) {
      await p.goto(`${LOCAL}/pokemon-cua-toi/${one.id}`)
      await ready(p)
      await p.evaluate(() => document.querySelector('.rm-sheet-toggle').click())
      await wait(300)
      const got = await p.$eval('#rm-profile', (el) => ({
        palette: el.querySelector('dd[data-palette]')?.dataset.palette,
        label: el.querySelector('dd[data-palette]')?.textContent,
        dots: el.querySelectorAll('dd[data-palette] .pd-dot').length,
        marks: el.querySelector('dd[data-marks]')?.dataset.marks ?? null,
        marksText: el.querySelector('dd[data-marks]')?.textContent ?? null,
        size: el.querySelector('dd[data-size]')?.textContent,
      }))
      const a = one.appearance
      check(
        `profile "Hồ sơ" (${a.palette}${a.marks ? ', ' + a.marks.kind : ''}): palette, dots, marks row, size`,
        got.palette === a.palette &&
          got.label?.includes(paletteLabel(a)) &&
          got.dots ===
            (a.palette === 'origin' || a.palette === 'invert' ? 1 : 3) &&
          got.marks === (a.marks?.kind ?? null) &&
          got.marksText === marksLabel(a) &&
          got.size?.includes(sizeOf(one.id).label),
        JSON.stringify(got)
      )
    }
    await p.close()

    // ── 8. reduced motion: still artwork; showdown blocked: artwork, same circle ──
    {
      const still = await open(`/pokemon-cua-toi/${marked.id}`, {
        individuals: { [marked.id]: marked },
        reduced: true,
      })
      await ready(still)
      check(
        'reduced motion: artwork, not the GIF',
        /official-artwork/.test(
          await still.$eval('.rm-stage .rm-body img', (img) => img.src)
        )
      )
      await still.close()
      const blocked = await open(`/pokemon-cua-toi/${marked.id}`, {
        individuals: { [marked.id]: marked },
        block: /showdown/,
      })
      await ready(blocked)
      const disc0 = await box(blocked, '.rm-disc')
      await blocked.waitForFunction(
        () =>
          /official-artwork/.test(
            document.querySelector('.rm-stage .rm-body img')?.src ?? ''
          ),
        { timeout: 10000 }
      )
      await wait(500)
      const disc1 = await box(blocked, '.rm-disc')
      check(
        'showdown blocked: artwork, circle unchanged',
        disc0.w === disc1.w && disc0.y === disc1.y
      )
      await blocked.close()
      const bare = await open(`/pokemon-cua-toi/${marked.id}`, {
        individuals: { [marked.id]: marked },
        reduced: true,
        block: /official-artwork/,
      })
      const letter = await bare
        .waitForSelector('.rm-stage .rm-letter', { timeout: 10000 })
        .then(() => true)
        .catch(() => false)
      check('reduced motion, artwork blocked: the letter', letter)
      await bare.close()
    }

    // ── 9. CLS while the GIF loads ──
    {
      const slow = await browser.newPage()
      await slow.evaluateOnNewDocument(() => {
        window.__cls = 0
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            if (!e.hadRecentInput) window.__cls += e.value
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await slow.setRequestInterception(true)
      slow.on('request', async (r) => {
        if (/showdown/.test(r.url())) await wait(1500)
        r.continue()
      })
      await slow.setViewport({ width: 420, height: 900 })
      await slow.goto(`${LOCAL}/robots.txt`)
      await slow.evaluate((one) => {
        localStorage.clear()
        localStorage.setItem('pokedex:quiz-mode', 'local')
        localStorage.setItem(
          'pokedex:quiz-shards-v1',
          JSON.stringify({
            version: 1,
            events: {},
            balances: {},
            cards: {},
            extra: {},
            individuals: { [one.id]: one },
          })
        )
      }, marked)
      await slow.goto(`${LOCAL}/pokemon-cua-toi/${marked.id}`)
      await ready(slow)
      await slow.waitForSelector('.rm-stage .rm-body img[data-ready]', {
        timeout: 15000,
      })
      await wait(500)
      const cls = await slow.evaluate(() => window.__cls)
      check('CLS < 0.01 while the GIF loads', cls < 0.01, cls.toFixed(4))
      await slow.close()
    }

    // ── 10. the individual on the WebGL canvas ──
    await canvasChecks()

    // ── 11. account switch with the room open (Supabase dev app) ──
    if (SERVER) await accountSwitch()
  }
} finally {
  await browser.close()
}

// the room's canvas (palette + marks): shown over the picture once the rig is
// ready, the picture back whenever WebGL is missing or lost
async function canvasChecks() {
  const a = individual(withMarks, 25)
  const b = individual(withoutMarks, 25)
  const both = { [a.id]: a, [b.id]: b }
  const shown = (p) =>
    p.$eval('.rm-stage .rm-body', (el) => ({
      canvas: el.hasAttribute('data-canvas'),
      img: getComputedStyle(el.querySelector('img')).visibility,
      paint: el.querySelector('canvas')
        ? getComputedStyle(el.querySelector('canvas')).opacity
        : null,
    }))
  const painted = (p, on = true) =>
    p
      .waitForFunction(
        (on) =>
          !!document.querySelector('.rm-stage .rm-body[data-canvas]') === on,
        { timeout: 60000 },
        on
      )
      .then(() => true)
      .catch(() => false)

  {
    const p = await open(`/pokemon-cua-toi/${a.id}`, { individuals: both })
    const warnings = []
    p.on('console', (m) => warnings.push(m.text()))
    await ready(p)
    const on = await painted(p)
    const s = await shown(p)
    check(
      'canvas: painted over a hidden picture once the rig is ready',
      on && s.img === 'hidden' && s.paint === '1',
      JSON.stringify(s)
    )
    await shot(p, 'canvas-on')

    // a lost context gives the picture back; a restored one paints again
    await p.evaluate(() => {
      const c = document.querySelector('.rm-stage .rm-canvas')
      const gl = c.getContext('webgl2') || c.getContext('webgl')
      window.__lose = gl.getExtension('WEBGL_lose_context')
      window.__lose.loseContext()
    })
    const gone = await painted(p, false)
    const lost = await shown(p)
    check(
      'canvas: a lost context shows the picture',
      gone && lost.img === 'visible',
      JSON.stringify(lost)
    )
    await p.evaluate(() => window.__lose.restoreContext())
    const back = await painted(p)
    check('canvas: a restored context paints again', back)

    // tab hidden: the clock stops asking for frames
    await p.evaluate(() => {
      window.__raf = 0
      const raf = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (f) => {
        window.__raf++
        return raf(f)
      }
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      })
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await wait(300)
    const before = await p.evaluate(() => window.__raf)
    await wait(1000)
    const after = await p.evaluate(() => window.__raf)
    check(
      'canvas: no frames asked for in a hidden tab',
      after === before,
      `${before}→${after}`
    )
    await p.evaluate(() => {
      delete document.hidden
      delete document.visibilityState
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // stepping through one species ten times keeps one live context
    for (let i = 0; i < 10; i++) {
      await p.click('.rm-step-btn:last-of-type')
      await wait(400)
    }
    const end = await painted(p)
    check(
      'canvas: ten steps between individuals, no context pile-up',
      end && !warnings.some((w) => /Too many active WebGL contexts/.test(w)),
      warnings.filter((w) => /WebGL/.test(w)).join(' | ')
    )
    await p.close()
  }

  // reduced motion: frame 0 and nothing moves
  {
    const p = await open(`/pokemon-cua-toi/${a.id}`, {
      individuals: both,
      reduced: true,
    })
    await ready(p)
    const on = await painted(p)
    await wait(300)
    const el = await p.$('.rm-stage .rm-body')
    const first = await el.screenshot()
    await wait(2000)
    const later = await el.screenshot()
    check(
      'canvas: reduced motion holds one frame',
      on && Buffer.compare(first, later) === 0
    )
    await p.close()
  }

  // no WebGL: the picture, no canvas
  {
    const flat = await puppeteer.launch({
      headless: true,
      executablePath:
        process.env.CHROME_PATH ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--disable-webgl', '--disable-3d-apis'],
    })
    try {
      const p = await flat.newPage()
      p.on('pageerror', (e) => errors.push(e.message))
      await p.setViewport({ width: 420, height: 900 })
      await p.goto(`${LOCAL}/robots.txt`)
      await p.evaluate((both) => {
        localStorage.clear()
        localStorage.setItem('pokedex:quiz-mode', 'local')
        localStorage.setItem('pokedex:caught', '[]')
        localStorage.setItem(
          'pokedex:quiz-shards-v1',
          JSON.stringify({
            version: 1,
            events: {},
            balances: {},
            cards: {},
            extra: {},
            individuals: both,
          })
        )
      }, both)
      await p.goto(`${LOCAL}/pokemon-cua-toi/${a.id}`)
      await ready(p)
      await p.waitForSelector('.rm-stage .rm-body img[data-ready]', {
        timeout: 15000,
      })
      await wait(5000)
      const s = await shown(p)
      check(
        'canvas: without WebGL the picture stays',
        !s.canvas && s.img === 'visible',
        JSON.stringify(s)
      )
    } finally {
      await flat.close()
    }
  }
}

async function accountSwitch() {
  const ROOT = process.cwd()
  let status
  try {
    status = JSON.parse(
      execFileSync(
        `${ROOT}/node_modules/.bin/supabase`,
        ['status', '-o', 'json'],
        { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }
      )
        .toString()
        .replace(/^[^{]*/, '')
    )
  } catch {
    console.log('SKIP account switch: Supabase is not running')
    return
  }
  const sql = (q) =>
    execFileSync('docker', [
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
  const user = async () => {
    const email = `room-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
    const password = 'room-e2e-password-1'
    const made = await (
      await fetch(`${status.API_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: admin,
        body: JSON.stringify({ email, password, email_confirm: true }),
      })
    ).json()
    const session = await (
      await fetch(`${status.API_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    ).json()
    return { id: made.id, session }
  }
  const a = await user()
  const g = withMark
  sql(
    `insert into public.pokemon_individuals (id, user_id, pokemon_id, personality, appearance, potential) values ('${g.id.replace(/^0{8}/, a.id.slice(0, 8))}', '${a.id}', 197, ${g.traits.personality}, '${JSON.stringify(g.traits.appearance)}', '${JSON.stringify(g.traits.potential)}')`
  )
  const id = sql(
    `select id from public.pokemon_individuals where user_id = '${a.id}'`
  )
  sql(
    `insert into public.kitchen_dishes (user_id, dish_id, count) values ('${a.id}', 'poffin-cheri', 2)`
  )
  const page = await open(`/pokemon-cua-toi/${id}`, {
    origin: SERVER,
    mode: null,
    storage: { 'pokedex:auth': a.session },
  })
  await ready(page)
  await page.click('[data-action="feed"]')
  await page.waitForSelector('dialog.rm-feed[open]')
  await page.click('.rm-dish')
  await page.waitForFunction(
    () => !document.querySelector('dialog.rm-feed[open]')
  )
  check(
    'server feed: one dish spent in kitchen_dishes',
    sql(
      `select count from public.kitchen_dishes where user_id = '${a.id}' and dish_id = 'poffin-cheri'`
    ) === '1'
  )
  check(
    'server feed: care row written',
    Number(
      sql(
        `select hunger from public.pokemon_care where individual_id = '${id}'`
      )
    ) > 60
  )
  await shot(page, 'server-room-420')
  const other = await page.browser().newPage()
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
  await page
    .waitForFunction(() => !document.querySelector('.rm-room'), {
      timeout: 15000,
    })
    .catch(() => {})
  check(
    'sign out in another tab: the open room is gone',
    !(await page.$('.rm-room')) &&
      !(await page.evaluate(() =>
        document.body.textContent.includes('Umbreon')
      ))
  )
  await other.close()
  await page.close()
  sql(`delete from auth.users where id = '${a.id}'`)
}

const failed = results.filter((r) => !r.pass)
if (errors.length) console.log('PAGE ERRORS', errors)
console.log(`${results.length - failed.length}/${results.length} PASS`)
process.exitCode = failed.length || errors.length ? 1 : 0
