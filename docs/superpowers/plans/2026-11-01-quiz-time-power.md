# Roar of Time and wild-grass loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A time power for signed-in (and dev) players that freezes a round's gift for 15 s and halves the veil, or refills the turns; and a "wild Pokémon appeared" loading for the quiz.

**Architecture:** Postgres decides charges and the round's clock (a new migration replaces `quiz_public`, `quiz_status`, `quiz_answer` and adds `quiz_clock`, `quiz_time_window`, `quiz_time_stop`, `quiz_time_refill`). `engine/rules.mjs` mirrors the clock for the local engine; the three engines gain `timeStop`/`timeRefill`. The page splits the gift's k from the veil's k, and draws the power (`TimePower.tsx`) and the loading (`WildGrass.tsx`) in CSS/SVG.

**Tech Stack:** Postgres 17 + pgTAP (`yarn db:test`), Node 22 `node --test`, React/Preact + styled-components, Puppeteer for browser checks.

**Spec:** `docs/superpowers/specs/2026-11-01-quiz-time-power-design.md`

## Global Constraints

- Constants: `FREEZE_MS = 15000`, `TIME_CHARGES = 5`, `TIME_WINDOW_MS = 7200000` (2 h, window from the first use, full again when it ends), `VEIL_AFTER_STOP = 0.5`, veil ease 1000 ms.
- Error codes (`P0001` messages, also thrown by the browser engines): `no_round`, `answered`, `time_used`, `time_over`, `no_time`, `has_turns`.
- Only `engine.rewards` engines show the power (server, local); guest throws `no_time`.
- Nothing in `server/src`; never commit `server/dist/*`.
- The first migration (`20261101000000_quiz_game.sql`) is not edited.
- Vietnamese copy, exact: "Gầm Thời Gian", "Gầm Thời Gian: chơi ngay", "tốn 1 trong N lượt", "Dialga đang nghỉ, hồi đầy sau H:MM:SS", "Hết lượt Gầm Thời Gian", "Vòng này đã dừng rồi", "Có gì đó trong bụi cỏ…", "Nó chạy mất rồi!".
- Every chunk ≤ 150 kB; `yarn build` must pass its chunk-cycle check.
- `prefers-reduced-motion`: no spin, spiral or shake; tint, ticks, fades only.

## Review Focus

