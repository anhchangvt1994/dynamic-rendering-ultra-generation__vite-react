# Candy Rush Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Candy Rush (match-3, swap adjacent cells) as the second mini game, reusing turns, exp, bond, combo, chest, care cost, trainer XP and quests.

**Architecture:** The client simulates the board (pure `engine.mjs`); the server stores `layout = {tape, board, pos}` and, on `minigame_finish(round, moves)`, replays the moves in SQL (a line-for-line port of the engine) and settles. JS and SQL share vectors. The host stays generic: the Board contract gains an optional `onMove` event and the finish call gains `moves`.

**Tech Stack:** React + styled-components, plain `.mjs` rules + `node --test`, Supabase Postgres (plpgsql, pgTAP), puppeteer QA.

**Spec:** `docs/superpowers/specs/2026-11-11-minigame-candyrush-design.md`

## Global Constraints

- `MINIGAME.CANDY`: `COLS 6`, `ROWS 7`, `KINDS [4,5,6]`, `MOVES [20,18,16]`, `TARGET [3000,3000,2400]`, `CELL 10`, `TAPE 1000`, `FLAWLESS_LEFT 0.25`. Clock `DURATION_S 300`, `TOLERANCE_S 5`.
- Cell index `row * COLS + col`, row 0 on top. Move `[a, b]` = adjacent cells (same row ±1 col, or same col ±1 row) and must create a line ≥ 3.
- Tape value `i` = `md5(seed::text || ':t:' || i::text)` mapped to `0..KINDS-1`; index wraps at `TAPE`.
- Initial board: reading order, take next tape value, skip (consume) a value that makes 3 in a row with the 2 cells to the left or above; if no valid move, regenerate the whole grid from the current tape position.
- Move: swap → per depth `d=1,2,…` clear the union of all runs ≥ 3, score `CELL × d` per cell → gravity → refill (columns left→right; in a column from the lowest empty cell upward, next tape value) → repeat; `comboLen` = depth count. After the move, no valid move left → regenerate (free).
- Win = score ≥ `TARGET[d]` within `MOVES[d]`, ends at once. Loss = out of moves, or past `deadline + TOLERANCE_S`. `combo = min(0.10, 0.02 × (best − 1))` when `best ≥ 2`, wins only. Flawless = win with `movesLeft ≥ ceil(0.25 × MOVES[d])`.
- Lock order stays Pokémon → care → bag → trainer → quests. `finish` replay reads `layout` only.
- `minigame_rules()` JSON (between `$rules$` tags) must equal `MINIGAME` (`sqlParity.test.mjs`).
- UI copy Vietnamese, accent/glow from the Pokémon `tone`; reduced motion = no movement, information kept.
- Never stage `server/dist` or the user's other uncommitted files (`git add` named paths only). `docs/` and `.superpowers/` need `git add -f`. No push. Commits end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Known flaky pgTAP reds (not ours): kitchen 4, build_items 22, moveset 8.

## Review Focus

1. `finish` with malformed `moves` (not an array, `[1]`, `[1,"a"]`, `null` entries, out-of-range or equal indices) → `bad_move`, never a 500/`network`. Test: pgTAP.
2. Lost reply: second `finish` after settle returns the first receipt, no second reward. Test: pgTAP.
3. Tape shorter than the board consumption (wrap) and a regenerated board mid-chain stay identical in JS and SQL. Test: shared vector with a 40-value tape.
4. Reload mid-round: moves in `sessionStorage` replay; another round's key or corrupt JSON is ignored and the round restarts from move 0. Test: Board/storage unit test.
5. Time runs out while a cascade animates: host settles as lost with the moves made so far; no double `finish`. Test: browser QA.

---

### Task 1: Engine, constants, shared vectors

**Files:**
- Modify: `src/pages/MiniGamePage/minigame.mjs` (add `CANDY` to `MINIGAME`)
- Create: `src/pages/MiniGamePage/games/candy/engine.mjs`, `engine.test.mjs`, `vectors.json`

**Interfaces:**
- Produces (`engine.mjs`, all pure; `tape` is any non-empty int array, wraps by length):
  - `initialBoard(tape: number[], kinds: number, from = 0): { board: number[], pos: number }`
  - `findLines(board: number[]): number[]` sorted indices of cells in runs ≥ 3
  - `hasMove(board: number[]): boolean`
  - `trySwap(state: {board, pos, score}, tape, kinds, a, b): null | { state: {board, pos, score}, swapped: number[], steps: {cleared: number[], gain: number, board: number[]}[], depth: number, regen: boolean }` — `null` = invalid move (no line, not adjacent, out of range, `a === b`, non-integers). `steps[k].board` = board after gravity+refill of depth k+1.
  - `replay(layout: {tape, board, pos}, difficulty: 1|2|3, moves: unknown): { ok: boolean, score, moves, best, movesLeft, won, over }` — `ok=false` for any invalid move, more than `MOVES[d]` moves, or a move after the target was reached.
  - `newTape(random: () => number, kinds: number): number[]` (practice only)
