# Mini game arcade cabinets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the trainer profile to the account page; rebuild the `/mini-game` hub as two self-playing arcade cabinets under a lit marquee, with a slim stamp strip and a zero-shift skeleton.

**Architecture:** Keep `HubShell` (sky, felt, bulbs, fixed-height `data-region` boxes, shared with `MiniGameSkeleton`). Delete the `trainer` region. `Booth` becomes `Cabinet` whose screen replays a deterministic attract demo (Candy: real engine run; Memory: scripted flips through `applyFlip`). Mobile shows the two cabinets in a scroll-snap row. Trainer card code moves to `AccountPage/TrainerCard.tsx`, lazy-loaded.

**Tech Stack:** React, styled-components, node:test (`.test.mjs`), puppeteer QA scripts in `.superpowers/qa`.

**Spec:** `docs/superpowers/specs/2026-11-11-minigame-arcade-design.md` (tokens/shell/zero-shift from `2026-11-11-minigame-redesign-design.md`).

## Global Constraints
- Local stack only (dev 5191, local Supabase, seed `abc@gmail.com`); nothing pushed; never commit `server/dist`, `useBuild.ts`, `ProfileSheet.tsx`, `Room.tsx`, `tsconfig.tsbuildinfo`; named files only; commit trailer `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Engine, RPCs, DB, `useMiniGame` API, play sheet, boards untouched. Page stays `noindex`.
- Tokens: night `#0a1230`, indigo `#1b1f5e`, felt `#0f5d57`/`#0a403d`, paper `#fff4d6`, ink `#2b1a3d`, gold `#ffcf5a`, mint `#5fe3b4`, coral `#ff6b8a`. Radius 28/20/14/999. Touch targets ≥44px. Text contrast ≥4.5:1.
- Zero shift: skeleton vs loaded region rects ≤1px, CLS 0 inside `[data-hub-shell]`, no horizontal overflow, 320→1920.
- Region heights (px): title 120 base / 140 md+; booth 440 base / 520 md / 600 lg; quests 168 base / 136 md+. `trainer` removed.
- Motion: transform/opacity only; demos paused off-screen and when `document.hidden`; `prefers-reduced-motion` = static frame, no sway/spotlight.
- Test commands: JS `find src/pages -name '*.test.mjs' | xargs node --test`; `npx tsc --noEmit -p .`; QA `node .superpowers/qa/minigame-shift.mjs`, `minigame-candy.mjs`, `minigame-hub.mjs`. Dev server `ENABLE_SUPABASE=true DEV_PORT=5191 node config/scripts/dev.mjs --port 5191`, re-seed `node .superpowers/qa/seed-abc.mjs`, clear caches before each run.

## Review Focus
1. Account page with zero Pokémon / status error / 0 turns: TrainerCard keeps its box, shows a message, never throws.
2. Carousel at 320 and with keyboard only: both cabinets reachable, dot reflects the visible one, no layout shift on snap.
3. Reduced motion and hidden tab: demos stop, one static frame, no timers leaking after unmount.
4. Candy demo stays legal if the engine changes (replay test) and never shows a board with a stale swap.
5. Pressing `Chơi` with 0 turns / guest: slot blinks, sheet opens only when allowed (practice for guest).

---

### Task 1: TrainerCard on the account page
**Files:** Create `src/pages/AccountPage/TrainerCard.tsx`, `src/pages/MiniGamePage/trainer/trainerView.mjs`, `trainerView.test.mjs`. Modify `src/pages/AccountPage/index.tsx`.
**Interfaces:**
- Produces: `trainerProgress(trainer: {level:number; xp:number}) -> {pct:number; lit:number; max:boolean; to:number}` (pct 0–100, lit = round(pct/10), `max` at `MINIGAME.LEVEL_MAX`, `to` = xp for next level or current at max); default `TrainerCard()` (no props; uses `useMiniGame`).
- [ ] **Step 1:** Tests in `trainerView.test.mjs`: level 1 xp 0 → pct 0, lit 0; halfway between `xpFor(2)` and `xpFor(3)` at level 2 → pct 50, lit 5; `LEVEL_MAX` → `{pct:100, max:true, to:xpFor(LEVEL_MAX)}`; xp below floor clamps pct to 0; xp above next clamps to 100.
- [ ] **Step 2:** Run `node --test src/pages/MiniGamePage/trainer/trainerView.test.mjs`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `trainerProgress` (clamped) in `trainerView.mjs`. Run again. Expected: PASS.
- [ ] **Step 4:** Create `TrainerCard.tsx` from the signed-in branch of `hub/HoloCard.tsx` (avatar button → `AvatarPicker` in `GameSheet`, team button → `TeamPicker`, xp segments from `trainerProgress`, tilt via existing `tiltFromPointer`/`tiltFromOrientation`). Own styled wrapper with the `.hc*` rules copied from `hub/styles.cards.ts` plus the tokens it uses (`--gold`, `--coral`, `--ease`). Fixed box `height: 200px`; loading, error (with `Thử lại`) and no-trainer states render inside the same box. Account-off/guest never mounts it.
- [ ] **Step 5:** In `AccountPage/index.tsx` signed-in body, render `<Suspense fallback={<div style={{height:200}}/>}><TrainerCard/></Suspense>` (via `React.lazy`) above `.count`. Run `npx tsc --noEmit -p .`; load `/dang-nhap` signed in as the seed account at 390 and 1280 and screenshot; avatar and team sheets open and save.
- [ ] **Step 6:** Commit named files: `feat(account): trainer card on the account page`.

