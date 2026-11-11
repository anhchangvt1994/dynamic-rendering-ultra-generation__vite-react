# Mini game redesign — "Quầy Arcade đêm"

Date: 2026-11-11 · Scope: `/mini-game` hub + play sheet (pick, level, count, HUD, result) + skeleton.
Out of scope: engine, RPCs, DB, SEO (page stays `noindex`), new games (ghép hình, xếp khối keep their own specs).

## 1. Brief (user)
- Page is ugly, not "wow". Rebuild from scratch, not bound to the old layout.
- Blend A (hội chợ đêm) + B (bàn chơi tabletop) + C (trạm trainer HUD) into one harmonious look, with pretty effects.
- Hub and play sheet both. Skeleton must hand over to full content with zero layout shift.
- QC from mobile 320 to desktop; must be beautiful, creative, distinctive.

## 2. Concept
One scene: a night fair stall.
- **Sky (A):** deep navy→indigo, a string of warm bulbs across the top that sway and twinkle; faint stars; parallax drift on scroll/tilt.
- **Table (B):** the lower scene is a felt table (teal-green, fine weave texture, stitched edge). Games stand on it as tilted game boxes; opening one (tap) lifts the lid and the card fan spreads before the sheet opens.
- **HUD (C):** the trainer is a holographic membership card (glass, scanline, foil gradient that follows pointer / device tilt); numbers (level, xp, tickets) read as instrument readouts with tabular figures.
- **Tickets:** turns are paper tickets with perforation; using one tears it off (animation). Reset time is a small ticket stub countdown.
- **Stamps:** daily quests are a stamp card: 3 tasks, 7-day streak ring of stamps; claiming slams a stamp (squash + ink burst + haptic).

Unifying rules: one light source (bulbs, top), one accent family per Pokémon tone (`--hue/--accent/--deep/--glow` already exist), warm gold `#ffcf5a` for rewards, mint `#5fe3b4` for progress, coral `#ff6b8a` for action. Surface language: felt, paper, glass — each used for exactly one role (table = ground, paper = tickets/stamps, glass = trainer + HUD).

## 3. Tokens
- Color: night `#0a1230`, indigo `#1b1f5e`, felt `#0f5d57`, felt-dark `#0a403d`, paper `#fff4d6`, ink `#2b1a3d`, gold `#ffcf5a`, mint `#5fe3b4`, coral `#ff6b8a`.
- Type: site font only (no new font files, perf). Display = heavy weight (800) with tight tracking at 28–44px; body 15–16px; numerals `font-variant-numeric: tabular-nums`. No all-caps eyebrows, no "·" meta chains in new copy where a layout can say it.
- Radius: 28 (booths), 20 (cards), 14 (buttons), 999 (pills). Touch targets ≥ 44px.
- Motion tokens: ease-out `cubic-bezier(.2,.8,.2,1)`, spring `cubic-bezier(.3,1.4,.4,1)`; 140/260/520 ms.

## 4. Hub layout (320 → 1920)
Grid areas, same names at every width; only the template changes.
```
mobile (<640)            tablet (640–1023)         desktop (≥1024)
[ title+bulbs      ]     [ title       | trainer ]  [ title             | trainer ]
[ trainer card     ]     [ tickets     | quests  ]  [ booths (2 cols, staggered) | quests ]
[ tickets          ]     [ booths (2 cols)       ]  [ tickets under booths       |        ]
[ booths (1 col)   ]
[ quests (stamps)  ]
```
- **Title block:** "Chơi cùng Pokémon" + one line of purpose. Bulb string is decorative SVG/CSS, `aria-hidden`.
- **Trainer holo card:** avatar, level, xp bar as arc/segmented readout, team slot dots, `Đội hình` and avatar buttons (existing sheets). Guest: same box with an "Khách" card and a single `Đăng nhập` CTA; practice note folded into it (no separate note block).
- **Tickets:** per game a row of ticket stubs (3), used ones torn; text `Còn n/3 lượt` + reset countdown. One strip shared by both games would hide per-game state, so tickets live inside each booth; the tickets area above the booths summarises the hour reset only when any game is at 0.
- **Booth (per game):** tilted box on the felt, mascot Pokémon sprite popping from the lid (candy: berries cascading; memory: card fan), name, one-line rule, difficulty hint, `Chơi` button. Desktop staggers booths vertically 24px; hover = lid lifts + bulbs brighten; tap = lid opens 260 ms then the sheet opens.
- **Quests (stamps):** 3 task rows with progress as ink fill; 7 stamps ring, day 7 = gift chest; claim = stamp slam. Guest: same card, locked state, same dimensions.
- Max content width 1120 centered; booths never leave empty half-screens (desktop booths 2 cols fill the main column; decorative felt extends full-bleed).