- `vectors.json`: `[{ name, tape, kinds, difficulty, moves, board0, pos0, score, best, won, movesLeft }]` — produced by running the engine, then frozen.

- [ ] **Step 1: Write failing tests** in `engine.test.mjs` (`node:test`): `initialBoard` has no run ≥ 3 and `hasMove`; skipped values consume the tape (`pos` > 42 for a tape forcing a skip); `trySwap` returns `null` for `a===b`, non-adjacent, `[0, 6]`-style wrong-row wrap (`[5, 6]` are not adjacent), no-line swap, floats; a swap making a 3-run scores `30`; L/T shapes clear the union once (`5` cells → `50`); a 2-depth chain scores `CELL×1×n1 + CELL×2×n2` with `depth 2`; refill order (columns left→right, lowest empty upward) on a hand-built board and tape; tape wrap (tape length 3); regen flag when no move remains; `replay` rejects `MOVES+1` moves and a move after reaching the target; `replay` wins at the first move reaching `TARGET` (`over: true`, `movesLeft` counted); every `vectors.json` entry reproduces exactly. Include ≥ 4 vectors: plain, 2-depth chain, regen, wrap (40-value tape).
- [ ] **Step 2:** Run `node --test src/pages/MiniGamePage/games/candy/engine.test.mjs`. Expected: FAIL (module missing).
- [ ] **Step 3:** Add `CANDY` to `MINIGAME` (values from Global Constraints) and implement `engine.mjs` per the rules above. Generate `vectors.json` once with a throwaway script (`node -e`) over hand-picked tapes/moves, review it by eye, commit it.
- [ ] **Step 4:** Run the same command. Expected: all PASS. Run `find src/pages/MiniGamePage -name '*.test.mjs' | xargs node --test`; Expected: sqlParity FAILS on `CANDY` missing from SQL (fixed in Task 2) — everything else PASS.
- [ ] **Step 5: Commit** `git add src/pages/MiniGamePage/minigame.mjs src/pages/MiniGamePage/games/candy` → `feat(minigame): candy engine, constants and shared vectors`.

---

### Task 2: Database — rules, layout, replay, finish, settle, status

**Files:**
- Create: `supabase/migrations/20261123000000_minigame_candy.sql`, `supabase/tests/database/minigame_candy.test.sql`
- Modify: `src/pages/MiniGamePage/sqlParity.test.mjs` (rules block now read from the new migration; add vector-presence test)

**Interfaces:**
- Consumes: `vectors.json`, engine rules (Task 1); current `minigame_settle`/`minigame_status` bodies in `20261122000200_minigame_quests.sql` (lines ~104–280), `minigame_start` in `20261121000100_minigame.sql`.
- Produces (SQL, all `security definer set search_path = ''`, revoked from `public, anon, authenticated` except as noted):
  - `minigame_rules()` — same JSON plus `"CANDY": {"COLS":6,"ROWS":7,"KINDS":[4,5,6],"MOVES":[20,18,16],"TARGET":[3000,3000,2400],"CELL":10,"TAPE":1000,"FLAWLESS_LEFT":0.25}`
  - `minigame_candy_lines(p_board int[]) returns int[]`
  - `minigame_candy_has_move(p_board int[]) returns boolean`
  - `minigame_candy_fill(p_tape int[], p_kinds int, p_pos int) returns jsonb` → `{board, pos}`
  - `minigame_candy_swap(p_board int[], p_tape int[], p_kinds int, p_pos int, p_a int, p_b int) returns jsonb` → `null` if invalid else `{board, pos, gain, depth}`
  - `minigame_layout_candy(p_seed bigint, p_difficulty int) returns jsonb` → `{tape, board, pos}`
  - `minigame_candy_replay(p_layout jsonb, p_difficulty int, p_moves jsonb) returns jsonb` → `{ok, score, moves, best, movesLeft, won, over}`; `ok=false` on any malformed/invalid input
  - `minigame_view(rounds)` for candy → `{kind:'candy', cols, rows, kinds, movesMax, target, board, tape, pos}` (memory view unchanged)
  - `minigame_start(text, uuid, smallint)` accepts `'candy'`; candy `progress` = `{"moves":0,"score":0,"best":0,"movesLeft":<MOVES>,"doneAt":null}`
  - `minigame_finish(p_round uuid, p_moves jsonb default null)` — **replaces** `minigame_finish(uuid)` (`drop function` first; grant `authenticated`); memory path identical to today
  - `minigame_settle` — game-aware; receipt gains `score`, `moves` (null for memory)
  - `minigame_status` — `games` loop over `array['memory','candy']`

