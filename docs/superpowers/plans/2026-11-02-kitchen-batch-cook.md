# Kitchen Batch Cooking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cook 1..max portions of a menu dish in one call and one animation.

**Architecture:** `kitchen_cook` gains `p_times` (default 1) and does the whole batch in one transaction; the browser rules mirror it. A pure helper computes the batch max and totals; the menu card gets a stepper; the cooking dialog shows `×n`.

**Tech Stack:** Postgres/pgTAP (Supabase), React 19 + styled-components, node:test, Puppeteer.

**Spec:** `docs/superpowers/specs/2026-11-02-kitchen-batch-cook-design.md`

## Global Constraints

- Batch range 1..99; `p_times > 1` only with a menu dish, else `bad_times`.
- Stepper shows only when max ≥ 2; count starts at 1; clamps to max on bag change.
- One engine call and one cooking dialog per batch; stats gained = stats × n.
- Plate stack drawn for at most 5; reduced motion shows the final count at once.
- Free pot ("Tự pha chế") unchanged. Guests unchanged.
- Never commit `server/dist/*`; never push.

## Review Focus

- A bag shrinking in another tab while ×n is chosen → the count clamps; a stale cook fails `missing` and changes nothing (Task 1 pgTAP, Task 3 browser).
- A batch exactly using up an ingredient → the bag row is deleted, not left at 0 (Task 1, Task 2).
- An ingredient needed twice (Pecha ×2) → max counts pairs, not units (Task 2 unit test).
- Repeated taps during cooking → one batch only (existing `cooking` guard + advisory lock; Task 3 browser double-click).
- 320px with "×99" and "Tối đa" → no wrap/overflow (Task 3 browser).

---

### Task 1: Database batch cook

**Files:**
- Create: `supabase/migrations/20261105000000_kitchen_batch.sql`
- Modify: `supabase/tests/database/kitchen.test.sql`

**Interfaces:**
- Produces: `public.kitchen_cook(p_dish text, p_ingredients text[], p_times int default 1) returns jsonb`; dish outcome adds `'count', p_times`.

- [ ] **Step 1: Failing pgTAP** (raise `plan()` accordingly), after the existing Pecha cook: give 7 Pecha + 3 Moomoo, `kitchen_cook('poffin-pecha', null, 3)` → `count` = 3, Pecha 8−6=2... assert exact bag numbers and `dish_count` +3; ×4 one short → `missing`, bag unchanged; `p_times` 0 and 100 → `bad_times`; free pot with 2 → `bad_times`; call without `p_times` still counts 1.
- [ ] **Step 2: `yarn db:test`** → FAIL (function signature).
- [ ] **Step 3: Migration**: `drop function public.kitchen_cook(text, text[])`; recreate with `p_times`, need × `p_times` in check/delete/update, dish count `+ p_times`; revoke/grant as in `20261104000000_kitchen.sql`.
- [ ] **Step 4: `yarn db:reset && yarn db:test`** → PASS.
- [ ] **Step 5: Commit** `feat(kitchen): cook a dish in batches in the database`.

### Task 2: Rules, engines and batch helpers

**Files:**
- Create: `src/pages/KitchenPage/batch.mjs`
- Modify: `src/pages/KitchenPage/engine/{rules.mjs,local.mjs,server.ts,types.ts}`, `engine/kitchen.test.mjs`

**Interfaces:**
- Produces: `batchMax(ingredients: string[], bag: Count): number` (0..99); `scaleStats(stats, n)`; `cookPot(state, dishId, ingredients, times = 1)`; `KitchenEngine.cook(dish, pot, times?)`; `CookResult` dish outcome `count: number`.

- [ ] **Step 1: Failing tests**: mirror Task 1 cases on `cookPot`; `batchMax(['pecha-berry','pecha-berry','moomoo-milk'], {pecha 9, moomoo 4}) === 4`, missing → 0, 500 each → 99; `scaleStats({happiness:3,friendship:3},3)` → `{9,9}`; server engine sends `p_times`.
- [ ] **Step 2: `node --test src/pages/KitchenPage/engine/kitchen.test.mjs`** → FAIL.
- [ ] **Step 3: Implement** (local passes `times`; result `count`).
- [ ] **Step 4: Tests** → PASS.
- [ ] **Step 5: Commit** `feat(kitchen): batch cooking in the browser's rules`.

### Task 3: Menu card batch control

**Files:** Create `src/pages/KitchenPage/BatchStepper.tsx`; modify `src/pages/KitchenPage/index.tsx` (MenuCard, `cook`), `styles.tsx`.

- [ ] Stepper `[−] ×n [+]` + "Tối đa" (group, 44px targets, ←/→ and −/+ keys); cook button "Nấu ×n", aria "Nấu {n} phần {dish}"; tickets `Dùng {need×n}` / `Túi {have}`, chips `scaleStats`; count clamps when `batchMax` changes; `cook(dish, ingredients, n)`; reset to 1 after a cook.
- [ ] Browser check at 320/1280 (stepper hidden at max 1, shown ≥2, Tối đa, clamp, no overflow, double click = one cook).
- [ ] Commit `feat(kitchen): choose how many portions to cook`.

### Task 4: One dialog for the batch

**Files:** Modify `src/pages/KitchenPage/CookFx.tsx`.

- [ ] Title `+{count} {name}`; count rolls 1→n; up to 5 stacked plates behind the dish; `StatChips` of `scaleStats(stats, count)`; reduced motion: no roll/stack.
- [ ] Browser: ×3 → one dialog, title "+3", bag/dish counts updated; reduced motion check.
- [ ] Commit `feat(kitchen): the batch's dishes come out together`.

### Task 5: Verify

- [ ] `node --test 'src/pages/**/*.test.mjs' 'config/**/*.test.mjs'`, ESLint/Prettier on touched files, `yarn db:test`, kitchen layout/wrap/flow QA scripts; final reviewer pass.
