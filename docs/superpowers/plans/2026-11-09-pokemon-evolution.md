# Pokémon Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An individual that meets an evolution condition evolves, validated on the server, with a shared badge/dialog/effect usable from any page.

**Architecture:** PokéAPI evolution chains are seeded once into `pokemon_evolutions` (trade rules already rewritten to items). Two security-definer RPCs: `pokemon_evolution_options` (read, structured reasons) and `pokemon_evolve` (re-validates, idempotent by operation id, changes `pokemon_individuals.pokemon_id`, registers `pokemon_dex`). The client adds `src/pages/MyPokemonPage/evolution/` (client, format, queue, hook, badge, dialog, fx) mounted app-level, following the `build/` and `care/` patterns.

**Tech Stack:** Supabase Postgres + pgTAP (`yarn db:test`), React + styled-components, node:test `.test.mjs`, Node seed script (PokéAPI), Playwright QA scripts in `.superpowers/qa`.

**Spec:** `docs/superpowers/specs/2026-11-09-pokemon-evolution-design.md` (approved). Build spec for context: `docs/superpowers/specs/2026-11-08-pokemon-build-design.md`.

## Global Constraints
- Server decides everything; client sends `operation_id` + choice only. Mọi ghi qua RPC `security definer`, `set search_path = ''`, RLS “read own”, revoke direct writes (pattern: `supabase/migrations/20261118000200_pokemon_build_items.sql`).
- Errors are `raise exception '<code>' using errcode = 'P0001'`; codes used here: `not_found`, `operation_conflict`, `not_eligible`, `no_item`, `invalid_branch`.
- Giữ nguyên khi tiến hoá: IV, exp, bộ chiêu đã lưu (trừ chiêu không còn trong learnset loài mới), `appearance`, nickname. Level không bao giờ tụt (bù `bonus_exp`).
- `min_happiness` → `pokemon_care.affection >= min_happiness`; `min_affection` → `affection >= 150`; `min_beauty` → `pokemon_care.beauty >= ceil(min_beauty / 2.0)`; time of day from server clock in `Asia/Ho_Chi_Minh`: day 06:00–16:59, dusk 17:00–17:59, night 18:00–05:59; gender 1 = female, 2 = male.
- Mọi vùng cuộn mới: `scrollbar-width: none` + `&::-webkit-scrollbar{display:none}`.
- UI vừa 320 px, tôn trọng `prefers-reduced-motion`, không layout shift. Chế độ `local` và khách: ẩn tiến hoá.
- Vietnamese copy. Never commit `server/dist`. Never push. Commit messages end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`. Specs/plans under `docs/` need `git add -f`.
- Branch = target species (`to_species`); several PokéAPI “alternatives” (`alt`) for the same target are OR-ed.

## Review Focus
- Replaying the same `operation_id` (also after the item ran out or the individual evolved) returns the first receipt and spends nothing; same id with another branch/item → `operation_conflict`.
- Evolving a Pokémon that is not yours, or a stale client calling `pokemon_evolve` for a branch no longer eligible (affection dropped, level cap) → `not_eligible`/`not_found`, nothing spent.
- An item alt used when the bag count is exactly 1 deletes the row (as `pokemon_use_item`); two concurrent evolves of one individual never double-spend.
- Evolving must not lower level, must not leave moves outside the new learnset, must keep nickname/IV/exp.
- A branch needing an unsupported condition (battle, steps, held item, rain…) is never eligible and carries an `unavailable` reason, never an error.
- Dialog queue: two ready individuals open one after another, never stacked; dismissal “Để sau” does not re-prompt until the options change.

## File Structure
- `scripts/pokemon-evolution/build-seed.mjs` (+ `.test.mjs`): PokéAPI chains → rows → `supabase/seed/pokemon_evolution_v1.sql`.
- `src/pages/QuizPage/items.mjs`: appended evolution items; `catalogue.test.mjs` extended.
- `supabase/migrations/20261119000000_pokemon_evolution_data.sql`: items rows, `pokemon_evolutions`, `pokemon_dex` (+ backfill), `pokemon_evolution_log`.
- `supabase/migrations/20261119000100_pokemon_evolution_options.sql`: `pokemon_evolution_options`.
- `supabase/migrations/20261119000200_pokemon_evolve.sql`: `pokemon_evolve`.
- `supabase/tests/database/pokemon_evolution_{data,options,evolve}.test.sql`.
- `src/pages/MyPokemonPage/evolution/`: `client.mjs`, `format.mjs`, `queue.mjs`, `timeline.mjs`, `useEvolution.ts`, `EvolutionHost.tsx` (app-level dialog + fx host), `EvolveBadge.tsx`, `EvolveDialog.tsx`, `EvolveFx.tsx`, `EvolutionPanel.tsx`, `styles.ts`, tests.

---

### Task 1: Evolution seed script

**Files:**
- Create: `scripts/pokemon-evolution/build-seed.mjs`, `scripts/pokemon-evolution/build-seed.test.mjs`
- Output: `supabase/seed/pokemon_evolution_v1.sql`, `.superpowers/qa/evolution-missing-items.json` (git-ignored)

**Interfaces:**
- Produces `export function parseChain(chain): Row[]` and `export const ROW_COLUMNS` where `Row = { from, to, alt, trigger, minLevel, item, minHappiness, minAffection, minBeauty, timeOfDay, gender, knownMove, knownMoveType, relativeStats, partySpecies, partyType, tradeSpecies, location, unavailable }`; `trigger ∈ 'level-up'|'use-item'`; `unavailable` is `null` or a short code (`battle`, `steps`, `held-item`, `rain`, `upside-down`, `region`, `other`).
- Produces `export const itemsOf(rows): string[]` (distinct `item` ids). The SQL file inserts the rows with `on conflict do nothing`.

- [ ] **Step 1: Write failing tests** in `build-seed.test.mjs` using small inline PokéAPI-shaped fixtures. Names and assertions:
  - `plain level-up`: Charmander→Charmeleon `{trigger:'level-up', min_level:16}` → one row `{from:4,to:5,trigger:'level-up',minLevel:16,unavailable:null}`.
  - `alternatives are separate alts`: Eevee→Espeon with details `[{min_happiness:220,time_of_day:'day'},{min_happiness:220,time_of_day:'night'}]`-style fixture → rows with `alt` 0 and 1.
  - `plain trade becomes linking-cord`: trigger `trade`, no item → `trigger:'use-item', item:'linking-cord'`.
  - `trade with held item uses that item`: `trade` + `held_item:{name:'metal-coat'}` → `item:'metal-coat'`.
  - `trade for a species`: `trade` + `trade_species:{name:'karrablast'}` → `item:'linking-cord', tradeSpecies:<id of karrablast>`.
  - `level-up with held item is unavailable`: → `unavailable:'held-item'`.
  - `battle triggers are unavailable`: `three-critical-hits`, `take-damage`, `recoil-damage`, and `min_damage_taken`/`min_move_count` details → `unavailable:'battle'`; `min_steps` → `'steps'`; `needs_overworld_rain` → `'rain'`; `turn_upside_down` → `'upside-down'`; `region`/`base_form` → `'region'`; unknown trigger → `'other'`.
  - `gender and stats map`: `gender:2`, `relative_physical_stats:-1` carried through; `party_species`/`party_type` ids/names resolved.
  - `itemsOf lists distinct items`.
- [ ] **Step 2: Run** `node --test scripts/pokemon-evolution/build-seed.test.mjs`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `parseChain` (walk `chain.chain` recursively; species id from the species URL; `trigger.name` + each `evolution_details[]` entry → one Row with consecutive `alt` per `(from,to)`), the SQL writer, and a CLI like `scripts/pokemon-build/build-seed.mjs` (`--cache DIR`, `--output FILE`, JSON parsed never executed, fail whole build on malformed data, species 1..1025, fetch `evolution-chain/{id}` for every chain id found via `pokemon-species/{id}.evolution_chain.url`). CLI also writes `.superpowers/qa/evolution-missing-items.json` = items not in `ITEMS` (`src/pages/QuizPage/items.mjs`).
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Generate** `node scripts/pokemon-evolution/build-seed.mjs --cache .superpowers/qa/evo-cache` and check the SQL has rows for 133→134/135/136/196/197/470/471/700 and 4→5. Expected: file written, missing-items JSON lists the trade/held items.
- [ ] **Step 6: Commit** `feat(evolution): seed script for evolution chains` (script, test, seed file).

---

### Task 2: Evolution items in the catalogue

**Files:**
- Modify: `src/pages/QuizPage/items.mjs` (append at the end of `ITEMS`), `src/pages/QuizPage/catalogue.test.mjs`
- Create: `supabase/migrations/20261119000000_pokemon_evolution_data.sql` (items section only in this task)

**Interfaces:**
- Consumes: `evolution-missing-items.json` from Task 1.
- Produces: every item id used by a supported alt exists in `ITEMS` and `quiz_items`; ids `linking-cord` plus each missing item. All are `kind: 'stone'`, `group: 'evo'`, `tier: 1`, built with a new helper `evoItem(id, name, who)` (same shape as `stone`), placed **after** every existing item (no existing rank moves; tier-order test still holds because tier 1 sits last — if `rewards.test.mjs` “never ranks a lower tier above a higher one” fails, place the new ones directly after the last tier-1 item and rule on the rank shift in the migration instead).

- [ ] **Step 1: Failing test.** In `catalogue.test.mjs` change “the database catalogue is the items.mjs catalogue, in its order” to read every migration file matching `supabase/migrations/*.sql` and collect all `insert into public.quiz_items (id, tier, hard, rank) values …;` blocks in file order, then compare with `ITEMS`. Add `test('every evolution item of the seed is in the catalogue')` that reads `supabase/seed/pokemon_evolution_v1.sql`’s distinct item ids and asserts each is in `ITEMS` or listed in an `UNSUPPORTED_ITEMS` exemption set (only for items an `unavailable` row uses). Run: FAIL.
- [ ] **Step 2: Implement** the `evoItem` entries (names from the JSON, effect `Dùng lên Pokémon hợp để tiến hoá ngay: …`), and the migration `insert into public.quiz_items (id, tier, hard, rank) values (…) ` with ranks continuing from the current maximum.
- [ ] **Step 3: Run** `node --test src/pages/QuizPage/*.test.mjs src/pages/BagPage/*.test.mjs`. Expected: PASS (fix anything that counted `ITEMS.length`, e.g. `bag.test.mjs`, only if the assertion is about the old size).
- [ ] **Step 4: Commit** `feat(evolution): evolution items join the catalogue`.

---

### Task 3: Evolution data tables

**Files:**
- Modify: `supabase/migrations/20261119000000_pokemon_evolution_data.sql` (append)
- Create: `supabase/tests/database/pokemon_evolution_data.test.sql`
- Modify: deploy notes list in `docs/superpowers/specs/2026-11-09-pokemon-evolution-design.md` is **not** touched.

**Interfaces:**
- Produces tables (all `public`):
  - `pokemon_evolutions(from_species smallint, to_species smallint, alt smallint, trigger text check in ('level-up','use-item'), min_level smallint, item text references quiz_items(id), min_happiness smallint, min_affection smallint, min_beauty smallint, time_of_day text, gender smallint, known_move text, known_move_type text, relative_stats smallint, party_species smallint, party_type text, trade_species smallint, location text, unavailable text, primary key (from_species,to_species,alt))`, readable by anon+authenticated, no writes.
  - `pokemon_dex(user_id uuid references auth.users on delete cascade, pokemon_id smallint, first_at timestamptz default now(), via text not null default 'owned' check in ('owned','evolution'), primary key (user_id,pokemon_id))`, RLS read own, no direct writes. Backfill: `insert … select distinct user_id, pokemon_id from pokemon_individuals on conflict do nothing`.
  - `pokemon_evolution_log(user_id, operation_id, individual_id, branch smallint, item text, receipt jsonb not null, created_at, primary key (user_id, operation_id))`, RLS read own, no direct writes.
- The migration does **not** load the seed; deploy loads `supabase/seed/pokemon_evolution_v1.sql` (add the file to `supabase/config.toml` `[db.seed] sql_paths` next to `pokemon_build_v1.sql`; check how that one is registered and copy it).

- [ ] **Step 1: Failing pgTAP** `pokemon_evolution_data.test.sql` (`select plan(8)`): tables exist; `anon` can select `pokemon_evolutions`; `authenticated` cannot insert into `pokemon_evolutions`, `pokemon_dex`, `pokemon_evolution_log`; a user reads only own `pokemon_dex` rows; the seed has an Eevee→Vaporeon `use-item` `water-stone` row (load the seed rows needed with an `insert` in the test, not the whole file); backfill assertion: after inserting an individual and re-running the backfill statement (copy it into the test) its species is in `pokemon_dex`.
- [ ] **Step 2: Run** `yarn db:test`. Expected: FAIL (relations missing).
- [ ] **Step 3: Implement** the three tables, RLS and grants per pattern in `20261112000000_pokemon_individuals.sql`.
- [ ] **Step 4: Run** `yarn db:test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(evolution): evolution data tables`.

---

### Task 4: `pokemon_evolution_options`

**Files:**
- Create: `supabase/migrations/20261119000100_pokemon_evolution_options.sql`, `supabase/tests/database/pokemon_evolution_options.test.sql`

**Interfaces:**
- Consumes: `pokemon_build(uuid)` (level, stats, moves, gender), `pokemon_care` (affection, beauty), `bag`, `pokemon_moves_ref`, Task 3 tables.
- Produces `pokemon_evolution_options(p_individual uuid, p_context jsonb default '{}') returns jsonb` (authenticated only; caller must own the individual else `not_found`):
  `{ "species": 133, "level": 24, "branches": [ { "to": 134, "eligible": true, "kind": "item", "alts": [ { "alt": 0, "kind": "level|friend|beauty|item|other", "item": "water-stone"|null, "owned": 1, "ok": true, "unavailable": null|"battle", "reasons": [ {"code":"level","ok":false,"need":16,"have":12} ] } ] } ] }`.
  - `alt.ok` = every supported condition met (item ownership excluded, reported as `owned`); `unavailable` alts have `ok=false` and a reason `{code:"unavailable", why}`.
  - `branch.eligible` = any alt `ok`; `kind` = kind of the first `ok` alt (else of alt 0); an `ok` alt of kind `item` counts as eligible only for UI "Dùng", the client decides badge by `kind != 'item'`.
  - Reason codes: `level`, `affection`, `beauty`, `time` (need day|dusk|night, have), `gender`, `move`, `move_type`, `stat_rel`, `location`, `party_species`, `party_type`, `trade_species` (user owns an individual of that species), `unavailable`.
  - Helper `pokemon_evolution_clock(p_now timestamptz default now()) returns text` (day/dusk/night per Global Constraints), internal (no execute for authenticated).
  - Context: `p_context->>'where'` slug compared to `location`; `p_context->'party'` array of species ids; party_type checked via `pokemon_species_base`? **No type table exists** → treat `party_type` alts as `unavailable:'other'` in v1 and note it in the ledger.

- [ ] **Step 1: Failing pgTAP** (`select plan(≈26)`), fixtures like `pokemon_build_items.test.sql` (users, individuals of species 4 (Charmander, id 4→5 L16), 133 (Eevee), 25 (Pikachu→Raichu thunder-stone), 61 Poliwhirl, shelmet 616 if present in seed rows inserted by the test; care rows with chosen `affection`; seed the needed `pokemon_evolutions` rows inline). Assertions with exact names:
  - `a level-16 Charmander at Lv 12 is not eligible` with reason `{code:'level',ok:false,need:16,have:12}`.
  - `Lv 16 is eligible, kind level`.
  - `Eevee with affection 220: Espeon alt day ok only by day` (mock clock by calling the internal helper through a `set_config`-free design: `pokemon_evolution_options` reads the clock via `pokemon_evolution_clock()`; the test replaces the clock with `create or replace function public.pokemon_evolution_clock` returning `'day'` inside the transaction).
  - `water-stone alt: ok true, owned reflects bag count`, and `owned 0` when absent (still `ok true`).
  - `known_move alt needs the move in build moves`; `gender alt mismatch → reason gender`; `stat_rel alt compares Atk/Def`.
  - `location alt is false with {} and true with {"where":"<slug>"}`; `party_species alt` with `{"party":[<id>]}`.
  - `unavailable alts never eligible`; `trade_species alt needs an owned individual of that species`.
  - `another user's individual raises not_found`; `anon cannot execute`.
- [ ] **Step 2: Run** `yarn db:test`. Expected: FAIL.
- [ ] **Step 3: Implement** in plpgsql: loop `pokemon_evolutions where from_species = current species order by to_species, alt`, build reasons per column that is not null, aggregate to the JSON above. One SQL function body; helper for clock.
- [ ] **Step 4: Run** `yarn db:test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(evolution): pokemon_evolution_options`.

---

### Task 5: `pokemon_evolve`

**Files:**
- Create: `supabase/migrations/20261119000200_pokemon_evolve.sql`, `supabase/tests/database/pokemon_evolve.test.sql`

**Interfaces:**
- Consumes: `pokemon_evolution_options`, `pokemon_build`, `pokemon_level_exp`, `pokemon_level_from_exp`, `pokemon_species_base`, `pokemon_growth`, `pokemon_moveset`, `pokemon_learnset`, `bag`.
- Produces `pokemon_evolve(p_operation uuid, p_individual uuid, p_branch smallint, p_context jsonb default '{}', p_item text default null) returns jsonb` → `{ "from": 133, "to": 134, "first": true, "item": null|text, "levelBefore": 24, "levelAfter": 24, "build": <pokemon_build jsonb>, "dropped": ["move",…] }`.
  Rules, in order:
  1. Replay by `(user, operation)` from `pokemon_evolution_log` (advisory lock like `pokemon_build_begin`); same id with another individual/branch/item → `operation_conflict`.
  2. Lock the individual (`for update`, owner only, else `not_found`).
  3. Compute options; find the `branch`; none → `invalid_branch`. If `p_item` is not null pick an `ok` alt with `kind='item'` and `item = p_item` else `not_eligible`; if null pick an `ok` alt of non-item kind else `not_eligible`. Item alt needs bag count ≥ 1 else `no_item`; spend 1 (delete row at 1).
  4. `levelBefore` = build level; update `pokemon_individuals.pokemon_id = p_branch`; if new level < levelBefore, raise `pokemon_growth.bonus_exp` (insert growth row via the birth-IV pattern if absent) by `pokemon_level_exp(new_growth, levelBefore) - exp` so `levelAfter >= levelBefore` (still `<= cap`).
  5. If `moves_custom`: delete `pokemon_moveset` rows whose move is not in `pokemon_learnset` of the new species; list in `dropped`.
  6. `insert into pokemon_dex … on conflict do nothing`, `first` = inserted; `via='evolution'`.
  7. Log row with the whole receipt. Grant execute to authenticated only; the receipt’s `build` is the new `pokemon_build`.

- [ ] **Step 1: Failing pgTAP** (`select plan(≈24)`): 
  - `level evolution changes pokemon_id and returns first=true`, `pokemon_dex has the new species and keeps the old one`, second Eevee→Vaporeon evolution returns `first=false`.
  - `replay returns the first receipt and spends nothing`; `same op other branch → operation_conflict`.
  - `not eligible → not_eligible and nothing changes`; `unknown branch → invalid_branch`; `another user → not_found`.
  - `item evolution spends exactly one stone`, `last stone removes the bag row`, `no stone → no_item`, `item given for a level alt → not_eligible`.
  - `IV, bonus_exp (when level holds), nickname and appearance survive`.
  - `level never drops`: individual whose growth curve gets slower after evolving ends with `levelAfter >= levelBefore` and `bonus_exp` raised.
  - `custom moves not in the new learnset are dropped and reported; others kept`.
  - `pokemon_build after evolving reports the new species and new base stats`.
  - `anon cannot execute`.
- [ ] **Step 2: Run** `yarn db:test`. Expected: FAIL.
- [ ] **Step 3: Implement** as specified; reuse `pokemon_build_begin`-style locking (do not call it: it writes `pokemon_build_ops`).
- [ ] **Step 4: Run** `yarn db:test`. Expected: PASS (whole suite).
- [ ] **Step 5: Commit** `feat(evolution): pokemon_evolve`.

---

### Task 6: Client data layer

**Files:**
- Create: `src/pages/MyPokemonPage/evolution/client.mjs`, `format.mjs`, `queue.mjs`, `client.test.mjs`, `format.test.mjs`, `queue.test.mjs`

**Interfaces:**
- Produces `client.mjs`: `EVOLUTION_ERRORS` (Vietnamese messages for `not_eligible`, `no_item`, `invalid_branch`, `operation_conflict`, `not_found`, `network`, `evolution_unavailable`), `fetchEvolutionOptions({mode,supabase}, individualId, context = {}) → options json`, `sendEvolve({mode,supabase}, operationId, individualId, branch, {context, item}) → receipt`; both throw `Error` with `.code`, `mode !== 'server'` → `evolution_unavailable` (same shape as `build/client.mjs`).
- Produces `format.mjs`: `reasonText(reason, {itemName}) → string` (e.g. `Cần cấp 16 (đang Lv 12)`, `Cần ban đêm`, `Cần thân thiết 220`, `Cần chiêu hệ Tiên`, `Chưa khả dụng`), `branchProgress(branch) → {ok:number,total:number}|null` (level reason → `{have,need}`), `readyBranches(options) → Branch[]` (eligible, kind !== 'item'), `itemBranches(options, bagCounts) → [{to, item, owned}]`, `needsChoice(ready) → ready.length >= 2`, `defaultChoice(ready) → to|null` (the only one).
- Produces `queue.mjs`: `enqueueEvolution(queue, request)` / `dismissEvolution(queue)` / `snoozeKey(individualId, options)`; request `{id, individualId, kind:'prompt'|'run', item?, branch?}`; no duplicates by `id`; `snoozeKey` changes when the ready set changes (so “Để sau” does not re-prompt until it does).

- [ ] **Step 1: Failing tests** (node:test): client — maps RPC args (`p_operation`, `p_individual`, `p_branch`, `p_context`, `p_item`), maps error text to `.code`, non-server mode rejects with `evolution_unavailable`; format — every reason code renders, `readyBranches` ignores item/unavailable, `needsChoice`/`defaultChoice` for 0, 1, 3 branches; queue — enqueue ignores duplicate ids, dismiss pops the head, `snoozeKey` stable for the same set and different when a branch appears.
- [ ] **Step 2: Run** `node --test src/pages/MyPokemonPage/evolution/*.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** the three modules.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(evolution): client data layer`.

---

### Task 7: Timeline maths for the effect

**Files:**
- Create: `src/pages/MyPokemonPage/evolution/timeline.mjs`, `timeline.test.mjs`

**Interfaces:**
- Produces pure functions (port of the approved mockups `fx-combined-water.html` + `fx-flicker-light.html`, kept in `.superpowers/brainstorm/…/content/`): `frameAt(u, {reduced}) → Frame` where `u` seconds in `0..TOTAL` (`TOTAL = 15`: 3 s flicker + the 12 s approved timeline shifted by 3) and `Frame = { scrim, oldOpacity, newOpacity, oldScale, newScale, glow, halo, displaceScale, ringOpacity, ringRotate, ringScale, ring2Opacity, scanTop, scanOn, orb, rays, shards, flash, shift, pageOpen, stamp, deltas[3], badge, caption, waves }` (numbers 0..1 unless noted); `flickerWeight(u)` for the 0–3 s phase (frequency 2 → 12 Hz, amplitude 0.25 → 1, sine^0.6, white hold at 3.0–4.4 s); `readyGlow(t, {reduced}) → number` for the card (breath + double flash every 4 s).
- `reduced=true`: `displaceScale = 0`, no flicker pulses (`flickerWeight` ≤ 0.6 constant), `readyGlow` constant 0.35.

- [ ] **Step 1: Failing tests:** `frameAt` is deterministic; `oldOpacity` is 1 at u=3.2 s-equivalent and 0 after the swap; `newOpacity` 0 before and 1 after; `scrim` rises 0→1 within the first 0.8 s and falls at the end; `displaceScale` peaks ≈ 46 near the swap and returns to 0; `deltas[i]` and `stamp` are 0 before the page opens and 1 at the end; `flickerWeight` has ≥ 20 peaks in the first 3 s and max ≤ 1; `reduced` frames never exceed the stated bounds and have `displaceScale === 0`; `readyGlow` in `[0,1]`.
- [ ] **Step 2: Run** `node --test src/pages/MyPokemonPage/evolution/timeline.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** with the segment/ease helpers from the mockup.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(evolution): effect timeline`.

---

### Task 8: UI components

**Files:**
- Create: `evolution/useEvolution.ts`, `EvolveFx.tsx`, `EvolveDialog.tsx`, `EvolveBadge.tsx`, `EvolutionPanel.tsx`, `EvolutionHost.tsx`, `styles.ts`
- Modify: the app-level layout that mounts global overlays (find with `codegraph_explore "app layout router outlet dialogs"`; mount `<EvolutionHost />` once), `src/pages/MyPokemonPage/room/ProfileSheet.tsx` (render `<EvolutionPanel>` after `<BuildPanel>` at line ≈219), the individual card/list component (find via `findIndividual` users and `IndividualArt`) to render `<EvolveBadge>`.

**Interfaces:**
- Consumes: Task 6 modules, Task 7 `frameAt/readyGlow`, `useBuild`-style hooks (`useAccount`, `modeFor`, `getSupabase`, `randomId`, `refreshBag`, `createEpoch`), `buildDiff` from `build/format.mjs`, `TYPE_DATA`, `Veil.tsx` water-warp filter pattern.
- Produces:
  - `useEvolution(individualId: string | null, version?: number) → { options, status: 'loading'|'ready'|'error'|'unavailable', ready: Branch[], items: ItemBranch[], busy, error, evolve(branch:number, item?:string) → Promise<Receipt|null>, retry }`. Operation id kept across a network-error retry (same approach as `useBuild.run`); after success refetches options and calls `refreshBag()`.
  - `openEvolution(request)` / store used by `EvolveBadge` and `EvolutionPanel` to enqueue; `EvolutionHost` renders the head of the queue: `prompt` → `EvolveDialog` (bubble branches per the approved Dialog C cases), confirm → `EvolveFx`; `run` (item use) → `EvolveFx` directly.
  - `EvolveFx({ from, to, types, diff, first, onDone })` — renders the approved sequence from `frameAt` via `requestAnimationFrame` (writes styles to refs; SVG warp filter `feTurbulence`/`feDisplacementMap` on the sprites; Field Notes page with `ĐÃ GHI NHẬN`, `+HP/+Atk/+Spe` rows from `diff`, badge `Lần đầu tiến hoá thành {name}!` when `first`); dark scrim; focus-trapped `<dialog>` via `useModal`/`useDialog` like `WelcomeDialog`; Esc/click “Bỏ qua” after the swap only; `prefers-reduced-motion` via `frameAt(…, {reduced})`.
  - `EvolveBadge({ individualId, version })` — water-drop badge + the dark disc / blue aura / sparkle “ready” effect from `readyGlow` (works on the light page); click enqueues a `prompt`.
  - `EvolutionPanel({ item, api })` in `ProfileSheet`: lists not-yet-eligible branches with progress bar and reasons (Dialog case 4), owned stones as “Dùng {tên}” buttons (case 5, immediate run), and a “Tiến hoá” button when a branch is ready.
- Dialog states per spec: 1 ready branch → big bubble + “Tiến hoá”/“Để sau”; ≥2 → bubbles, choose then “Tiến hoá thành X”; 1 ready among many → preselected, others faint with ✓/✕ reasons; bubbles laid out so none overlaps the centre sprite. “Để sau” stores `snoozeKey` in `sessionStorage` (try/catch).
- All scroll areas get hidden scrollbars. Copy is Vietnamese.

- [ ] **Step 1: Failing tests** (node:test where logic is pure): add to `format.test.mjs`/`queue.test.mjs` the cases UI needs that were missed (bubble layout function `bubbleLayout(count) → [{x,y,size}]` in `format.mjs` with a test that no bubble rect intersects the centre sprite rect for counts 1..8 and all stay inside a 300×170 stage). Component behaviour is covered by Task 10’s browser script.
- [ ] **Step 2: Run** `node --test src/pages/MyPokemonPage/evolution/*.test.mjs`. Expected: FAIL on `bubbleLayout`.
- [ ] **Step 3: Implement** the layout function, then the hook, components, host mounting and ProfileSheet/card wiring.
- [ ] **Step 4: Run** `yarn tsc --noEmit` (or the repo’s type-check script) and `yarn lint` for touched files, plus `node --test` for `src/pages/MyPokemonPage/**/*.test.mjs` (list files explicitly; a directory arg reports a false failure). Expected: clean, 100 % pass.
- [ ] **Step 5: Commit** `feat(evolution): badge, dialog, effect and profile panel`.

---

### Task 9: Collection shows evolved-from species

**Files:**
- Modify: whatever builds the “caught/owned” collection (`/?view=caught&owned=1`, `OWNED_COLLECTION_PATH`; find with `codegraph_explore "owned collection caught view pokemon_cards individuals"`) and its test.

**Interfaces:**
- Consumes `pokemon_dex` (select own rows). Produces: owned species = existing source ∪ `pokemon_dex.pokemon_id`.

- [ ] **Step 1: Failing test** next to the owned-set builder: a user whose Charmander became Charmeleon still lists species 4 and 5 as owned.
- [ ] **Step 2: Run** the test file. Expected: FAIL.
- [ ] **Step 3: Implement** the union (one extra select, tolerate failure by ignoring `pokemon_dex` errors).
- [ ] **Step 4: Run** the page’s `.test.mjs` files. Expected: PASS.
- [ ] **Step 5: Commit** `feat(evolution): evolved-from species stay in the collection`.

---

### Task 10: Browser QA

**Files:**
- Create: `.superpowers/qa/evolution-e2e.mjs` (git-ignored; follow `.superpowers/qa/build-e2e.mjs`: how to run, auth, DB seeding, pitfalls in the QA scripts memory note)

- [ ] **Step 1: Seed state** via SQL helpers in the script: one Charmander at care affection enough for Lv 16; one Eevee with a Water Stone in the bag and affection ≥ 220; one Charmander at Lv 12.
- [ ] **Step 2: Assert at 320 px and 1280 px:** badge visible on the ready Charmander card (and a light page background still shows the disc/aura); dialog opens, “Để sau” closes and does not reopen on reload with the same state; “Tiến hoá” runs the effect to `ĐÃ GHI NHẬN` and the profile then shows Charmeleon; Eevee “Dùng Đá Nước” runs the effect directly and consumes one stone; Lv 12 Charmander shows progress “Cần cấp 16 (đang Lv 12)” and no badge; with `emulateMedia({reducedMotion:'reduce'})` the effect completes without the warp filter animating; screenshots of flicker, swap and notes page.
- [ ] **Step 3: Run it** (server must be running; clear all caches first per the memory note) and fix real findings with failing tests first. Expected: all assertions pass.
- [ ] **Step 4: Final suite:** `yarn db:test`, all `src/**/*.test.mjs` (explicit file list), type-check, lint. Expected: green.
- [ ] **Step 5: Commit** any fixes (`fix(evolution): …`). Do not push; do not commit `server/dist`.

---

## Deploy notes (for the handoff, not a task)
Migrations `20261119000000/100/200` and `supabase/seed/pokemon_evolution_v1.sql` join the still-undeployed build migrations/seed.