- [ ] **Step 1: Write failing pgTAP** `minigame_candy.test.sql` (pattern of `minigame_play.test.sql`: `begin; select no_plan();`, insert `auth.users`, `pokemon_individuals`, `pokemon_care`, then `set local role authenticated` + `request.jwt.claims`). Tests, by name:
  - `vectors`: for each `vectors.json` entry (copy `tape`, `moves`, `score`, `best`, `movesLeft` as literals), `minigame_candy_replay` equals the JS result, and `minigame_candy_fill` equals `board0/pos0`.
  - `layout_candy`: board has 42 cells in `0..kinds-1`, no run ≥ 3, `has_move`, tape length 1000, deterministic for a seed.
  - `start_candy`: returns view with `tape`+`board`; second open candy round → `round_open`; `used` counted per game (memory turns untouched).
  - `bad_move`: `finish(round, '[[0,2]]')`, non-adjacent, no-line, `'[[1]]'`, `'[[1,"a"]]'`, `'"x"'`, `'[null]'`, `MOVES+1` moves, a move after the target → every one raises `bad_move`; round stays `open`.
  - `finish_win`: solver-built move list (insert a round whose `layout` is a hand-built board/tape so one swap reaches `TARGET`; set difficulty 1) → status `won`, receipt `score`, `moves`, `comboLen`, gifts, `minigame_players.wins`=1.
  - `finish_lose_moves`: all `MOVES` moves used, target unreached → `lost` immediately (round with tiny tape so scoring is low).
  - `not_finished`: valid short list, time left → `not_finished`; after setting `deadline` into the past beyond tolerance → `lost`.
  - `combo` (best ≥ 2 → `combo > 0`, capped at 0.10), `flawless` (`quest_bump('flawless')` fired when `movesLeft ≥ ceil(0.25×MOVES)`; not fired otherwise), `play`/`win` quest bumps.
  - `replay_twice`: second `finish` returns the identical receipt, bag unchanged.
  - `owner`: other user's round → `not_found`; `hunger` below `MIN_HUNGER` → `hungry`; `status().games` has `candy` with its own `left`.
  - `expire_candy`: past-deadline open candy round is settled `expired` → receipt status `expired`, no win.
- [ ] **Step 2:** Run `npx supabase test db supabase/tests/database/minigame_candy.test.sql`. Expected: FAIL (functions missing).
- [ ] **Step 3: Implement the migration.** Port the engine into plpgsql over `int[]` (1-based arrays; keep 0-based cell numbers in jsonb/API). Redefine `minigame_settle` by copying the 20261122000200 body and changing only: win condition (`p_status = 'won'` for candy; memory branch untouched), skip the memory `not_finished` raise for candy, `v_len := progress->>'best'` (already), flawless test per game (candy: `(progress->>'movesLeft')::int >= ceil(FLAWLESS_LEFT × MOVES[d])`), receipt `score`/`moves`. `minigame_finish`: advisory lock `':mg:finish'` as today; candy path = replay → `ok=false` raises `bad_move`; write `progress` (`score, moves, best, movesLeft`, `doneAt = now()` on win); won → `settle 'won'`; over without win → `settle 'lost'`; else within `deadline + TOLERANCE_S` → `not_finished`, after → `settle 'lost'`. Redefine `minigame_view`, `minigame_start`, `minigame_status` (copy, minimal edits). Re-issue revoke/grant lines for every new/replaced signature.
- [ ] **Step 4:** Update `sqlParity.test.mjs`: rules block read from `20261123000000_minigame_candy.sql`; new test: the pgTAP file contains, for every vector, `JSON.stringify(v.tape)` and `JSON.stringify(v.moves)` (no spaces) and `v.score`.
- [ ] **Step 5:** Run `npx supabase db reset` (local only) then the pgTAP file again, then `npx supabase test db` and `find src/pages/MiniGamePage -name '*.test.mjs' | xargs node --test`. Expected: candy file all PASS, only the known flaky reds elsewhere, JS all PASS.
- [ ] **Step 6: Commit** `git add supabase/migrations/20261123000000_minigame_candy.sql supabase/tests/database/minigame_candy.test.sql src/pages/MiniGamePage/sqlParity.test.mjs` → `feat(minigame): candy server replay, settle and status`.

