# Bếp Pokémon: bóng hình vị của món bí ẩn

Approved in chat on 2026-11-02. Extends `2026-11-02-kitchen-design.md`.

## Problem

A secret dish's clue (kind, count, groups, 2 strongest stats) leaves too
many pots to try. The pot already draws its flavour pentagon; the secret's
own pentagon, blurred, turns the hunt into "fill the shadow".

## The shadow

- Each of the 5 flavours (spicy, dry, sweet, bitter, sour) is the sum of the
  recipe's potencies, capped at 40 (the pot's `FULL`), in **3 levels**:
  `level = min(2, floor(min(sum, 40) * 3 / 40))` → 0 (< 13.4), 1, 2 (≥ 26.7).
- Measured over all 31,437 pots with the existing group clue: 2 to 24
  candidate pots per secret, about 12 on average (2 levels: ~83, 4: ~4).
- The clue carries `shape: { spicy, dry, sweet, bitter, sour }` (0..2). The
  recipe, its name and its stats still never leave the database before the
  dish is found.

## Experience

- "Tự pha chế" on a secret card opens the pot with that dish as the
  **target**. The pot tab shows a target row: "Tự do" plus one chip per
  unfound secret (its silhouette and kind); the choice survives tab
  switches, not reloads.
- With a target, the pentagon draws the shadow: each axis's band for its
  level (a soft wedge between the level's bounds) and a dashed polygon
  through the bands' middles, under the pot's own shape.
- Each axis label turns green with a tick when the pot's level equals the
  target's; a counter reads "Khớp 3/5 vị". At 5/5 the shadow glows and the
  forecast says "Hình vị khớp rồi, nấu thử!" (a shape match is not a
  promise: other pots can share it).
- The target's ingredient count dims the slots it doesn't use ("không cần").
  Adding beyond it stays allowed.
- Found: the target clears to "Tự do" and leaves the row.
- Guests see the shadow too (the menu is public); cooking still needs an
  account. Reduced motion: no glow pulse.

## Data

- New migration `20261106000000_kitchen_shadow.sql` replaces `kitchen_menu`
  with the same output plus `shape` on clues, computed from
  `kitchen_ingredients`.
- `kitchen.mjs`: `flavorLevel(sum)` and `shapeOf(ingredients)`; `clueOf`
  adds `shape`; `SECRET_CLUES` in `menu.mjs` gains the literal shapes.

## Testing

- Unit: `flavorLevel` bounds (0, 13, 14, 26, 27, 40, 90); every secret's
  clue shape equals `shapeOf(recipe)`; the public menu's clues match
  `menuOf([])`; clues still carry no ingredients, name or stats.
- pgTAP: a clue's `shape` equals the expected literal for `bi-an-1`.
- Browser (local mode): secret card → pot with that target; levels match
  count updates as ingredients go in; the recipe reaches 5/5 and the
  message; "Tự do" removes the shadow; 320px fits; reduced motion.