- A reload during the 15 s freeze: the page must resume frozen for exactly the time left, with the veil already halved (Task 4 e2e step).
- The server froze later than the page by the network delay: an answer right before the freeze ends must still win the locked gift (server's 400 ms grace; Task 1 test "answer at the end of the freeze").
- A refused stop (charges spent on another device): the veil must add back the frozen time, not jump or stall (Task 4).
- `quiz_answer`'s returned status must carry `time_left`/`time_refill_at`, or the power's counter turns `undefined` after every answer (Task 1 test, Task 3 mapping test).
- The out-of-turns refill while a window's `refill_at` is in the future: the Snorlax screen must leave (`restUntil` cleared) and a round start (Task 5 e2e).

Ruling (spec correction): the spec's example "answered at 30 s is judged at 15 s" is a time-out (15 s > 14.4 s). The tests use "stopped at 3 s, answered 25 s after the start: clock 10 s, slot 3" instead.

---

### Task 1: The database rules

**Files:**
- Create: `supabase/migrations/20261102000000_quiz_time.sql`
- Create: `supabase/tests/database/quiz_time.test.sql`

**Interfaces:**
- Produces (SQL):
  - columns `quiz_players.time_start timestamptz`, `quiz_players.time_used smallint not null default 0`, `quiz_rounds.frozen_at timestamptz`
  - `public.quiz_clock(p_round public.quiz_rounds) returns numeric` (ms): `extract(epoch from now() - started_at)*1000` minus `least(15000, greatest(0, extract(epoch from now() - frozen_at)*1000))` when `frozen_at` is set
  - `public.quiz_time_window(p_user uuid) returns public.quiz_players`: locks the row (calls `quiz_window`), resets `time_start = null, time_used = 0` when `now() >= time_start + interval '2 hours'`
  - `quiz_public` adds `'frozen_at'`; `quiz_status` and `quiz_answer` add `'time_left'` (`5 - time_used`) and `'time_refill_at'` (`time_start + 2 h`)
  - `quiz_answer`: `v_elapsed := public.quiz_clock(v_round)` (the only rule change; the rest copied as is)
  - `quiz_time_stop(p_round uuid) returns jsonb` (the round, `quiz_public`); errors in this order: `no_round`, `answered`, `time_used` (frozen_at set), `time_over` (`quiz_clock >= duration_ms`), `no_time`
  - `quiz_time_refill() returns jsonb` (the status, as `quiz_status`); errors: `has_turns` (`quiz_left > 0`), `no_time`; resets `window_start = null, used = 0, bonus = 0, rerolls = 0, wins = 0, window_gifts = '{}'`
  - grants: both RPCs to `authenticated` only; new helpers revoked from `public, anon, authenticated`

- [ ] **Step 1: Write the failing test** `quiz_time.test.sql` (pgTAP, same style and users as `quiz.test.sql`, its own `begin … rollback`). Helpers: `pg_temp.backdate(name, secs)`, `pg_temp.freeze_at(name, secs_ago)` (security definer, sets `frozen_at = now() - secs`), `pg_temp.time_start(user, secs_ago)`. Cases:
  - status of a new player: `time_left = 5`, `time_refill_at` null
  - 5 stops on 5 rounds succeed; the 6th throws `no_time`; `time_refill_at` = first use + 2 h
  - `time_start` moved 2 h back: `time_left = 5` again
  - second stop on the same round: `time_used`; stop on an answered round: `answered`; on Gary's round as Ash: `no_round`
  - round backdated 15 s, never stopped: `time_over`
  - started 15 s ago, `frozen_at` 12 s ago: right answer wins `gifts[1]` (slot 0)
  - started 25 s ago, `frozen_at` 22 s ago: right answer, outcome `right`, slot 3 (unstopped, the same round is `time`)
  - answer at the end of the freeze: started 17 s ago, `frozen_at` 15 s ago (clock 2 s): slot 0
  - easy round started 20 s ago, `frozen_at` 18 s ago: not `time`
  - `quiz_answer` result has `time_left` and `time_refill_at`
  - `quiz_public` of a stopped round has `frozen_at`
  - refill with turns left: `has_turns`; after 5 spent turns: `left = 5`, `rerolls_left = 3`, streak and records unchanged, `time_left` one less; with no charge: `no_time`
  - anon: `quiz_time_stop` and `quiz_time_refill` throw permission denied
  - as authenticated: `update public.quiz_players set time_used = 0` changes nothing (RLS, no update policy)

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn db:test 2>&1 | tail -20`
Expected: `quiz_time.test.sql` fails (functions do not exist); `quiz.test.sql` still 58/58.

- [ ] **Step 3: Write the migration** with the interfaces above. `quiz_public`, `quiz_status` and `quiz_answer` are `create or replace` copies of the first migration's bodies with only the listed changes. Apply locally with `supabase migration up` (local stack), not `db:reset`.

- [ ] **Step 4: Run the tests**

Run: `yarn db:test 2>&1 | tail -20`
Expected: all files pass (quiz 58/58, quiz_time all).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261102000000_quiz_time.sql supabase/tests/database/quiz_time.test.sql
git commit -m "feat(quiz): the Roar of Time in the database"
```

### Task 2: The shared rules

**Files:**
- Modify: `src/pages/QuizPage/engine/rules.mjs`
- Modify: `src/pages/QuizPage/catalogue.test.mjs`
- Test: `src/pages/QuizPage/engine/local.test.mjs` (rules cases go with the existing rules tests there)

**Interfaces:**
- Produces:
  - `FREEZE_MS`, `TIME_CHARGES`, `TIME_WINDOW_MS`, `VEIL_AFTER_STOP`
  - `roundClock(elapsedMs: number, frozenAtMs: number | null): number`: `elapsedMs - clamp(elapsedMs - frozenAtMs, 0, FREEZE_MS)`
  - `freezeLeft(elapsedMs, frozenAtMs): number`: ms of the freeze still to run (0 when none)
  - `veilScale(stoppedForMs: number | null): number`: 1 when null, else `1 - (1 - VEIL_AFTER_STOP) * smoothstep(min(1, ms / 1000))`
  - `timeState(stored: {start?, used?}, now): {start: number, used: number}` (fresh `{start: 0, used: 0}` once `now >= start + TIME_WINDOW_MS`); `timeLeft(state)`; `timeRefillAt(state)` (0 before use); `spendTime(state, now)`

- [ ] **Step 1: Write the failing tests**
  - `roundClock(15000, 3000) === 3000`, `roundClock(25000, 3000) === 10000`, `roundClock(5000, null) === 5000`, `roundClock(10000, 3000) === 3000`
  - `freezeLeft(10000, 3000) === 8000`, `freezeLeft(25000, 3000) === 0`
  - `verdictOf(round, answerId, roundClock(25000, 3000))` → right, slot 3; with `roundClock(25000, null)` → time (same numbers as Task 1)
  - `veilScale(null) === 1`, `veilScale(0) === 1`, `veilScale(1000) === 0.5`, `veilScale(500)` strictly between
  - `timeState` refills at `start + TIME_WINDOW_MS`; `spendTime` starts the window on the first use only
  - catalogue: the migration's `interval '2 hours'`, `15000` and `5 - ` match `TIME_WINDOW_MS`, `FREEZE_MS`, `TIME_CHARGES`

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test src/pages/QuizPage 2>&1 | tail -8`
Expected: FAIL, `roundClock` (etc.) is not exported.

- [ ] **Step 3: Implement** in `rules.mjs`.

- [ ] **Step 4: Run them**

Run: `node --test src/pages/QuizPage config 2>&1 | tail -8`
Expected: all pass.

- [ ] **Step 5: Commit** `feat(quiz): the round's clock and the time charges in rules.mjs`

### Task 3: The engines

**Files:**
- Modify: `src/pages/QuizPage/engine/types.ts`, `server.ts`, `local.mjs`, `guest.mjs`
- Test: `engine/server.test.mjs`, `engine/local.test.mjs`

**Interfaces:**
- Consumes: Task 2's exports; Task 1's RPCs and JSON fields.
- Produces:
  - `PlayRound.frozenAtMs: number | null`, `PlayRound.freezeLeftMs: number` (at the moment the round reached the page); `elapsedMs` is now the round's clock (`roundClock`)
  - `Status.timeLeft: number`, `Status.timeRefillAt: number`
  - `QuizEngine.timeStop(round: PlayRound): Promise<PlayRound>`, `QuizEngine.timeRefill(): Promise<Status>`
  - local key `KEYS.time = 'pokedex:quiz-time'`; the stored round gains `frozenAtMs`

- [ ] **Step 1: Write the failing tests**
  - server: a round with `frozen_at` 3 s after `started_at` and `now` 10 s after → `frozenAtMs 3000`, `elapsedMs 3000`, `freezeLeftMs 8000`; `timeStop` calls `quiz_time_stop` with `{p_round}`; `timeRefill` calls `quiz_time_refill` and maps the status; status and answer map `time_left`/`time_refill_at` (missing → 0)
  - local: 5 stops then `no_time`; charges back after 2 h (injected `now`); second stop `time_used`; stop after the duration `time_over`; a stopped round answered 25 s after start is right with slot 3; reloaded (a new engine on the same storage) mid-freeze → `freezeLeftMs` right; refill with turns left `has_turns`; refill after 5 turns → `left 5`, `timeLeft 4`, streak kept
  - guest: `timeStop` and `timeRefill` reject `no_time`; status has `timeLeft 0`

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test src/pages/QuizPage 2>&1 | tail -8`
Expected: FAIL on the new cases only.

- [ ] **Step 3: Implement** the three engines. Local `answer` judges on `roundClock(now - startedAt, pending.frozenAtMs ?? null)`; local refill saves `KEYS.turns` as `{}` (a fresh window).

- [ ] **Step 4: Run them**

Run: `node --test src/pages/QuizPage config 2>&1 | tail -8` and `yarn tsc --noEmit -p . 2>&1 | tail` (or the repo's type check)
Expected: all pass, no type errors in `src/pages/QuizPage`.

- [ ] **Step 5: Commit** `feat(quiz): timeStop and timeRefill in the engines`

### Task 4: Stopping time on the stage

**Files:**
- Create: `src/pages/QuizPage/TimePower.tsx` (the button, its ticks and countdown, the coach bubble; `TimeStopFx`, the overlay: shockwave, clock face, crystal, 15 edge ticks, shatter)
- Modify: `src/pages/QuizPage/Veil.tsx`, `src/pages/QuizPage/index.tsx`, `src/pages/QuizPage/styles.tsx` (stage tint `[data-frozen]`)

**Interfaces:**
- Consumes: `engine.timeStop`, `Status.timeLeft/timeRefillAt`, `PlayRound.frozenAtMs/freezeLeftMs`, `veilScale`, `FREEZE_MS`.
- Produces:
  - `Veil` prop `stopRef: MutableRefObject<{ at: number; until: number } | null>` (performance.now times). While `now < until` the clock adds no time; the gift k (`remainingRef`, `data-slot`) comes from the clock; `--k` = gift k × `veilScale(now - at)`.
  - `TimePower` props: `left: number`, `refillAt: number`, `now: number`, `disabled: boolean`, `onUse: () => void`
  - `TimeStopFx` props: `until: number` (performance.now), `startedAt: number`

- [ ] **Step 1: Write the failing browser check** `scratchpad/time-e2e.mjs` (based on `server-e2e.mjs`, dev 5191, signed-in test user): press **T** after the veil shows → within 300 ms the stage has `data-frozen`; `--k` after 1.2 s is about half of `remainingRef`'s k (read `--k` and the prize ring); the slot stays the same for 14 s; answering right at 10 s into the freeze wins `gifts[slot at the stop]` (checked against `quiz_art` and the verdict); after reload mid-freeze the stage is still frozen and `--k` already halved; `quiz_status.time_left` went 5 → 4; set `pokedex:quiz-time` to `{used:0}` in localStorage, reload: still 4; spend all 5 through the API, press T → the note "Hết lượt Gầm Thời Gian" and the veil runs on from where it was (no jump > 0.05 in `--k`); signed out: no `.time-power`; reduced motion (emulated): playable, no animation names on the overlay; no page errors.

- [ ] **Step 2: Run it and watch it fail**

Run: `node scratchpad/time-e2e.mjs`
Expected: FAIL at the first step (no `.time-power`).

- [ ] **Step 3: Implement.** Optimistic use: set `stopRef` and `data-frozen`, then `engine.timeStop(round)`; on success refresh the status; on error `veilElapsed.current += performance.now() - stopRef.at`, clear `stopRef`, show the note (`time_used` → "Vòng này đã dừng rồi", others → "Hết lượt Gầm Thời Gian"). `showRound` sets `stopRef` from `frozenAtMs`/`freezeLeftMs` (`until = now + freezeLeftMs`, `at = until - FREEZE_MS`). Button bottom-left of the stage, key **T** in the existing keydown handler, disabled when revealed, frozen, not loaded or out of charges. Look and timing per the spec's "Stopping time".

- [ ] **Step 4: Run it**

Run: `node scratchpad/time-e2e.mjs` then `node --test src/pages/QuizPage config 2>&1 | tail -4`
Expected: every check passes; screenshots at 375/768/1280 of the freeze reviewed by eye.

- [ ] **Step 5: Commit** `feat(quiz): stop time on the stage`

### Task 5: Waking Snorlax

**Files:**
- Modify: `src/pages/QuizPage/Recharge.tsx`, `src/pages/QuizPage/index.tsx`

**Interfaces:**
- Consumes: `engine.timeRefill`, `Status.timeLeft/timeRefillAt`.
- Produces: `Recharge` props `timeLeft: number`, `timeRefillAt: number`, `onTimeRefill: () => Promise<void>` (rejects with the engine's error). Recharge plays the wake (clock spins 3 h, sun and moon, Snorlax wakes, 5 turns pop, ≈1.6 s) after the promise resolves, then calls `onPlay`.

- [ ] **Step 1: Extend `time-e2e.mjs`:** spend the 5 turns through the API, open the page → Snorlax with "Gầm Thời Gian: chơi ngay" and "tốn 1 trong N lượt"; click → within 3 s a new round's veil (`.stage[data-veiled]`), `quiz_status.left` 4 (one turn spent by the new round), `time_left` one less; with 0 charges the button is disabled and shows the countdown.

- [ ] **Step 2: Run it, watch it fail** (`node scratchpad/time-e2e.mjs`; Expected: no refill button).

- [ ] **Step 3: Implement.** The page's `onTimeRefill`: `setStatus(await engine.timeRefill())`; Recharge's `onPlay` already clears `restUntil` and calls `next()`. Errors show the note under the button.

- [ ] **Step 4: Run it** (Expected: all checks pass, screenshot of the wake at 375 reviewed).

- [ ] **Step 5: Commit** `feat(quiz): wake Snorlax with the Roar of Time`

### Task 6: A wild Pokémon appeared

**Files:**
- Create: `src/pages/QuizPage/WildGrass.tsx` (`WildGrass` with prop `fled?: boolean`; `Encounter`, the battle transition)
- Modify: `src/pages/QuizPage/Prize.tsx` (`PrizeSlot` becomes the reel; `Prize` gets a landing animation on mount), `src/pages/QuizPage/index.tsx` (grass on the stage while `!round || !loaded`; `Encounter` keyed by round id when `loaded` turns true; the `imageFailed` screen shows `<WildGrass fled />` and "Nó chạy mất rồi!")

**Interfaces:**
- Consumes: `itemSprite`, `TIERS`, `ITEMS` (the reel shows 6 catalogue sprites, one per tier and two common).

- [ ] **Step 1: Write the failing browser check** `scratchpad/grass-e2e.mjs` (dev 5190, local engine; delay `/api/quiz-art` or the artwork URL by 2 s with request interception): while waiting `.wild-grass` exists, its `aria-live` text is "Có gì đó trong bụi cỏ…", a `.bang` appears within 2 s; no "Quà đang tới…" anywhere; the reel `.prize-reel` spins; after load `.encounter` exists and is gone within 700 ms; the prize shows `gifts[0]`; abort the artwork request 3 times → "Nó chạy mất rồi!" with the grass `[data-fled]`; reduced motion: no running animation on `.wild-grass` blades; no page errors.

- [ ] **Step 2: Run it, watch it fail** (Expected: no `.wild-grass`).

- [ ] **Step 3: Implement** per the spec's "A wild Pokémon appeared".

- [ ] **Step 4: Run it** plus `node scratchpad/qc.mjs` (the existing quiz QC must stay green). Expected: all pass; screenshots 375/768/1280 reviewed.

- [ ] **Step 5: Commit** `feat(quiz): a wild Pokémon appeared while the artwork loads`

### Task 7: Build, docs, full check

**Files:**
- Modify: `docs/quiz-server-game.md` (the pieces table: the second migration and its test; the deploy step: the new migration needs `yarn start:redis-api:pm2:worker`)
- Modify (only if a chunk passes 150 kB): `config/vite.production.config/utils/splitChunkPageParts.ts`

- [ ] **Step 1:** `yarn build 2>&1 | tail -20` → Expected: passes, no chunk cycle, largest JS ≤ 150 kB (`ls -S dist/*.js | head -3` with sizes).
- [ ] **Step 2:** production check: run `server/dist/index.uws.js` on the LAN IP as before and `node scratchpad/prod-errors.mjs http://192.168.10.154:8080` → 0 page errors; `time-e2e.mjs` against it signed in.
- [ ] **Step 3:** full suites: `yarn db:test`, `node --test src/pages/QuizPage config` → all green.
- [ ] **Step 4: Commit** `docs(quiz): the Roar of Time on the VPS` (and the chunk entry if any).