---

### Task 3: Client plumbing (finish with moves, types, practice)

**Files:**
- Modify: `src/pages/MiniGamePage/client.mjs`, `client.test.mjs`, `useMiniGame.ts`, `practice.mjs`
- Create: `src/pages/MiniGamePage/practice.test.mjs` (if none exists; else extend it)

**Interfaces:**
- Consumes: `engine.newTape`, `engine.initialBoard` (Task 1); RPC `minigame_finish(p_round, p_moves)` (Task 2).
- Produces:
  - `finishRound(deps, { round, moves? })` → RPC args `{p_round}` when `moves === undefined`, else `{p_round, p_moves: moves}`; `MINIGAME_ERRORS.bad_move = 'Nước đi không hợp lệ'`
  - `useMiniGame`: `finish(args: { round: string; moves?: number[][] })`; `practice(game: string, difficulty: number)`; types `MemoryView` (old `RoundView` shape), `CandyView = { kind: 'candy', cols, rows, kinds, movesMax, target, board: number[], tape: number[], pos: number }`, `RoundView = MemoryView | CandyView`, `Receipt` gains `score?: number; moves?: number`
  - `createPractice({ game = 'memory', difficulty, random })` → for `candy`: `{ view: CandyView, deadline, flip: undefined }` built with `newTape`/`initialBoard` (no network)

- [ ] **Step 1: Write failing tests:** `client.test.mjs` — `finishRound(deps, {round})` sends `{p_round}` only (existing memory expectation) and with `moves` sends `p_moves`; `bad_move` maps to its message. `practice.test.mjs` — candy practice view has 42 cells, `tape.length === 1000`, no run ≥ 3, deterministic for a seeded `random`; memory practice unchanged.
- [ ] **Step 2:** Run `node --test src/pages/MiniGamePage/client.test.mjs src/pages/MiniGamePage/practice.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Implement the interfaces above; keep memory call sites compiling (`useMiniGame.flip` untouched).
- [ ] **Step 4:** Run the same command; Expected PASS. Run `npx tsc --noEmit -p .`; Expected: only the new host/Board type errors from Task 4 callers, if any (none expected yet).
- [ ] **Step 5: Commit** named files → `feat(minigame): finish with moves and candy practice`.

---

### Task 4: Board, host generalization, registry, styles

**Files:**
- Create: `src/pages/MiniGamePage/games/candy/Board.tsx`, `games/candy/moves.mjs` (+ `moves.test.mjs`), `src/pages/MiniGamePage/styles.candy.tsx`
- Modify: `games/index.mjs`, `MiniGameHost.tsx`, `styles.tsx` (include `candyCss`), `games/memory/Board.tsx` (only if prop typing needs it)

**Interfaces:**
- Consumes: `engine.mjs`, `RoundView/CandyView`, `Burst`, `ComboMeter`, `tierOf`, `itemSprite`.
- Produces:
  - `moves.mjs`: `movesKey(roundId: string | null): string` (`mg-candy-moves:<id>`), `loadMoves(storage, roundId): number[][]` (returns `[]` for missing, corrupt, wrong shape or `null` round id), `saveMoves(storage, roundId, moves)`; all try/catch (storage may throw)
  - `GAMES` entries gain `levelInfo(d: 1|2|3): string` (memory: `${pairs} cặp`; candy: `${TARGET} điểm · ${MOVES} nước`) and `winText(o: {flips?, moves?, score?}): string`; add entry `{ id: 'candy', title: 'Candy Rush', blurb: 'Hoán đổi kẹo, xếp 3 ô giống nhau và đạt đủ điểm trước khi hết nước hoặc hết 5 phút.', Board }`
  - Candy `Board` props = existing Board props plus `onMove?(ev: { match: boolean; depth: number; at: number; done: boolean; won: boolean; moves: number[][] })`; it renders its own status row (score/target, moves left) and the 6×7 grid; ignores `flip`. Tap two adjacent cells or swipe; invalid → `data-miss` shake, no move counted; steps animate (pop → drop) from `trySwap().steps`, reduced motion = instant; on mount replays `loadMoves` through the engine; `saveMoves` after each valid move; emits `done` on win (`won: true`) and when moves run out (`won: false`); resumed already-finished state emits `done` once on mount
  - Host: `onResult` body extracted into `react(match, after, index)`; candy `onMove` calls it with `after = ev.depth`; `movesRef` stores `ev.moves`; `settle` passes `moves` to `mg.finish` when the game is candy; level list shows `def.levelInfo(d)`; practice result text from `def.winText`; `again()` unchanged

- [ ] **Step 1: Write failing tests** `moves.test.mjs`: round trip; other round id → `[]`; corrupt JSON → `[]`; `[[1,2],[3]]` wrong shape → `[]`; throwing storage → `[]` / no throw; `null` round id → `[]`.
- [ ] **Step 2:** Run `node --test src/pages/MiniGamePage/games/candy/moves.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Implement `moves.mjs`, then `Board.tsx`, `styles.candy.tsx` (cell sprite from `itemSprite(KIND_ITEMS[k])`, `KIND_ITEMS = ['cheri-berry','oran-berry','pecha-berry','rawst-berry','chesto-berry','aspear-berry']`; grid fits 390px width with ≥ 44px cells; focus-visible ring; `aria-label` per cell with kind name; `@media (prefers-reduced-motion)` disables pop/drop/shake), registry entry, host edits per Interfaces. Deviation from spec §3: the Board draws the score/moves row so the host stays game-agnostic; the clock stays in the host HUD.
- [ ] **Step 4:** Run `find src/pages/MiniGamePage -name '*.test.mjs' | xargs node --test` and `npx tsc --noEmit -p .`. Expected: all PASS, no type errors. Start dev (`ENABLE_SUPABASE=true DEV_PORT=5191 node config/scripts/dev.mjs --port 5191`) after clearing caches per memory note and load `/mini-game`; Expected: Candy Rush card with its own turn dots.
- [ ] **Step 5: Commit** named files → `feat(minigame): Candy Rush board and host`.