### Task 2: Hub shell without the trainer + marquee
**Files:** Modify `hub/regions.mjs`, `hub/regions.test.mjs`, `hub/styles.hub.tsx`, `hub/HubShell.tsx` (unchanged API), `index.tsx`, `src/components/PageSkeleton/MiniGameSkeleton.tsx`, `hub/styles.cards.ts` (delete `.hc*` rules). Create `hub/Marquee.tsx`. Delete `hub/HoloCard.tsx`.
**Interfaces:** Produces `REGIONS = { title, booth, quests }` each `{base, md, lg}` per Global Constraints; `Marquee({ text, lead })`; grid areas `'title' 'booths' 'quests'` at every width.
- [ ] **Step 1:** Update `regions.test.mjs`: keys are exactly `title, booth, quests`; all positive; `REGIONS.booth.lg >= REGIONS.booth.md >= REGIONS.booth.base`; quests md+ is shorter than base. Run; Expected: FAIL.
- [ ] **Step 2:** Update `regions.mjs`. Run; Expected: PASS.
- [ ] **Step 3:** `styles.hub.tsx`: remove trainer heights/area; `--felt-top = pad + 56 + h-title + gap + h-booth - 96px` so bases stand on the felt; single-column areas; `.hub-booths` is a 2-col grid from md, `lg` no vertical stagger. `Marquee`: `<h1 aria-label={text}>` whose letters are `<span style="--i">` (aria-hidden), lit left→right on reveal then a slow chase; `.hub-sub` stays clamped. Fixed `--h-title`.
- [ ] **Step 4:** `index.tsx`: drop `HoloCard`; render `Marquee`, `HubBooths`, `StampCard`; `MiniGameSkeleton`: title bones, 2 booth boxes, quests box. Delete `HoloCard.tsx`, `.hc*` CSS.
- [ ] **Step 5:** `tsc`, then `WIDTHS=320,768,1280 node .superpowers/qa/minigame-shift.mjs t2` (update its selectors only if needed). Expected: ALL PASS.
- [ ] **Step 6:** Commit: `feat(minigame): hub shell without trainer region, lit marquee`.

### Task 3: Attract demo scripts
**Files:** Create `hub/demo/candyDemo.mjs`, `hub/demo/candyDemo.test.mjs`, `hub/demo/memoryDemo.mjs`, `hub/demo/memoryDemo.test.mjs`, `hub/demo/useDemoClock.ts`.
**Interfaces:**
- Produces `candyFrames({board, tape, pos, moves}) -> {board:number[]; swap:[number,number]; score:number}[]` (frame 0 = start, `swap` null); `MEMORY_DEMO = { cards:number[12], flips:[number,number][] }`; `useDemoClock(count:number, ms:number, active:boolean) -> number` (current index; stops when `!active` or reduced motion → 0).
- [ ] **Step 1:** `candyDemo.test.mjs` (reads `games/candy/vectors.json` `win` vector with `readFileSync`): frames length = moves+1; every move is legal (`trySwap` non-null); score never decreases and ends > 0; deterministic (two calls deep-equal). `memoryDemo.test.mjs`: replaying every `flips` pair through `applyFlip` never throws, ends `done`, includes ≥1 mismatch.
- [ ] **Step 2:** Run both; Expected: FAIL.
- [ ] **Step 3:** Implement both with `trySwap` / `applyFlip`; `useDemoClock` = `setInterval` cleared on unmount/inactive, respects `prefers-reduced-motion`. Rule: interval-driven frames (not a pure CSS timeline) because boards come from the engine; log as a ledger Ruling.
- [ ] **Step 4:** Run both tests; Expected: PASS. Commit: `feat(minigame): deterministic attract demos`.

