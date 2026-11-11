# Mini game redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/mini-game` (hub + play sheet + skeleton) as the "Quầy arcade đêm" scene with zero layout shift from skeleton to loaded page.

**Architecture:** One `HubShell` (grid areas + night sky + felt table + bulbs) is rendered by both the page and `MiniGameSkeleton`; every region is a fixed-size box per breakpoint (`hub/regions.mjs`), and loaded content only fills boxes. The play sheet keeps `GameSheet`/`MiniGameHost` behaviour and is re-skinned (felt panel, ticket tiers, stamp result, confetti). Effects are CSS transform/opacity with pure helpers (`tilt`, `tickets`, `confetti`, `reveal`) unit-tested in node.

**Tech Stack:** React 18, styled-components, node:test (`*.test.mjs`), puppeteer QA scripts in `.superpowers/qa/`, local Supabase.

**Spec:** `docs/superpowers/specs/2026-11-11-minigame-redesign-design.md`

## Global Constraints

- Page stays `robots: 'noindex, nofollow'`; no SEO work.
- Do not touch: `games/*/engine.mjs`, `client.mjs`, `useMiniGame.ts`, `minigame.mjs`, migrations, boards' logic/props. `MiniGameHost` props (`game`, `individualId?`, `onClose`) unchanged (`Room.tsx` embeds it).
- Colors: night `#0a1230`, indigo `#1b1f5e`, felt `#0f5d57`, felt-dark `#0a403d`, paper `#fff4d6`, ink `#2b1a3d`, gold `#ffcf5a`, mint `#5fe3b4`, coral `#ff6b8a`. Pokémon tone vars `--hue/--accent/--deep/--glow` stay the sheet's accent.
- Site font only (no new font files). Numerals `font-variant-numeric: tabular-nums`. Radius 28 booths / 20 cards / 14 buttons / 999 pills. Touch targets ≥ 44px. Copy in Vietnamese, sentence case, no all-caps eyebrows.
- Motion: transform/opacity only; ease-out `cubic-bezier(.2,.8,.2,1)`, spring `cubic-bezier(.3,1.4,.4,1)`; 140/260/520 ms. `prefers-reduced-motion`: no sway/tilt/parallax/entrance, state changes instant, content never stuck hidden. Decorative animation paused when `document.hidden`.
- Zero-shift contract: no region is inserted/removed between skeleton, loading, guest, signed-in, error, empty; text slots are line-clamped with reserved lines.
- Widths verified: 320, 360, 390, 768, 1024, 1280, 1440, 1920.
- Git: `git add` named paths only; never `server/dist`, `useBuild.ts`, `ProfileSheet.tsx`, `Room.tsx`, `tsconfig.tsbuildinfo`; commits end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`; `git add -f` for `docs/` and `.superpowers/`; no push. QA against local stack only (dev 5191); clear caches and restart server before QA runs.
- Spec §4 amendment: no separate "tickets area" (a conditional box would shift); tickets live inside each booth in a fixed slot. Record as `Ruling:`.

## Review Focus

- 320×568 and landscape phone (short height): sheet body scrolls, CTA reachable, nothing clipped.
- Long Vietnamese strings (nickname, booth rule, quest label, reset countdown "1 giờ 59 phút") clamp inside their slot, no overflow, no shift.
- `prefers-reduced-motion`: entrance/booth lid/stamp end in the final visible state; nothing stays at opacity 0.
- Status error / zero quests / zero Pokémon / 0 turns: same region boxes as the happy path.
- Device tilt unavailable or permission denied (iOS): falls back to pointer/idle without throwing; hidden tab pauses decoration.
- `Room.tsx` still opens `MiniGameHost` and the sheet works there (no hub-only CSS dependency).

---

### Task 1: Shell, tokens, regions, skeleton parity

**Files:**
- Create: `src/pages/MiniGamePage/hub/regions.mjs`, `regions.test.mjs`, `HubShell.tsx`, `Bulbs.tsx`, `styles.hub.tsx`, `reveal.mjs`, `reveal.test.mjs`, `.superpowers/qa/minigame-shift.mjs`
- Modify: `src/pages/MiniGamePage/pageStyles.tsx` (becomes thin re-export of shell style so `MiniGameSkeleton` import path keeps working), `src/components/PageSkeleton/MiniGameSkeleton.tsx`, `src/pages/MiniGamePage/index.tsx` (compose shell with placeholder boxes only; real content in Task 2)

**Interfaces:**
- Produces:
  - `REGIONS: Record<'title'|'trainer'|'booth'|'quests', { base: number; md: number; lg: number }>` (px heights for <640, 640–1023, ≥1024) and `BREAKPOINTS = { md: 640, lg: 1024 }`.
  - `shouldReveal(storage: Pick<Storage,'getItem'|'setItem'> | null, reduced: boolean): boolean` — true once per session (key `mg-hub-seen`), false when `reduced`, when already seen, or when storage is null/throws.
  - `<HubShell>{children}</HubShell>` with grid areas `title | trainer | booths | quests`; children place themselves with `data-region="title|trainer|booth|quests"`; exports `HubShellStyle`.
  - `<Bulbs />` decorative, `aria-hidden`.

- [ ] **Step 1: Write failing tests.** `regions.test.mjs`: every region has numeric `base/md/lg` > 0; `trainer.base >= 160`, `quests.base >= 360`; `BREAKPOINTS` equals `{md:640, lg:1024}`. `reveal.test.mjs`: fresh storage → `true` and sets key; second call → `false`; `reduced=true` → `false` and key not set; `null` storage → `false`; storage whose `getItem` throws → `false`.
- [ ] **Step 2:** Run `node --test src/pages/MiniGamePage/hub/regions.test.mjs src/pages/MiniGamePage/hub/reveal.test.mjs`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** `regions.mjs` and `reveal.mjs`. Choose region heights so the tallest content fits at 320 (quests: 3 rows × 64 + stamp row + header; trainer: avatar + level + xp + 2 buttons; booth: lid art + 2-line rule + ticket row + CTA).
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Implement `HubShell` + `styles.hub.tsx` + `Bulbs`.** Night sky gradient + stars (CSS), felt table with weave and stitched top edge occupying the lower scene full-bleed, bulb string (≤ 12 animated nodes, sway/twinkle via transform/opacity, `animation-play-state` paused by a `[data-paused]` attribute set from `visibilitychange`; reduced-motion: static). Grid: mobile = title, trainer, booths (1 col), quests; md = `title|trainer` / `booths|quests` (booths 2 cols); lg = same with booths staggered (24px offset on the second) and max width 1120. Each region box sets `height` from `REGIONS` through CSS vars per breakpoint; text slots use `-webkit-line-clamp`. Entrance (`data-reveal` attr when `shouldReveal`): bulbs light left→right, regions rise 80 ms apart, once.
- [ ] **Step 6: Rewrite `MiniGameSkeleton`** to render `<HubShell>` with `.bone` blocks inside each region box (trainer, one booth per `GAMES` entry, quests), same `data-region` attrs; `pageStyles.tsx` re-exports so both import one shell. Rewrite `index.tsx` to render the same shell with empty region boxes (content comes in Task 2) and keep `setSeoTag`, `useAccount`, `MiniGameHost` wiring.
- [ ] **Step 7: Write `minigame-shift.mjs`** (puppeteer, local only, abc seed account + guest): for each width in the matrix and each of guest/signed-in — (a) delay the MiniGamePage chunk request by 1.5 s (request interception) and capture `getBoundingClientRect()` of every `[data-region]` from the skeleton; (b) after load capture again; assert per-region |Δtop|,|Δheight|,|Δleft|,|Δwidth| ≤ 1px; (c) `PerformanceObserver('layout-shift')` sum must be 0.00 (ignore `hadRecentInput`); (d) every region `scrollHeight <= clientHeight + 1`; (e) `documentElement.scrollWidth <= innerWidth`. Save screenshots `.superpowers/qa/shots/hub-shell-<w>-<state>.png`.
- [ ] **Step 8:** Clear caches, restart dev server, run `node .superpowers/qa/minigame-shift.mjs`. Expected: ALL PASS (regions are empty boxes at this point, so parity is by construction). Run JS suite `find src/pages/MiniGamePage -name '*.test.mjs' | xargs node --test` and `npx tsc --noEmit -p .`. Expected: green / clean.
- [ ] **Step 9: Commit** named files + `git add -f .superpowers/qa/minigame-shift.mjs` → `feat(minigame): arcade hub shell, fixed regions and matching skeleton`.

---

### Task 2: Hub content (trainer holo card, booths, tickets, stamp card)

**Files:**
- Create: `src/pages/MiniGamePage/hub/HoloCard.tsx`, `Booth.tsx`, `TicketRow.tsx`, `StampCard.tsx`, `tilt.mjs`, `tilt.test.mjs`, `tickets.mjs`, `tickets.test.mjs`
- Modify: `src/pages/MiniGamePage/index.tsx`, `hub/styles.hub.tsx`, `src/components/PageSkeleton/MiniGameSkeleton.tsx` (bones match new inner layout)
- Reuse unchanged: `useQuests`, `quests.mjs`, `GiftChest`, `trainer/AvatarPicker`, `trainer/TeamPicker`, `GameSheet`; `QuestCard.tsx` and `trainer/TrainerCard.tsx` are replaced in render by `StampCard`/`HoloCard` (move their claim/sheet logic across; delete the old files once unused).

**Interfaces:**
- Produces:
  - `tiltFromPointer({ x, y, width, height }, max = 12): { rx: number; ry: number; sx: number; sy: number }` — x/y relative to the element; center → zeros; edges → ±max; `sx/sy` are 0..100 foil position percentages; non-finite or zero-size → centered zeros.
  - `tiltFromOrientation({ beta, gamma }, max = 12)` — gamma → ry, beta (offset 45°) → rx, clamped to ±max; null/NaN → zeros.
  - `ticketStates(left: number, total: number): ('ready' | 'torn')[]` — length `total`; `left` clamped to 0..total; non-finite → all `'torn'`.
  - `<HoloCard mg />`, `<Booth game mg onPlay />`, `<TicketRow left total resetText />`, `<StampCard mg />`; all fill their region box and expose `data-region`.

- [ ] **Step 1: Write failing tests.** `tilt.test.mjs`: center → `{rx:0, ry:0, sx:50, sy:50}`; right edge `ry === 12`; top edge `rx === 12`; orientation `{beta:45,gamma:0}` → zeros, `{gamma:90}` → `ry` clamped 12, `{beta:null}` → zeros; zero-size rect → zeros. `tickets.test.mjs`: `(2,3)` → `['ready','ready','torn']`; `(-1,3)` all torn; `(9,3)` all ready; `(NaN,3)` all torn; `(0,0)` → `[]`.
- [ ] **Step 2:** Run `node --test src/pages/MiniGamePage/hub/tilt.test.mjs src/pages/MiniGamePage/hub/tickets.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `tilt.mjs`, `tickets.mjs`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Implement components.**
  - `HoloCard`: glass card with foil gradient following `--sx/--sy`, rx/ry rotation applied by rAF-throttled `pointermove` and (when `DeviceOrientationEvent` exists and permission is not required, or already granted) `deviceorientation`; never calls `requestPermission` unprompted; reduced-motion = no rotation, static foil. Signed-in: avatar button (opens existing avatar sheet), `Cấp n`, segmented xp readout (`role="img"` label kept), `Đội hình a/b` button, owned count. Guest/loading: same box, "Khách" card with `Đăng nhập` link and practice note; loading shows bones. Never returns `null`.
  - `Booth`: tilted box on the felt per `GAMES` entry — lid art (candy: berries from `KIND_ITEMS`; memory: card fan), title, rule line clamped to 2 lines, `levelInfo` hint, `TicketRow`, `Chơi` button (≥ 44px). Tap = lid opens 260 ms (instant under reduced motion) then `onPlay`. Hover/focus: lid lifts + glow.
  - `TicketRow`: paper stubs with perforation; torn stubs animate away only when `left` decreases after mount; text `Còn n/3 lượt` / `Hết lượt, hồi sau …` / guest `Chơi thử` in one fixed-height slot.
  - `StampCard`: 3 quest rows (fixed row height, label clamped to 2 lines, ink-fill progress, `Nhận quà` button ≥ 44px), 7-stamp ring with day 7 = chest, claim = stamp slam (squash + ink burst + `navigator.vibrate?.(10)`), `GiftChest` shown in a fixed overlay slot (no inline growth). Guest/locked/empty/error = same box, rows replaced by a single locked state.
  - `index.tsx`: compose regions; `wait()` helper stays; page-level error from `mg.error` shown inside the trainer/quests boxes, not as a new block.
