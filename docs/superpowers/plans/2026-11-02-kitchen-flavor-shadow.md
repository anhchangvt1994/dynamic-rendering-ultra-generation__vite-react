# Kitchen Flavour Shadow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secret clues carry a 3-level flavour shape; the pot draws it as a shadow to fill.

**Architecture:** `shapeOf` (client) and `kitchen_menu` (database) compute the same levels; the pot gets a `target` clue from the page and draws bands, a dashed polygon, per-axis ticks and a match count.

**Tech Stack:** Postgres/pgTAP, React 19 + styled-components, node:test, Puppeteer.

**Spec:** `docs/superpowers/specs/2026-11-02-kitchen-flavor-shadow-design.md`

## Global Constraints

- `level = min(2, floor(min(sum, 40) * 3 / 40))`; flavour order spicy, dry, sweet, bitter, sour.
- Clues never carry ingredients, name or stats.
- Never commit `server/dist/*`; never push.

## Review Focus

- A secret found while it is the target → target clears (Task 3 browser).
- Target chosen, then the pot tab left and reopened → target kept (Task 3).
- Guest (no account) → shadow shown, cooking blocked as before (Task 3 guest page).
- 5 ingredients impossible; 4 in pot with a 3-ingredient target → slot dimmed, still addable (Task 3).
- Reduced motion → no glow animation (Task 3).

---

### Task 1: Levels, shapes and clues

**Files:** `src/pages/KitchenPage/kitchen.mjs`, `menu.mjs`, `engine/kitchen.test.mjs`, `supabase/migrations/20261106000000_kitchen_shadow.sql`, `supabase/tests/database/kitchen.test.sql`

**Produces:** `flavorLevel(sum: number): 0|1|2`; `shapeOf(ingredients: string[]): Record<Flavor, 0|1|2>`; `DishView.shape?`.

- [ ] Failing tests: `flavorLevel` at 0,13,14,26,27,40,90 → 0,0,1,1,2,2,2; each `SECRET_CLUES[i].shape` deep-equals `shapeOf(recipe)`; `menuOf([])` clue has `shape`; pgTAP `bi-an-1` shape literal.
- [ ] Implement; literal shapes in `SECRET_CLUES`; migration recreates `kitchen_menu` with `'shape'`.
- [ ] `node --test …kitchen.test.mjs` PASS; commit `feat(kitchen): the secret dishes' flavour shape`.

### Task 2: The shadow in the pot

**Files:** `src/pages/KitchenPage/Pot.tsx`, `index.tsx`

**Consumes:** `shapeOf`, `flavorLevel`, `DishView.shape`, `.count`.

- [ ] Pot props `target?: DishView | null`, `targets: DishView[]`, `onTarget(id | null)`; target row chips; bands + dashed polygon + ticks + "Khớp n/5 vị"; 5/5 message; dimmed extra slots.
- [ ] Page: `target` state; `onTry(dish)` sets it; cleared when that dish becomes known.
- [ ] Browser QA `.superpowers/qa/kitchen-shadow.mjs` at 320/1280 + reduced motion; commit `feat(kitchen): fill the secret dish's flavour shadow`.

### Task 3: Verify

- [ ] Full unit suite, ESLint/Prettier, kitchen QA scripts (layout, batch, flow, wrap).