### Task 4: Cabinet
**Files:** Create `hub/Cabinet.tsx`, `hub/demo/CandyScreen.tsx`, `hub/demo/MemoryScreen.tsx`, `hub/styles.cabinet.ts`. Modify `hub/styles.hub.tsx` (include), `index.tsx` (Booth → Cabinet). Delete `hub/Booth.tsx` and its `.bx*` CSS.
**Interfaces:** Consumes `candyFrames`, `MEMORY_DEMO`, `useDemoClock`, `TicketRow`, `boothLabel`, `tiltFromPointer`. Produces `Cabinet({game,index,server,left,resetText,open,onPlay})` (same props as `Booth`, `data-region="booth"`, button class `mgp-play`).
- [ ] **Step 1:** Build `Cabinet`: body with neon edge in the game's hue, marquee cap with name, screen (`CandyScreen` 6×7 `itemSprite` berries via `KIND_ITEMS`; `MemoryScreen` 3×4 cards), control deck (joystick + 2 buttons, decorative), coin slot, rule line (2-line clamp), `TicketRow`, `Chơi` button. Screens `aria-hidden`; active only when on-screen (IntersectionObserver) and tab visible.
- [ ] **Step 2:** Spotlight: pointer move sets `--sx/--sy` and joystick tilt through `tiltFromPointer` (rAF); touch devices skip. Press `Chơi`: stub slides into the slot (260 ms), screen shows "Sẵn sàng", then `onPlay()`. With `left === 0` on a server account: slot blinks coral, label "Hết lượt", `onPlay` not called.
- [ ] **Step 3:** Entrance: cabinets rise 80 ms apart, screens power on (300 ms flicker), once per visit via existing `data-reveal`. Reduced motion: static frame.
- [ ] **Step 4:** `tsc`; `node .superpowers/qa/minigame-candy.mjs` (update booth selectors to cabinet if needed). Expected: ALL PASS. Screenshot 390 / 1280 and read them.
- [ ] **Step 5:** Commit: `feat(minigame): self-playing arcade cabinets`.

### Task 5: Mobile carousel + stamp strip
**Files:** Create `hub/Carousel.tsx`, `hub/carousel.mjs`, `hub/carousel.test.mjs`. Modify `hub/StampCard.tsx`, `hub/styles.cards.ts`, `hub/styles.hub.tsx`, `index.tsx`.
**Interfaces:** Produces `activeIndex(scrollLeft, itemWidth, count) -> number` (nearest, clamped 0..count-1; non-finite/`itemWidth<=0` → 0); `Carousel({children})` wraps `.hub-booths` below 640px.
- [ ] **Step 1:** `carousel.test.mjs`: 0→0; half item rounds to nearest; beyond end clamps to count-1; negative → 0; `itemWidth` 0 or NaN → 0. Run; Expected: FAIL. Implement; Expected: PASS.
- [ ] **Step 2:** `Carousel`: CSS scroll-snap row (item ≈ 86%, next peeks), dots (buttons ≥44px hit area) that call `scrollTo`, active dot from `activeIndex` on `scroll` (rAF), ArrowLeft/Right when the row is focused; from md up it renders a plain 2-col grid.
- [ ] **Step 3:** `StampCard` as a slim strip: title, a `Trainer Lv n` link to `/dang-nhap` (≥44px; hidden for guests), 3 task chips (progress fill, claim button), 7-stamp streak ending in the chest; mobile chips scroll horizontally inside the fixed box; guest = same box locked with one `Đăng nhập` CTA. Claim/slam/gift logic unchanged.
- [ ] **Step 4:** `tsc`; `node .superpowers/qa/minigame-shift.mjs t5` (all widths, both states). Expected: ALL PASS, CLS 0.
- [ ] **Step 5:** Commit: `feat(minigame): mobile carousel and stamp strip`.

### Task 6: QA matrix, trainer-on-account flows, design review
**Files:** Modify `.superpowers/qa/minigame-hub.mjs`, `minigame-shift.mjs`, `minigame-candy.mjs` (selectors); create `.superpowers/qa/account-trainer.mjs`, `docs/superpowers/qa/2026-11-11-minigame-arcade-qa.md`.
- [ ] **Step 1:** Hub matrix: drop trainer checks; add carousel (touch swipe + keyboard) at 320/390, cabinet spotlight no overflow, 0-turns slot blink, reduced motion static; keep overflow, ≥44px targets, contrast, focus, console errors.
- [ ] **Step 2:** `account-trainer.mjs` (local only, throwaway account via admin API): trainer card shows, avatar change persists, team save persists, zero-Pokémon account shows message.
- [ ] **Step 3:** Run JS suite, `tsc`, shift, candy, hub, account-trainer, pgTAP (known reds: kitchen 4, build_items 22). Expected: all green except those. Screenshot 320/768/1920 and audit visually + UX; fix findings; ledger the QA doc. Commit named files.