- [ ] **Step 6:** Update skeleton bones to mirror the new inner structure of each region. Clear caches, restart server, run `node .superpowers/qa/minigame-shift.mjs` (parity must still be ALL PASS with real content, guest and signed-in; add a signed-in state with 0 turns left by setting `minigame_players.used` through local SQL, and a state with the status request failing via request interception). Expected: ALL PASS, CLS 0.00, no region overflow.
- [ ] **Step 7:** Run JS suite and `npx tsc --noEmit -p .`. Expected: green / clean. Screenshot 320/390/768/1280/1440/1920 for guest and signed-in; Read at least 320, 768, 1440 and fix visual defects.
- [ ] **Step 8: Commit** named files (including deletions of `QuestCard.tsx`/`trainer/TrainerCard.tsx`/`styles.quests.tsx` if unused; check with grep first) → `feat(minigame): holo trainer card, booths, tickets and stamp card`.

---

### Task 3: Play sheet re-skin, result, effects

**Files:**
- Create: `src/pages/MiniGamePage/hub/confetti.mjs`, `confetti.test.mjs`, `Confetti.tsx`
- Modify: `GameSheet.tsx`, `styles.tsx`, `styles.play.tsx`, `styles.candy.tsx`, `MiniGameHost.tsx` (markup/class names only; no logic change), `Burst.tsx` if needed

