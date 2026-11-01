# Who's That Pokémon? on the server

Signed in, the quiz is played against the database: turns, the 3-hour
window, the gifts, the streak, the records, the chests and the bag are
decided and stored by Postgres functions, and the browser never sees a
round's answer before answering. Guests (production, not signed in) play
without rewards; `yarn dev` without a session plays the browser game.
Design: `docs/superpowers/specs/2026-11-01-quiz-server-game-design.md`.

## Pieces

| Where | What |
|---|---|
| `supabase/migrations/20261101000000_quiz_game.sql` | tables (`quiz_items`, `quiz_players`, `quiz_rounds`, `bag`) and the RPCs (`quiz_status`, `quiz_start`, `quiz_answer`, `quiz_reroll`; `quiz_art` for the service role) |
| `supabase/migrations/20261102000000_quiz_time.sql` | the Roar of Time: 10 charges, full again 1 h after the first use (`quiz_time_stop` stops a round's clock for 30 s, the veil drops to a fifth and the silhouette lights up; `quiz_time_refill` opens a new window of turns); `quiz_clock` is the round's clock without its stop |
| `supabase/migrations/20261103000000_quiz_palkia.sql` | Palkia's help with each stop: half take 2 wrong options away (`quiz_palkia`, never on a typed round), and 1 in 5 tell the name's first letter (`quiz_hint`, a 1025-letter string from the quiz's own labels); both kept on the round (`removed`, `letter`) |
| `supabase/tests/database/quiz.test.sql`, `quiz_time.test.sql`, `quiz_palkia.test.sql` | the rules, the timing and the permissions (`yarn db:test`) |
| `server/src/api/routes/quiz/` | `GET /api/quiz-art/<round>` and `/api/quiz-cry/<round>`: the artwork and cry of a round, looked up with the service role, for the express, fastify and uWS servers |
| `src/pages/QuizPage/engine/` | the page's game: `server` (RPCs), `local` (yarn dev), `guest`; `rules.mjs` mirrors the SQL rules (the round's clock and the charges too) |
| `src/pages/QuizPage/TimePower.tsx`, `Watch.tsx`, `PalkiaRift.tsx`, `WildGrass.tsx` | the Roar of Time on the stage (key T) and on the out-of-turns screen; Palkia's rift, its taken options (in place: the grid never moves) and the letter; the tall-grass loading |
| `src/pages/BagPage/bagStore.ts` | the bag from the account (or the browser in dev) |

The media proxy is a custom API route like `api/routes/lighthouse`: one
folder (`index.ts` express, `index.fastify.ts`, `index.uws.ts`, shared
`art.ts`/`config.ts`) registered by one `apiQuiz.init(app)` line in each of
`server/src/api/index{,.fastify,.uws}.ts`. It reads its own settings
(`config.ts`), so the shared server code knows nothing of the quiz: to take
it out, delete the folder and those three lines.

The item catalogue lives in `src/pages/QuizPage/items.mjs` and in the
migration's `quiz_items` seed; `catalogue.test.mjs` fails when they differ.
Odds and timings live in both `rules.mjs`/`items.mjs` and the SQL functions:
change them together.

A streak of **5** pays the chest (`COMBO_AT`, `progress.mjs`; the second
migration's `quiz_answer`); it was 10 at first. `catalogue.test.mjs` fails
when the two differ. 10 records still pay the special chest.

## Running it

Local (`ENABLE_SUPABASE=true yarn dev`): the dev script starts the local
stack and passes its service role key to the server. New migrations:

```bash
yarn db:reset   # rebuilds the LOCAL database from the migrations (wipes local data)
yarn db:test
```

VPS (self-hosted stack, `infra/supabase`, accounts already running), as
the user that owns the repo and runs PM2 (`deploy` by default; find it with
`ps -eo user,cmd | grep -i "[p]m2"`):

1. `git pull`. With the post-merge hook installed, the pull builds
   (`yarn build`, `yarn server-build`) and reloads PM2 on its own; without
   it: `yarn install --frozen-lockfile && yarn build && yarn server-build`.
   `yarn build` fails when two built chunks import each other
   (`config/utils/ChunkCycles.mjs`): such a build loads no page.
2. Apply the migrations (the quiz's, the Roar of Time's
   `20261102000000_quiz_time.sql` and Palkia's
   `20261103000000_quiz_palkia.sql`): `yarn start:redis-api:pm2:worker` (with the same
   `PM2_HOME` as the running daemon if it is not the default). Its preflight
   runs `supabase migration up`, then it updates the running PM2 group in
   place. A PM2 reload alone (the hook) skips the preflight: until this
   step the quiz's RPCs are missing (signed-in players get an error, guests
   play); without the second migration the Roar of Time's calls 404 and
   the verdicts carry no charges. On a VPS set up with the `vps-app` systemd service,
   `sudo systemctl restart vps-app` does the same. `scripts/vps-setup/
   supabase.sh` does not: it skips the build once the site has accounts.
3. Nothing to add to the env for the default layout: the route reads
   `SERVICE_ROLE_KEY` from `infra/supabase/.env` (written by the preflight)
   when `SUPABASE_SERVICE_ROLE_KEY` is unset, and calls the API at
   `SUPABASE_PUBLIC_URL`.
4. Check: signed in, `/whos-that-pokemon` shows the artwork from
   `/api/quiz-art/<round>` (the uWS route's first live run), a right answer
   fills `/tui-do`, `/ai-day` lands on `/whos-that-pokemon`; the watch
   (top left of the stage) shows 10 charges and T stops the round.

## Costs and limits

- The media proxy downloads each round's artwork (about 150 kB) and cry from
  GitHub and sends it on, with `Cache-Control: private, max-age=900`.
- A round's clock is the server's: leaving the page does not pause it.
  400 ms are granted to every answer for the network.
- Rounds are drawn from the whole Pokédex or one generation only
  (`quiz_start` lists them; `catalogue.test.mjs` keeps them equal to
  `GENERATIONS`). None of the four options is among the player's last 30
  answers, so a past verdict never rules an option out.
- A typed round (`hard`) reaches the browser without its four options.
- A free swap (`quiz_reroll`, 3 per window) needs the Node proxy to have
  failed to fetch that round's artwork (`quiz_art_failed`) and keeps the
  round's gifts and bonus turn.
- Not covered: rate limits beyond the turn rules, a perceptual hash of the
  proxied artwork, moving a dev browser bag into an account.
