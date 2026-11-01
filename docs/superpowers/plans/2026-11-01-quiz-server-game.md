# Quiz on the Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turns, timing, gifts, streak, records, chests and the bag of "Who's That Pokémon?" decided and stored by Supabase per account, the answer hidden from the browser; guests play without rewards; dev keeps the browser game.

**Architecture:** Postgres owns the game (tables + security-definer RPCs, pgTAP-tested). The Node server proxies the round's artwork and cry by round id, using the service role. The page talks to one `QuizEngine` interface with three implementations (local, server, guest) picked by `useQuizMode()`.

**Tech Stack:** Supabase (Postgres 15, PostgREST, pgTAP via `yarn db:test`), uWebSockets.js server, React 19 / Preact, styled-components, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-01-quiz-server-game-design.md`

## Global Constraints

- Mode: `signed-in → 'server'`, else `import.meta.env.DEV → 'local'`, else `'guest'`.
- Rule values are those of `src/pages/QuizPage/items.mjs` and `progress.mjs` today: `TURNS = 5`, `WINDOW_MS = 3 h`, `VEIL_SECONDS = { easy: 14, hard: 22 }`, `SLOT_AT = [0.75, 0.5, 0.25, 0]`, `SLOT_WEIGHTS`, `COMBO_SURE`, `COMBO_WEIGHTS`, `SPECIAL_SURE`, `SPECIAL_WEIGHTS`, `BONUS_CHANCE = 0.25`, `COMBO_AT = 10`, `SPECIAL_AT = 10`, combo size 3–5 with 1 sure, special 10 with 3 sure, recent answers avoided: 30.
- Server timing grace: 400 ms. Free rerolls: 3 per window.
- RLS on every new table; tables start with `revoke all … from anon, authenticated` then grant exactly what is listed (pattern of `20261031000001_explicit_grants.sql`).
- `quiz_rounds` is never selectable by `anon`/`authenticated`; `quiz_art` is executable by `service_role` only.
- Error codes from RPCs: raise with `errcode = 'P0001'` and messages `no_turns`, `no_round`, `answered`, `no_rerolls`, `bad_range`.
- Never commit `server/dist/*`. Chunk budget 150 kB per file.
- UI copy in Vietnamese; guest call to action: "Đăng nhập để nhận quà, lượt chơi và chuỗi".

## Review Focus

- A round answered twice (double tap, two tabs): the second `quiz_answer` must raise `answered` and award nothing → pgTAP test in Task 2.
- Answer sent after the veil ended but the client says "right": server outcome must be `time`, no gift → pgTAP test in Task 2 (started_at moved back 30 s).
- Window over while a round is pending: resuming it must not spend a turn, and a new round after it starts a fresh window → pgTAP test in Task 2.
- Signing out mid-round in the page: the engine must switch to guest/local without throwing and without showing the account's bag → page test in Task 6 (QC state `server-signout`).
- `/api/quiz-art/<not-a-uuid>` or an unknown round: 404, never a PokeAPI fetch of `undefined` → node test in Task 3.

---

### Task 1: Catalogue and tables

**Files:**
- Create: `supabase/migrations/20261101000000_quiz_game.sql` (tables, RLS, grants, `quiz_items` seed; RPCs come in Task 2 in the same file)
- Create: `src/pages/QuizPage/catalogue.test.mjs`

**Interfaces:**
- Produces: tables `public.quiz_items(id text pk, tier smallint, hard boolean, rank smallint)`, `public.quiz_players(user_id uuid pk, window_start timestamptz, used smallint, bonus smallint, rerolls smallint, wins smallint, window_gifts text[], streak smallint, records smallint, records_total int)`, `public.quiz_rounds(id uuid pk default gen_random_uuid(), user_id uuid, answer_id smallint, options smallint[], veil text, hard boolean, gifts text[], bonus_slot smallint, duration_ms int, started_at timestamptz, answered_at timestamptz, choice smallint, outcome text check in ('right','wrong','time'), slot smallint, won_item text)`, `public.bag(user_id uuid, item_id text references quiz_items, count int check > 0, pk(user_id, item_id))`.

- [ ] **Step 1: Write the failing test** `catalogue.test.mjs`: read the migration file, extract the `insert into public.quiz_items … values` tuples with a regex, assert they equal `ITEMS.map((item, rank) => [item.id, item.tier, !!item.hard, rank])` from `items.mjs`, in order.
- [ ] **Step 2: Run** `node --test src/pages/QuizPage/catalogue.test.mjs` → FAIL (file missing).
- [ ] **Step 3: Write the migration's tables part.** RLS: `bag` select own; `quiz_players` select own; `quiz_rounds` none; `quiz_items` select for `anon, authenticated`. No insert/update/delete grants on any of them. Seed `quiz_items` (62 rows) from the catalogue.
- [ ] **Step 4: Run** the test → PASS; `yarn db:reset` applies cleanly.
- [ ] **Step 5: Commit** `feat(quiz): game tables and item catalogue in the database`

### Task 2: The game's RPCs

**Files:**
- Modify: `supabase/migrations/20261101000000_quiz_game.sql` (append functions)
- Create: `supabase/tests/database/quiz.test.sql`

**Interfaces:**
- Consumes: Task 1 tables.
- Produces (all `security definer set search_path = ''`, `returns jsonb`, granted to `authenticated` unless noted):
  - `quiz_status()` → `{ left, refill_at, now, used, bonus, wins, window_gifts, streak, records, records_total, rerolls_left, pending }`, `pending` = public round or null.
  - `quiz_start(p_from smallint, p_to smallint, p_hard boolean)` → public round `{ id, options, veil, hard, gifts, bonus, duration_ms, started_at, now }`. Resumes the pending round if any (no turn spent); else spends a turn (`no_turns` if none), draws answer + 3 distinct options in `p_from..p_to` (`bad_range` if fewer than 4 ids), avoiding the user's last 30 answers, a veil different from the previous round's, gifts and bonus slot.
  - `quiz_answer(p_round uuid, p_choice smallint)` → `{ outcome, answer_id, slot, gift, lucky, missed, chests: [{kind, gifts}], streak, records, records_total, left, refill_at, wins, window_gifts }`. `outcome = 'time'` when server elapsed ≥ `duration_ms + 400`; slot from `k` at `elapsed - 400` (clamped ≥ 0).
  - `quiz_reroll(p_round uuid)` → a new public round replacing an unanswered one, no turn spent, `no_rerolls` after 3 in the window.
  - `quiz_art(p_round uuid)` → `smallint` answer id; `service_role` only.
  - Private helpers (no grants): `quiz_draw(p_weights jsonb, p_hard boolean, p_taken text[]) returns text`, `quiz_chest(p_size int, p_sure int, p_sure_w jsonb, p_rest_w jsonb) returns text[]`, `quiz_window(p_user uuid) returns public.quiz_players` (row, reset if the window ended).

- [ ] **Step 1: Write the failing pgTAP tests** in `quiz.test.sql` (pattern of `rls.test.sql`, two users), each a `select is/ok/throws_ok`:
  - start spends a turn: `quiz_status()->>'left'` goes 5 → 4; start again resumes the same id, still 4.
  - six rounds answered → the next `quiz_start` throws `no_turns`; `refill_at = window_start + 3 h`.
  - `update quiz_players set window_start = now() - interval '3 hours 1 second'` → start works, `left` back to 4.
  - right answer at once (`started_at = now()`) → `outcome = 'right'`, `slot = 0`, `gift = gifts[1]`, bag count for it = 1.
  - right answer with `started_at = now() - interval '30 seconds'` → `outcome = 'time'`, no bag row added, streak 0.
  - wrong choice → `outcome = 'wrong'`, streak 0, `missed` = the slot's gift.
  - answering twice → `answered`.
  - `quiz_players.streak = 9` then a right answer → one chest `kind = 'combo'` with 3–5 gifts, at least one tier ≥ 3, streak 0, records + 1; with `records = 9` too → two chests, the second `special` with 10 gifts, ≥ 3 tier ≥ 3, records 0.
  - typed off (`p_hard = false`) → no gift id with `quiz_items.hard`.
  - `select * from quiz_rounds` as authenticated → 0 rows/permission denied; `insert into bag` → `42501`; `quiz_art()` as authenticated → `42501`; another user's round id in `quiz_answer` → `no_round`.
  - reroll 3 times works, the 4th throws `no_rerolls`.
- [ ] **Step 2: Run** `yarn db:test` → the new file FAILS.
- [ ] **Step 3: Implement the functions.** Smoothstep `t*t*(3-2*t)`; weights as jsonb literals copied from `items.mjs`; ranks from `quiz_items.rank` for "most valuable first"; random via `random()`.
- [ ] **Step 4: Run** `yarn db:test` → all PASS (including `rls.test.sql`).
- [ ] **Step 5: Commit** `feat(quiz): rounds timed and judged by the database`

### Task 3: Artwork and cry through the server

**Files:**
- Create: `server/src/api/routes/quiz/index.uws.ts`, `server/src/api/routes/quiz/art.ts`, `server/src/api/routes/quiz/art.test.mjs`
- Modify: `server/src/index.uws.ts` (init before the api router), `server/src/utils/InitEnv.ts` (`SUPABASE_SERVICE_ROLE_KEY?: string`, `SUPABASE_INTERNAL_URL?: string`), `config/scripts/dev.mjs` (pass the local stack's service role / secret key), `config/utils/Supabase.mjs` (production: the server reads `SERVICE_ROLE_KEY` from `infra/supabase/.env`).

**Interfaces:**
- Produces: `GET /api/quiz-art/:round` (image/png) and `GET /api/quiz-cry/:round` (audio/ogg); `answerFor(round: string, fetchImpl?): Promise<number | null>` and `isRoundId(value: string): boolean` in `art.ts`.

- [ ] **Step 1: Write the failing tests** `art.test.mjs`: `isRoundId('x')` false, a v4 uuid true; `answerFor` with a stub fetch returning `25` → 25; stub 404/`null` → null; a non-uuid never calls fetch.
- [ ] **Step 2: Run** `node --test server/src/api/routes/quiz/art.test.mjs` → FAIL.
- [ ] **Step 3: Implement.** `answerFor` posts to `${SUPABASE_INTERNAL_URL || SUPABASE_PUBLIC_URL}/rest/v1/rpc/quiz_art` with the service key; the route streams `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/<id>.png` or the cry; `Cache-Control: private, max-age=900`; 404 on no answer; routes registered only when `ENABLE_SUPABASE`.
- [ ] **Step 4: Run** tests → PASS; `yarn dev` with `ENABLE_SUPABASE=true`, a started round's `/api/quiz-art/<id>` returns a PNG, a random uuid returns 404.
- [ ] **Step 5: Commit** `feat(quiz): serve a round's artwork and cry without its number`

### Task 4: The engine interface and the local engine

**Files:**
- Create: `src/pages/QuizPage/engine/types.ts`, `src/pages/QuizPage/engine/local.mjs`, `src/pages/QuizPage/engine/guest.mjs`, `src/pages/QuizPage/engine/local.test.mjs`
- Modify: `src/pages/QuizPage/quiz.mjs` (add `findGuess(guess, species): number`)

**Interfaces:**
- Produces in `types.ts`:
  - `type PlayRound = { id: string; options: number[]; veil: VeilKind; hard: boolean; gifts: string[]; bonus: number; durationMs: number; elapsedMs: number; answerId?: number }`
  - `type Status = { left: number; refillAt: number; streak: number; records: number; recordsTotal: number; wins: number; used: number; bonus: number; windowGifts: string[]; rerollsLeft: number; pending: PlayRound | null }`
  - `type Verdict = { outcome: 'right' | 'wrong' | 'time'; answerId: number; slot: number; gift: string | null; lucky: boolean; missed: string | null; chests: Chest[]; status: Status }`
  - `interface QuizEngine { kind: 'local' | 'server' | 'guest'; rewards: boolean; status(): Promise<Status>; start(opts: { from: number; to: number; hard: boolean; elapsedMs?: number }): Promise<PlayRound>; answer(round: PlayRound, choice: number): Promise<Verdict>; reroll(round: PlayRound): Promise<PlayRound>; art(round: PlayRound): string; cry(round: PlayRound): string }`
- `local.mjs`: `createLocalEngine(storage = localStorage, random = Math.random)` with today's rules (moved from `index.tsx`); `art` = `getPokemonImage(answerId)`.
- `guest.mjs`: `createGuestEngine(random)`: `rewards: false`, rounds with no gifts, `status()` neutral, no storage.
- `findGuess`: the id whose name `matchesGuess` the text, else `-1`.

- [ ] **Step 1: Write the failing tests** `local.test.mjs` with a fake storage and `seeded(1)`: start spends a turn and stores the pending round; start again resumes it; answer right at `elapsedMs 0` gives slot 0 and the gift in the bag; `elapsedMs 30000` gives `time`; 5 rounds then `start` rejects with `no_turns`; streak 9 + right → a combo chest; guest `start` never touches storage and `answer` returns `gift: null`; `findGuess('mr mime', species)` → 122.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** by moving the logic out of `index.tsx` (`choose`, `next`, pending round keeping) into `local.mjs`, using `progress.mjs` / `items.mjs` unchanged.
- [ ] **Step 4: Run** all QuizPage tests → PASS.
- [ ] **Step 5: Commit** `refactor(quiz): the game behind one engine interface`

### Task 5: The server engine and the mode

**Files:**
- Create: `src/pages/QuizPage/engine/server.ts`, `src/pages/QuizPage/engine/useQuizEngine.ts`
- Test: `src/pages/QuizPage/engine/server.test.mjs` (maps RPC payloads with a stub client)

**Interfaces:**
- Consumes: `getSupabase()`, `useAccount()` (`src/app/supabase/*`), Task 4 types.
- Produces: `createServerEngine(supabase): QuizEngine` (`art` = `/api/quiz-art/${id}`, `cry` = `/api/quiz-cry/${id}`, errors re-thrown as `Error(message)` with the RPC message); `useQuizEngine(): { engine: QuizEngine | null; mode: 'local' | 'server' | 'guest' | 'checking' }`, recreated on sign-in/out; in DEV, `localStorage['pokedex:quiz-mode'] = 'guest'` forces guest (for QC).

- [ ] **Step 1: Write the failing test**: stub `rpc(name, args)` returning the Task 2 payloads; `status()` maps snake_case to `Status` with `refillAt` in ms; `answer` maps `chests`; an RPC error `no_turns` rejects with message `no_turns`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(quiz): play against the account's game when signed in`

### Task 6: The page on the engine; guests

**Files:**
- Modify: `src/pages/QuizPage/index.tsx`, `src/pages/QuizPage/Veil.tsx` (`wallClock?: boolean`: elapsed follows the wall clock, no hidden-tab pause), `src/pages/QuizPage/styles.tsx`, `src/components/PageSkeleton/QuizSkeleton.tsx` only if geometry moves.

**Interfaces:**
- Consumes: `useQuizEngine()`, `QuizEngine`, `findGuess`.

- [ ] **Step 1:** Replace direct storage use with the engine: `next()` → `engine.start`, `choose()` → `engine.answer` (reveal on the verdict), timeout → `engine.answer(round, -2)`, broken art → `engine.reroll`, images/cry → `engine.art/cry`; options' names from the species list by id; `no_turns` → the Snorlax screen.
- [ ] **Step 2:** `engine.rewards === false` (guest): hide the meters, the prize orb, the loot, the recap and the HUD bag; show the call to action linking `/dang-nhap` with `state.from`.
- [ ] **Step 3:** Verify with the QC matrix (Task 8 adds the states) and by hand in `yarn dev` signed in against the local stack: start, answer, reload mid-round (same Pokémon, clock kept), out of turns, countdown unaffected by editing localStorage.
- [ ] **Step 4: Commit** `feat(quiz): the page plays the engine; guests play without rewards`

### Task 7: The bag from the account

**Files:**
- Create: `src/pages/BagPage/bagStore.ts`
- Modify: `src/pages/BagPage/index.tsx`, `src/pages/QuizPage/index.tsx` (HUD count), `src/components/common/Header/index.tsx`, `src/components/common/MenuBar/index.tsx`

**Interfaces:**
- Produces: `useBagStore(): { bag: Record<string, number> | null; mode: 'local' | 'server' | 'guest' | 'checking'; refresh(): void }` (server: `select item_id, count from bag`; local: localStorage + storage event); `refreshBag()` called after a verdict.

- [ ] **Step 1:** Bag page and HUD read `useBagStore`; guest → a sign-in prompt in place of the list.
- [ ] **Step 2:** Header/menu: hide "Túi đồ" when `account.status === 'off'` and not DEV.
- [ ] **Step 3:** QC states pass; **Commit** `feat(bag): the account's bag; sign in to keep items`

### Task 8: QC, budget, deploy note

**Files:**
- Modify: QC script states (guest via `pokedex:quiz-mode`), `docs/quiz-server-game.md`

- [ ] **Step 1:** Add QC states `guest-live`, `guest-verdict`, `bag-guest`, `server-signout` (forced via the DEV flag) at 320/375/1440; all clean.
- [ ] **Step 2:** `yarn build` to a staging dir: every file ≤ 150 kB.
- [ ] **Step 3:** Deploy note: run the migration (`supabase db push` locally / the VPS setup script), set `SUPABASE_SERVICE_ROLE_KEY` for the Node server, the art proxy's bandwidth.
- [ ] **Step 4: Commit** `docs(quiz): running the server game`
