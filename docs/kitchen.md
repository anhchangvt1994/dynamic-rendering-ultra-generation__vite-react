# The Pokémon Kitchen (`/che-bien`)

The bag's berries, drinks and sweets cooked into dishes that give only
positive stats (Sức mạnh, Sắc đẹp, Hạnh phúc, Linh hoạt, Trí tuệ, Thân
thiện). 12 dishes have a known recipe; 8 secret ones are found by putting
ingredients in the pot. Design:
`docs/superpowers/specs/2026-11-02-kitchen-design.md`.

## Pieces

| Where | What |
|---|---|
| `supabase/migrations/20261104000000_kitchen.sql` | ingredients (flavours), recipes, the players' dishes, discoveries and failed pots; `kitchen_menu()` and `kitchen_cook(p_dish, p_ingredients)` |
| `supabase/tests/database/kitchen.test.sql` | the rules and the permissions (`yarn db:test`) |
| `src/pages/QuizPage/items.mjs` (`FLAVORS`, `FLAVOR_INFO`), `Flavors.tsx` | the ingredients' flavours, shown on the items everywhere |
| `src/pages/KitchenPage/kitchen.mjs` | the public rules: stats, kinds, a dish's stats from its flavours, a secret's clue |
| `src/pages/KitchenPage/menu.mjs` | the menu a new player sees: known dishes, secret clues (shipped) |
| `src/pages/KitchenPage/secrets.mjs` | the secret dishes' names and recipes: dev and tests only, never shipped |
| `src/pages/KitchenPage/engine/` | `server` (RPCs), `local` (yarn dev, loaded in dev only), `guest`; `rules.mjs` mirrors the SQL |
| `src/pages/KitchenPage/` | the page, the pot, the cooking, the dish drawings (`DishArt.tsx`); `DishShelf.tsx` is the bag's "Món ăn" pocket |

`recipes.test.mjs` fails when the migration's seed and the code differ.
To change a recipe: `recipes.mjs`'s parts (`menu.mjs`, `secrets.mjs`), the
migration's seed (`kitchen_recipes`), and `SECRET_CLUES` in `menu.mjs` for a
secret one; the tests say what is out of step.

## Rules

- A pot holds 2 to 4 ingredients; a recipe is a multiset.
- A failed pot gives half back (rounded up, the first ones in sorted order)
  and says how many of its ingredients one undiscovered secret recipe shares.
- A secret recipe, its name and its stats never leave the database before
  the player found it.

## VPS

The migration needs `yarn start:redis-api:pm2:worker` (its preflight runs
`supabase migration up`), as the quiz's: `docs/quiz-server-game.md`.