---

### Task 5: Concurrency, browser QA, design review

**Files:**
- Modify: `supabase/tests/deadlock-minigame.sh`
- Create: `.superpowers/qa/minigame-candy.mjs`, `docs/superpowers/qa/2026-11-11-minigame-candy-qa.md`

**Interfaces:**
- Consumes: everything above; `abc@gmail.com` / `abc12345` local seed (`.superpowers/qa/seed-abc.mjs`); `engine.mjs` as the solver (greedy: best immediate gain over all swaps).

- [ ] **Step 1:** Extend `deadlock-minigame.sh`: seed a candy round (hand-built layout reaching the target in one move) and run `minigame_finish(round, moves)` in parallel with claim, quiz, kitchen, care holders. Run `bash supabase/tests/deadlock-minigame.sh`. Expected: no `40P01`, all calls complete.
- [ ] **Step 2:** Write `minigame-candy.mjs` (puppeteer, local only): win via solver, combo chip appears on a ≥ 2-depth move, chest shown, lose by out-of-moves, reload mid-round restores moves, reduced-motion run, guest practice (no reward text), time-out while animating (Review Focus 5), viewports 390 and 1280, console error check. Run `node .superpowers/qa/minigame-candy.mjs` after clearing caches and restarting the server. Expected: all checks pass; save screenshots under `.superpowers/qa/`.
- [ ] **Step 3:** Run `/design-review` on `/mini-game` and a candy round (visual + UX flows: tap/swipe discoverability, miss feedback, move/score legibility, result screen, resume). Fix findings (each with a test where logic is involved), re-run Step 2.
- [ ] **Step 4:** Write the QA doc (what ran, results, known limits from spec §4). Run the full suite: `find src/pages/MiniGamePage -name '*.test.mjs' | xargs node --test`, `npx tsc --noEmit -p .`, `npx supabase test db`. Expected: green except known flaky pgTAP reds.
- [ ] **Step 5: Commit** `git add supabase/tests/deadlock-minigame.sh src/pages/MiniGamePage` (+ `git add -f .superpowers/qa/minigame-candy.mjs docs/superpowers/qa/2026-11-11-minigame-candy-qa.md`) → `test(minigame): candy concurrency, browser QA and design review`.

---

## Self-review (spec coverage)

- §1 rules → Task 1 (+ constants, Global Constraints). §2 server → Task 2 (layout, view, start, finish/replay, settle, expire via settle, status, locks). §3 client → Tasks 3–4 (engine, Board, host, practice, game card, sessionStorage). §4 limits → Task 5 doc + Review Focus 4. §5 tests → Tasks 1, 2, 5 (engine, parity, pgTAP list, deadlock, QA, design-review).
- Names consistent across tasks: `replay`/`minigame_candy_replay`, `trySwap`/`minigame_candy_swap`, `onMove`, `moves`, `CandyView`.
- Deferred (not in this plan): ghép hình, xếp khối, deferred minors.
