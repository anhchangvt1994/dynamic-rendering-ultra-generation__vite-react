# Who's That Pokémon?: the game on the server

Date: 2026-11-01 · Status: approved choices 1A, 2a, 3i (see below)

## Why

The quiz's economy (turns, the 3-hour window, gifts, streak, records,
chests, the bag) lives in localStorage today. Anyone can edit it: end the
refill countdown, add Rare Candies, set the streak to 9. The bag and items
are meant to feed later features (raising, bonding, evolving), so they must
be earned and owned by an account.

## Decisions

- **1A, the server runs the game.** Every round is created, timed and judged
  by Postgres functions. The browser sends only a choice. It never learns the
  answer before answering: options come as Pokédex ids (names are resolved
  from the public list the page already loads), and the silhouette and the
  cry come through an opaque URL, `/api/quiz-art/<round>` and
  `/api/quiz-cry/<round>`, served by the Node server.
- **2a, guests still play.** Not signed in (and not in dev): the quiz works
  as a plain game, with no turns, gifts, streak, records, chests or bag. A
  call to sign in replaces those parts. The bag page asks to sign in.
- **3i, dev keeps the browser game.** `yarn dev` without a session runs the
  current localStorage economy, unchanged, for fast testing. Signed in (dev
  or production), the server game runs.

Mode, decided once per page view and on sign-in/out:
`signed-in → server`, else `import.meta.env.DEV → local`, else `guest`.
Accounts off (`ENABLE_SUPABASE=false`) in production: guest everywhere, and
the bag's links (header, menu) are hidden.

## Rules (unchanged, now enforced by the database)

- 5 turns per window; the window starts with the first round and lasts 3 h.
  A round costs its turn when it starts. A lucky gift gives one turn back,
  never above 5.
- Veil: 14 s (choices) or 22 s (typed). Left `k = 1 - smoothstep(t/d)`.
  Gift slot: the first of `SLOT_AT = [0.75, 0.5, 0.25, 0]` with `k > at`;
  none (time) once `k = 0`. The server times with its own clock from
  `started_at`; 400 ms grace for the network.
- Gifts per round: 4 draws from `SLOT_WEIGHTS`, most valuable first
  (catalogue rank); TM/HM only when typed; one round in four has a bonus
  turn behind one gift.
- Right: the slot's gift goes to the bag. Wrong or time: streak 0, nothing.
- Streak 10 → a chest (3–5 gifts, 1 sure rare: `COMBO_SURE`/`COMBO_WEIGHTS`),
  streak back to 0, records + 1. Records 10 → the special chest (10 gifts, 3
  sure: `SPECIAL_SURE`/`SPECIAL_WEIGHTS`), records back to 0.
- Weights are the current ones in `src/pages/QuizPage/items.mjs`
  (legendary 2.4 % on a round's best gift, 23.4 % in the special chest).
- A round left unanswered resumes on the next visit, same Pokémon, its
  clock still running on the server (leaving does not pause it).
- A broken artwork may be swapped for another Pokémon at no cost, at most 3
  times per window.

## Data (Postgres, RLS on, nothing reachable but what is granted)

- `quiz_items`: the catalogue's ids, tiers, `hard` flag and rank, seeded by
  the migration; a test keeps it equal to `items.mjs`.
- `quiz_players`: one row per user: window start, used, bonus, rerolls,
  wins and gifts of the window, streak, records, records total.
- `quiz_rounds`: per round: answer, options, veil, typed, gifts, bonus slot,
  duration, started/answered at, choice, outcome, slot, item won. Never
  selectable by users (it holds the answer).
- `bag`: user, item, count. Users select their own rows; no writes.

RPCs (security definer, `authenticated` only unless noted):
`quiz_status()`, `quiz_start(from, to, typed)`, `quiz_answer(round, choice)`,
`quiz_reroll(round)`; `quiz_art(round)` for `service_role` only (the Node
proxy).

## The browser

- One engine interface, three engines: `local` (today's code, moved),
  `server` (RPC calls), `guest` (rounds only). The page talks to the
  interface; the UI is the same for local and server.
- Server rounds hold no answer until the reply; the reveal waits for it.
- The bag page and the HUD count read the account's `bag` in server mode,
  localStorage in local mode.

## Out of scope

Moving a dev browser bag into an account; catching (the `caught` table
keeps its current rules); rate limiting beyond the turn rules; a picture
hash attack on the proxied artwork.
