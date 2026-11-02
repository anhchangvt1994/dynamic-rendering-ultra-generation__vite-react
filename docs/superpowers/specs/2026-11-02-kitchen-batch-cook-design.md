# Bếp Pokémon: nấu theo mẻ

Approved in chat on 2026-11-02. Extends `2026-11-02-kitchen-design.md`.

## Problem

A menu dish cooks one portion per tap. A player who holds ingredients for
n portions taps "Nấu" n times and sits through the cooking dialog n times.

## Scope

- Menu cards (known dishes, found secrets): cook 1..max portions at once.
- The free pot ("Tự pha chế") stays one pot per cook: it exists to discover.
- Guests keep the read-only menu.

## Experience

### The batch control on a menu card

```
[ −  ×3  + ]  [ Nấu ×3 ]
     Tối đa 4
```

- `max = min over the recipe's ingredients of floor(bag[id] / need[id])`,
  capped at 99. The stepper shows only when `max >= 2`; below that the card
  keeps today's single "Nấu" button.
- The chosen count starts at 1, so one tap still cooks one portion.
- "Tối đa" sets the count to `max` in one tap.
- The count is clamped to `max` whenever the bag changes (another tab, a
  cook); a count of 0 falls back to the plain disabled button.
- Preview while choosing: each ingredient ticket reads `Dùng {need × n}` /
  `Túi {have}`, and the stat chips read the batch totals (`+{points × n}`).
- Keyboard: the stepper is a group; −/+ buttons and ←/→ (or −/+ keys) on
  the count change it. Buttons are at least 44px. The cook button's
  accessible name is "Nấu {n} phần {dish}".

### One cook, one animation

- A batch is one engine call and one cooking dialog.
- The result shows the dish with a count that rolls up to `×n` and a short
  stack of plates behind it (stack drawn for at most 5, the number says the
  rest), then the total stats gained.
- Reduced motion: no roll or stack animation, the final count shows at once.
- Stats gained are `dishStats × n` (each portion gives what one gives).

### Errors

- `missing` (the bag changed elsewhere): today's note, the bag reloads, the
  count clamps to the new max.
- `bad_times` is not reachable from the UI; it maps to the generic error.

## Data and engines

### Database (new migration `20261105000000_kitchen_batch.sql`)

- Replace `kitchen_cook(text, text[])` with
  `kitchen_cook(p_dish text, p_ingredients text[], p_times int default 1)`;
  the old signature is dropped so PostgREST resolves one function, and a
  call without `p_times` behaves exactly as before.
- `p_times` must be 1..99, and greater than 1 only with `p_dish`:
  otherwise `bad_times`.
- The bag check uses `need × p_times`; the deduction and the dish count
  (`+ p_times`) happen in the same transaction under the existing advisory
  lock: the whole batch cooks or nothing does.
- The result adds `count` (the portions cooked) to the `dish` outcome.
- pgTAP (`kitchen.test.sql`): a batch of 3 spends 3× and counts 3; a batch
  one portion short fails with `missing` and changes nothing; `bad_times`
  for 0, 100 and for a free pot with `p_times > 1`; the default is 1.

### Engines

- `KitchenEngine.cook(dish, pot, times?: number)`; `CookResult`'s dish
  outcome gains `count: number`.
- `rules.mjs` `cookPot(state, dishId, ingredients, times = 1)` mirrors the
  database; `kitchen.test.mjs` mirrors the pgTAP cases.
- Server engine passes `p_times`; local engine passes `times`; the guest
  engine still throws `sign_in`.

## Testing

- Unit: rules (`kitchen.test.mjs`) and the batch max helper.
- Database: `yarn db:test`.
- Browser (`.superpowers/qa/kitchen-e2e.mjs`, local and signed in): stepper
  hidden at max 1, shown at max ≥ 2, "Tối đa", clamping after the bag
  shrinks, one dialog per batch with `×n`, bag and dish counts after, 320px
  and 1280px, keyboard and reduced motion.