**Interfaces:**
- Produces: `confettiPieces(seed: number, count: number): { x: number; delay: number; dur: number; rot: number; hue: number; size: number }[]` — deterministic per seed; `x` 0..100, `delay` 0..400 ms, `dur` 900..1800 ms, `size` 6..12, `hue` 0..359, length `count`; `<Confetti seed count />` (transform/opacity only, removes itself after the longest piece, renders nothing under reduced motion).

- [ ] **Step 1: Write failing test** `confetti.test.mjs`: same seed → identical arrays; different seed → different; all fields in range; length equals `count`; `count = 0` → `[]`.
- [ ] **Step 2:** Run `node --test src/pages/MiniGamePage/hub/confetti.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `confetti.mjs`; Step 4: run it, Expected PASS.
- [ ] **Step 5: Re-skin.**
  - `GameSheet`/`styles.tsx`: panel = felt with stitched border, tone tints edge + glow, bulbs strip in the header, drag handle kept; mobile bottom sheet, ≥ 640 centered card; `max-height` uses `dvh` and works in landscape phones (`@media (max-height: 480px)` tighter padding).
  - Pick: collectible cards (art, bond hearts, hunger gauge); disabled = face-down card with the reason line and the "Cho ăn trong phòng" link (kept).
  - Level: three ticket tiers with exp range, chest size and loss cost visible; copy unchanged.
  - Count: large 3‑2‑1 with ring pulse (static under reduced motion).
  - HUD: glass pill readout (clock, and score/moves for candy) above the stage; time ring and `mg-mate` kept; board frames tuned to felt (candy/memory cells restyled in CSS only).
  - Result: win = `<Confetti>` + stamp "Thắng" slam; loss = dimmed felt + the existing encouraging copy; bars/chest/level-up kept, `levelUp` pop kept.
  - Keep all existing class hooks used by `.superpowers/qa/minigame-candy.mjs` (`.mgp-play`, board/cell selectors, result text) or update that script in the same commit.
- [ ] **Step 6:** Run JS suite, `npx tsc --noEmit -p .`; clear caches, restart server, run `node .superpowers/qa/minigame-candy.mjs`. Expected: ALL PASS. Update the script for any renamed selector (e.g. `.mgp-play` → booth button) and re-run.
- [ ] **Step 7:** Screenshot the sheet phases (pick, level, count, play candy, play memory, win, loss, confirm-exit) at 320×568, 390×844, 768, 1280 and landscape 640×360; Read them and fix clipping/contrast issues. Verify `Room.tsx` flow still compiles (tsc) and the sheet has no dependency on hub-only CSS.
- [ ] **Step 8: Commit** named files → `feat(minigame): arcade play sheet, stamp result and confetti`.

---

### Task 4: QC matrix, design review, polish

**Files:**
- Create: `.superpowers/qa/minigame-hub.mjs`, `docs/superpowers/qa/2026-11-11-minigame-redesign-qa.md`
- Modify: whatever the findings require (each with a test where logic is involved)

- [ ] **Step 1: Write `minigame-hub.mjs`** (puppeteer, local only): widths 320, 360, 390, 768, 1024, 1280, 1440, 1920 × states guest, signed-in, 0 turns, open-round resume, no Pokémon, status error, reduced-motion. Per run: no horizontal overflow; every button/link/`[role=button]` ≥ 44×44 CSS px (skip decorative `aria-hidden`); contrast ≥ 4.5:1 (body) / 3:1 (large) computed from computed colors over their resolved backgrounds for the text nodes in each region; Tab order reaches every interactive element with a visible focus ring; console/page/network errors empty; reduced-motion run asserts `getAnimations()` of decorative layers is empty and no element has computed opacity 0 in a region; `document.hidden` emulation pauses bulbs (`data-paused`). Flows: open each booth, finish a candy round via solver (reuse `minigame-candy.mjs` helpers), claim a quest, change avatar, change team.
- [ ] **Step 2:** Clear caches, restart server; run `node .superpowers/qa/minigame-hub.mjs`, `node .superpowers/qa/minigame-shift.mjs`, `node .superpowers/qa/minigame-candy.mjs`. Expected: all ALL PASS. Fix failures at the root (not by loosening checks).
- [ ] **Step 3:** Run `/design-review` on `/mini-game` and a candy round (visual + UX: discoverability of booths/tickets, claim feedback, readability of score/time, result, resume, 320 and 1920 composition, "wow" and harmony of the A+B+C blend). Fix findings; re-run Step 2.
- [ ] **Step 4:** Write the QA doc (what ran, widths, states, results, screenshots index, known limits). Run the full suite: JS, tsc, `npx supabase test db` (known flaky reds: kitchen 4, build_items 22). Expected: green except known reds.
- [ ] **Step 5: Commit** named files + `git add -f .superpowers/qa/minigame-hub.mjs docs/superpowers/qa/2026-11-11-minigame-redesign-qa.md` → `test(minigame): redesign QA matrix, design review and polish`.

---

## Self-review (spec coverage)

- §2 concept, §3 tokens → Global Constraints + Task 1 shell, Task 2 components. §4 layout → Task 1 (grid), Task 2 (regions' content; tickets-area amendment noted). §5 play sheet → Task 3. §6 effects → Tasks 1–3 (+ reduced motion/hidden pause in QA). §7 zero shift → Task 1 contract + `minigame-shift.mjs`, re-run in Tasks 2 and 4. §8 files → Tasks 1–3. §9 QC matrix → Task 4. §10 risks → Review Focus.
- Names consistent: `REGIONS`, `shouldReveal`, `tiltFromPointer`, `tiltFromOrientation`, `ticketStates`, `confettiPieces`, `HubShell`, `HoloCard`, `Booth`, `TicketRow`, `StampCard`.
- Deferred (not in this plan): ghép hình and xếp khối (booths are data-driven from `GAMES`), the deferred minors (bag upsert ordering 40P01, streak strip after day-7 claim), merge/push of Candy Rush.
