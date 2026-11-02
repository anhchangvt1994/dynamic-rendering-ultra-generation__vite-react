# The Pokémon Kitchen (`/che-bien`)

Date: 2026-11-02 · Status: approved in conversation (scope A, recipes A+B,
failure: half back, clues A, stats from flavours)

## Why

The quiz fills the bag with berries, drinks and sweets that do nothing yet.
A kitchen turns them into dishes for the coming care feature (feeding,
raising, bonding) and, later, battles. Cooking is the reason to keep
playing the quiz: better ingredients, better dishes.

## Decisions

- **Scope A.** The kitchen cooks; dishes go to the bag (a "Món ăn" tab) and
  say what they will give. Feeding a Pokémon and keeping its stats belong to
  the care feature, designed later.
- **Recipes A + B.** A menu of dishes with known recipes, and secret dishes
  found by putting ingredients in the pot. A secret dish found is unlocked in
  the menu with its recipe.
- **Failure.** A pot that matches no recipe fails: half of its ingredients
  come back (rounded up: 3 → 2 back, 4 → 2, 2 → 1), the failed dish is thrown
  away, nothing else is given.
- **Clues A.** Every ingredient carries its flavours (shown everywhere the
  item shows: bag, item dialog, quiz gift cards, kitchen). A secret dish's
  hint names its kind, its count, its kinds of ingredients and its strongest
  stats. A failed pot says how many of its ingredients belong to one secret
  recipe (a number, never which).
- **Stats from flavours, never negative.** Spicy → Sức mạnh, Dry → Sắc đẹp,
  Sweet → Hạnh phúc, Sour → Linh hoạt, Bitter → Trí tuệ; every dish also
  gives Thân thiện.
- **The server decides** (as the quiz): ingredients, recipes, dishes,
  discoveries are Postgres rules; secret recipes never reach the browser
  before they are found.

## Stats, for the features to come

Stored as a map `stat → points` (`power`, `beauty`, `happiness`, `agility`,
`wisdom`, `friendship`), so a stat can be added without changing a table.
Intended use (not built now): power → attack, agility → speed and evasion,
wisdom → special moves, beauty → contests and charm, happiness and
friendship → bond effects (holding on at 1 HP, shaking off a status).

## Flavours