## 5. Play sheet (shared chrome)
- Keeps `GameSheet` behaviour (Esc, backdrop, drag-down, confirm on exit). New skin: panel = felt table with stitched border, Pokémon tone tints the felt edge + glow.
- **Pick:** Pokémon as collectible cards (art, bond hearts, hunger gauge); disabled = face-down card with reason.
- **Level:** three difficulty "chips" as ticket tiers (rewards visible: exp range, chest size, loss cost) — copy unchanged, layout clearer.
- **Count:** big 3-2-1 with ring pulse; bulbs flash.
- **HUD:** top bar = time ring (existing rect ring kept) + readout glass pill (score/moves for candy, flips for memory); partner Pokémon sits on the panel edge (existing `mg-mate`).
- **Result:** win = confetti + stamp "Thắng"; loss = soft dim + encouraging line; exp/xp bars animate; chest opens as today (`GiftChest` untouched logic).
- Candy/Memory boards keep their logic; only the board frame/background and cell styling are tuned to the felt look (no engine/props change).

## 6. Effects (budgeted)
One orchestrated entrance (bulbs light left→right, booths rise 80 ms apart, once per visit). Reactive effects: holo tilt (pointer + `deviceorientation`, throttled via rAF), ticket tear, stamp slam, lid open, confetti. All CSS transform/opacity; no layout-affecting animation. `prefers-reduced-motion`: no sway/tilt/parallax, instant state changes, entrance becomes a 1-frame fade. Pause decorative animation when `document.hidden`.

## 7. Skeleton with zero layout shift
Contract: skeleton and loaded page render the **same grid shell** (one `HubShell` styled component, one set of area names) and every region has a size that does not depend on content.
- Every region has a fixed box per breakpoint (`min-height`/`aspect-ratio`): trainer card, each booth, quest card, ticket row. Guest, loading and signed-in variants of a region share that box (guest card = same size as trainer card; locked quest card = same size as stamp card).
- Variable text sits in line-clamped slots with reserved lines (booth rule text 2 lines, title 1–2 lines per breakpoint via `min-height`).
- Loaded states only fill the box (swap bones → content); nothing inserts or removes a box. The old "quest card hidden when no items" and "trainer card null until status" paths become same-size empty/placeholder states.
- Decorative layers (bulbs, felt, stars) are in the shell, so identical in both.
- Skeleton bones keep the existing `bone` shimmer; reduced-motion = static.
- **Gate (QA):** puppeteer loads the page at throttled network, records `layout-shift` entries via `PerformanceObserver` (CLS must be 0.00), and compares bounding rects of each named region between skeleton and loaded (≤ 1px) at 320, 390, 768, 1024, 1280, 1920, for guest and signed-in.

## 8. Files
- New: `src/pages/MiniGamePage/hub/` — `HubShell.tsx` (grid + decor), `Bulbs.tsx`, `HoloCard.tsx` (trainer/guest), `Booth.tsx`, `TicketRow.tsx`, `StampCard.tsx` (replaces `QuestCard` render, keeps `useQuests`), `styles.hub.tsx`, `tilt.mjs` (+ test), `useReveal` (entrance once).
- Change: `index.tsx` (compose), `pageStyles.tsx` (shell/tokens), `GameSheet.tsx` + `styles.tsx`/`styles.play.tsx`/`styles.candy.tsx` (re-skin), `MiniGameHost.tsx` (markup/class changes only; no logic change), `components/PageSkeleton/MiniGameSkeleton.tsx` (renders the shell + bones).
- Untouched: engine, `client.mjs`, RPC/migrations, `useMiniGame`, boards' logic.

## 9. QC matrix
- Widths: 320, 360, 390, 768, 1024, 1280, 1440, 1920. States: guest, signed-in, 0 turns left, open round resume, no Pokémon, error banner, reduced-motion, dark OS setting irrelevant (page is always dark).
- Checks per width: no horizontal overflow, targets ≥ 44px, text contrast ≥ 4.5:1 (body) / 3:1 (large), keyboard focus visible, sheet scroll works at 320×568, no console errors, CLS 0.
- Flows: play candy win/lose, memory win, resume, time-out (existing `minigame-candy.mjs` must stay ALL PASS), claim quest, change avatar/team.
- Then `/design-review` on hub and a round (visual + UX), fix, re-run.
- Screenshots kept in `.superpowers/qa/shots/` (before = `before-*.png`).

## 10. Risks
- Heavy visuals on low-end phones → transforms only, no blur on animated layers, `will-change` scoped, decoration under 12 DOM nodes of animation.
- Tilt on iOS needs permission → feature-detect, fall back to pointer/idle shimmer, never block.
- Zero-shift depends on fixed boxes: long Vietnamese strings are clamped, verified at 320.
- Scope: ghép hình/xếp khối will add booths later; booth grid is data-driven from `GAMES`.