Colours (the games' Pokéblocks): spicy red, dry blue, sweet pink, bitter
green, sour yellow. Potencies are tens.

- **Berries** (PokéAPI `berry/<name>`, fixed in code and SQL, never fetched
  at run time): oran spicy 10 dry 10 bitter 10 sour 10 · sitrus dry 10 sweet
  10 bitter 10 sour 10 · lum spicy 10 dry 10 sweet 10 bitter 10 · leppa spicy
  10 sweet 10 bitter 10 sour 10 · cheri spicy 10 · chesto dry 10 · pecha
  sweet 10 · rawst bitter 10 · aspear sour 10 · pomeg spicy 10 sweet 10 bitter
  10 · kelpsy dry 10 bitter 10 sour 10 · qualot spicy 10 sweet 10 sour 10 ·
  hondew spicy 10 dry 10 bitter 10 · grepa dry 10 sweet 10 sour 10 · tamato
  spicy 20 dry 10.
- **Drinks:** fresh-water none · moomoo-milk sweet 10 · lemonade sour 20
  sweet 10 · soda-pop sweet 10 spicy 10.
- **Sweets:** rage-candy-bar spicy 20 sweet 10 · big-malasada sweet 20 ·
  lava-cookie spicy 20 · old-gateau bitter 20 sweet 10 · casteliacone sweet
  10 dry 10 · lumiose-galette dry 20 · shalour-sable sour 10 sweet 10 ·
  pewter-crunchies bitter 10 dry 10.
- Not ingredients: stones, TMs/HMs, vitamins, caps, Rare Candy, Soothe Bell.

## Dishes

A dish's stats: for each flavour, the sum of its potencies over the
ingredients / 10, as its stat; the 3 strongest kept (ties: by flavour name);
Thân thiện = the number of ingredients; secret dishes × 1.5, rounded up.
Recipes are multisets (order does not count, quantities do), 2 to 4
ingredients, all different from each other. ★ secret, ★★ the legendary one.
Rarity: known dishes 1 (2 with a sweet), secret 3, legendary 4.

| Dish | Kind | Recipe | Gives |
|---|---|---|---|
| Poffin Pecha `poffin-pecha` | poffin | 2 pecha-berry + moomoo-milk | Hạnh phúc +3, Thân thiện +3 |
| Poffin Cheri `poffin-cheri` | poffin | 2 cheri-berry + lava-cookie | Sức mạnh +4, Thân thiện +3 |
| Trà đá Chesto `tra-da-chesto` | smoothie | 2 chesto-berry + fresh-water | Sắc đẹp +2, Thân thiện +3 |
| Nước chanh Aspear `nuoc-chanh-aspear` | smoothie | aspear-berry + lemonade | Linh hoạt +3, Hạnh phúc +1, Thân thiện +2 |
| Súp Rawst `sup-rawst` | soup | 2 rawst-berry + oran-berry + fresh-water | Trí tuệ +3, Sắc đẹp +1, Linh hoạt +1, Thân thiện +4 |
| Sinh tố cầu vồng `sinh-to-cau-vong` | smoothie | oran-berry + pecha-berry + cheri-berry + soda-pop | Sức mạnh +3, Hạnh phúc +2, Trí tuệ +1, Thân thiện +4 |
| Bánh kem Sitrus `banh-kem-sitrus` | cake | sitrus-berry + moomoo-milk + casteliacone | Hạnh phúc +3, Sắc đẹp +2, Trí tuệ +1, Thân thiện +3 |
| Kẹo dẻo Leppa `keo-deo-leppa` | jelly | leppa-berry + soda-pop | Sức mạnh +2, Hạnh phúc +2, Trí tuệ +1, Thân thiện +2 |
| Bánh mì kẹp Lum `banh-mi-lum` | sandwich | lum-berry + big-malasada + cheri-berry | Hạnh phúc +3, Sức mạnh +2, Trí tuệ +1, Thân thiện +3 |
| Cà ri lửa `ca-ri-lua` | curry | cheri-berry + lava-cookie + rage-candy-bar | Sức mạnh +5, Hạnh phúc +1, Thân thiện +3 |
| Pudding Lumiose `pudding-lumiose` | pudding | lumiose-galette + moomoo-milk + chesto-berry | Sắc đẹp +3, Hạnh phúc +1, Thân thiện +3 |
| Bánh quy Pewter `banh-quy-pewter` | sandwich | pewter-crunchies + rawst-berry + oran-berry | Trí tuệ +3, Sắc đẹp +2, Linh hoạt +1, Thân thiện +3 |
| ★ Poffin Hoàng gia `poffin-hoang-gia` | poffin | pomeg-berry + pecha-berry + moomoo-milk | Hạnh phúc +5, Trí tuệ +2, Sức mạnh +2, Thân thiện +5 |
| ★ Thạch biển Kelpsy `thach-bien-kelpsy` | jelly | kelpsy-berry + aspear-berry + fresh-water | Linh hoạt +3, Trí tuệ +2, Sắc đẹp +2, Thân thiện +5 |
| ★ Bánh kem Qualot `banh-kem-qualot` | cake | qualot-berry + big-malasada + shalour-sable | Hạnh phúc +6, Linh hoạt +3, Sức mạnh +2, Thân thiện +5 |
| ★ Cà ri Hondew `ca-ri-hondew` | curry | hondew-berry + rawst-berry + lava-cookie | Sức mạnh +5, Trí tuệ +3, Sắc đẹp +2, Thân thiện +5 |
| ★ Sinh tố Grepa `sinh-to-grepa` | smoothie | grepa-berry + lemonade + casteliacone | Linh hoạt +5, Hạnh phúc +5, Sắc đẹp +3, Thân thiện +5 |
| ★ Súp lửa Tamato `sup-lua-tamato` | soup | tamato-berry + 2 cheri-berry | Sức mạnh +6, Sắc đẹp +2, Thân thiện +5 |
| ★ Pudding cổ điển `pudding-co-dien` | pudding | old-gateau + pomeg-berry + moomoo-milk | Trí tuệ +5, Hạnh phúc +5, Sức mạnh +2, Thân thiện +5 |
| ★★ Đại tiệc cầu vồng `dai-tiec-cau-vong` | cake | pomeg-berry + kelpsy-berry + qualot-berry + hondew-berry | Trí tuệ +5, Sức mạnh +5, Sắc đẹp +3, Thân thiện +6 |

Kinds (8, one drawing each): poffin, cake, curry, smoothie, jelly, sandwich,
soup, pudding.

A secret dish's hint, e.g. Bánh kem Qualot: "Bánh kem · 3 nguyên liệu · 1
quả mọng, 2 bánh ngọt · nổi bật Hạnh phúc và Linh hoạt".

## Data and rules (database)

Migration `supabase/migrations/20261104000000_kitchen.sql`:

- `kitchen_ingredients(item_id → quiz_items, spicy, dry, sweet, bitter,
  sour)`, `kitchen_recipes(dish_id, kind, secret, rarity, ingredients text[]
  sorted, stats jsonb)`: read only by the functions (no policy).
- `kitchen_dishes(user_id, dish_id, count)`, read own;
  `kitchen_discoveries(user_id, dish_id)`, `kitchen_attempts(user_id,
  ingredients text[] sorted)`: written only by the functions.
- `kitchen_menu()`: every dish; known and discovered ones with their recipe
  and stats; secret ones with kind, count, hint and the 2 strongest stats
  only; the player's failed pots (for the "already tried" warning).
- `kitchen_cook(p_ingredients text[])`: 2–4 ingredients (`bad_pot`), all of
  them ingredients (`not_food`), all in the bag (`missing`); the bag row
  locked. A match: the ingredients spent, the dish + 1, a secret one
  discovered. No match: half (rounded up) of each pot's ingredients given
  back by taking the first ones of the sorted list, the attempt kept, `near`
  = the largest multiset overlap with a secret recipe not yet discovered.
  Returns `{ outcome: 'dish' | 'failed', dish, discovered, returned, near }`.
- Grants: both RPCs to `authenticated` only.

## Page

- `src/pages/KitchenPage/`: engines (`server` RPCs, `local` for `yarn dev`
  without a session, with the same rules in `rules.mjs`), the page, the dish
  drawings (`DishArt.tsx`, SVG, 8 kinds tinted by flavour, a black
  silhouette for a secret one), the pot, the shelf.
- Flavours in `src/pages/QuizPage/items.mjs` (`flavors` on each ingredient);
  dishes and recipes in `src/pages/KitchenPage/recipes.mjs`; a test keeps
  both equal to the migration.
- The bag gets a "Món ăn" tab; the item dialog and the quiz's gift cards show
  flavours.
- Route `/che-bien` with a skeleton; "Chế biến" in the header and the phone
  menu (header breakpoints adjusted for 6 links) and a link from the bag.

## Look and feel

- A pastel patisserie: marble counter, warm wood shelves, a copper pot,
  golden light. Chef: Alcremie (artwork), waving, a random line.
- **Thực đơn** tab: menu cards (art, name, rarity, stat chips in flavour
  colours, recipe with "have/need" per ingredient, Nấu); cookable first; a
  stat filter; secret cards as silhouettes with the hint and "Thử ở Tự pha
  chế".
- **Tự pha chế** tab: ingredient jars (sprite, count, flavour chips) → a pot
  with 4 slots; a 5-bar flavour meter that moves as ingredients go in; an
  "already failed" warning. On phones the pot is a sticky bar at the bottom.
- Cooking (≈2 s): ingredients arc into the pot, the lid rattles, steam
  swirls, a ladle stirs, the pot glows in its strongest flavour. Success: the
  lid pops, the dish spins up in sparkles, "+1 <dish>", stat chips burst.
  Discovery: the screen dims, the card flips from silhouette to dish ("Who's
  that Pokémon?" style), "MÓN MỚI!", a rain of stars. Failure: a comic puff
  of black smoke, "Ối!", Alcremie covers her eyes, half the ingredients bounce
  back to the shelf, "Có N nguyên liệu nằm trong một công thức bí ẩn!".
- Guests: the kitchen and menu to look at; "Đăng nhập để vào bếp" instead of
  Nấu.
- Reduced motion: fades and colour only. Keyboard and screen readers: every
  control labelled, results announced (aria-live).

## Testing

- **Database** (`kitchen.test.sql`): a known dish spends and gives; `missing`,
  `bad_pot`, `not_food`; a secret found is discovered and its recipe then
  shows; a failure returns half rounded up, keeps the attempt, says `near`
  right; the menu never shows an undiscovered recipe; order does not matter;
  no negative stat; anon refused; tables not writable by users.
- **Node:** the local engine's rules equal the SQL's; flavours and recipes
  equal between `items.mjs`/`recipes.mjs` and the migration; every dish's
  stats follow the formula; every secret dish can be found (its ingredients
  exist, its hint matches its flavours).
- **Browser:** a known dish cooked signed in and seen in the bag; a failure
  with its feedback, then a secret found with the flip; edited localStorage
  makes nothing; guests invited to sign in; 320/375/768/1280; reduced
  motion; no layout shift while cooking; the 6-link header fits; build ≤ 150
  kB per chunk, no cycle.

## Errors and edges

- Double taps, lost network: the row lock makes one cook per call; the
  button is locked while it runs.
- Ingredients spent in another tab: `missing`, the shelf reloads, a note.

## Deploy

The migration needs `yarn start:redis-api:pm2:worker` on the VPS
(`docs/kitchen.md`). Nothing in `server/src`.

## Not in scope

Feeding Pokémon and their stats (care), battles, buying or selling, sound.
