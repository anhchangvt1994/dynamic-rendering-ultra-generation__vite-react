# Who's That Pokémon?: the Roar of Time and the wild-grass loading

Date: 2026-11-01 · Status: approved (recharge C, reveal B, loading A)

## Why

1. While a round's artwork comes from the server, the stage is empty and the
   prize orb reads "Quà đang tới…": flat, and it feels like waiting on a bug.
2. A power that bends the round's clock gives signed-in players a reason to
   come back, and a way out of the 3-hour wait.

## Decisions

- **Recharge C.** 5 charges. A 2-hour window starts with the first use; when
  it runs out the charges are full again, however many were used.
- **Reveal B.** Using it on a round halves what is left of the veil.
- **Loading A.** "A wild Pokémon appeared": tall grass while waiting, a
  battle transition when the artwork lands, a slot-machine prize orb.
- **The server decides.** Charges, the frozen span and its effect on the
  gift and the deadline are Postgres rules. The page only draws.

## Rules

### Charges

- `quiz_players` gains `time_start timestamptz` and `time_used smallint`.
  `time_left = 5 - time_used`. When `now() >= time_start + 2 h`, the window
  resets (`time_start = null, time_used = 0`) the next time the row is read,
  as `quiz_window` does for turns.
- `quiz_status` adds `time_left` and `time_refill_at`
  (`time_start + 2 h`, null before the first use).

### Stop time on a round: `quiz_time_stop(p_round uuid)`

- Allowed only on the caller's own unanswered round (`no_round`,
  `answered`), not yet stopped (`time_used`), whose clock has not run out
  (`time_over`), with a charge left (`no_time`).
- Sets `quiz_rounds.frozen_at = now()`, spends one charge (starting the
  window when it is the first), returns the round (`quiz_public`).
- `quiz_public` adds `frozen_at`.
- **The round's clock** = time since `started_at` minus its overlap with
  `[frozen_at, frozen_at + 15 s]`. Gifts and the deadline (`duration + 400 ms`
  grace) are judged on it in `quiz_answer`, so a stopped round lasts 15 s
  longer and its gift holds for those 15 s.
- **The veil** (visual only): from the stop on, the veil shown is the
  gift clock's `k × 0.5` (it eases from `× 1` to `× 0.5` over about 1 s).
  After the 15 s, both run on together: never fully revealed before time is
  up.

### Wake up early: `quiz_time_refill()`

- Allowed only with no turn left (`has_turns`) and a charge left
  (`no_time`). Spends one charge.
- Opens a new 3-hour window at once: as if it had run out
  (`window_start = null, used = 0, bonus = 0, rerolls = 0, wins = 0,
  window_gifts = '{}'`). The streak and records stay.
- Returns the status.

### Who sees it

The `server` engine (signed in) and the `local` engine (`yarn dev`, no
session; localStorage key `pokedex:quiz-time`). Guests do not: their engine
throws `no_time`, and the page shows the power only when `engine.rewards`.

### Where it lives

A new migration, `supabase/migrations/20261102000000_quiz_time.sql` (the
first one may already run on the VPS). Nothing in `server/src`.

## Page

### Shared rules (`engine/rules.mjs`, mirrors the SQL)

`FREEZE_MS = 15000`, `TIME_CHARGES = 5`, `TIME_WINDOW_MS = 7200000`,
`VEIL_AFTER_STOP = 0.5`; `roundClock(elapsedMs, frozenAtMs)`;
`verdictOf` judges on `roundClock`; `timeState(stored, now)` for the local
window. `catalogue.test.mjs` checks the constants against the migration.

### Engine interface (`engine/types.ts`)

- `PlayRound.frozenAtMs: number | null`: the round's real elapsed ms when it
  was stopped.
- `Status.timeLeft`, `Status.timeRefillAt` (ms since epoch, 0 before use).
- `QuizEngine.timeStop(round): Promise<PlayRound>` and
  `QuizEngine.timeRefill(): Promise<Status>`.
- `server`: `quiz_time_stop` / `quiz_time_refill`; `toRound` maps
  `frozen_at`, and `elapsedMs` is the round's clock.

### Stage

- Two values that are one today: `remainingRef` (the gift's k, for
  `Prize`) and `--k` on the stage (the veil's k = gift k × scale).
- `Veil` takes `frozenUntil` (no time added to its clock until then) and
  `veilScale` (eased 1 → 0.5).
- **Optimistic.** The press freezes the stage at once; the engine's round
  then re-syncs the clock. If refused (another device spent the charges),
  the effect is undone, the clock runs on from where it is, and a short
  note says why ("Hết lượt Gầm Thời Gian", "Vòng này đã dừng rồi").
- Answering while frozen wins the locked gift.
- The out-of-turns screen (`Recharge.tsx`) gets the refill button; after
  `timeRefill()` the page calls `next()`.
- The power's UI lives in `TimePower.tsx`; if the quiz chunk passes 150 kB it
  gets a manual chunk like `pokemon-habitat`.

## Look and feel

### The Roar of Time

- A pocket watch whose face is Dialga's blue-silver chest diamond, five
  lit ticks on its rim (one per charge). Bottom-left of the stage, opposite
  "Nghe tiếng kêu". Key: **T**.
- Out of charges: ticks off, the diamond dims and counts down; a tap
  explains "Dialga đang nghỉ, hồi đầy sau 1:42:10".
- A one-time coach bubble (the `quiz-coached` mechanism).

### Stopping time (≈1.2 s, then 15 s)

1. 0 ms: the watch's hand whips round; a blue-silver shockwave leaves the
   button and sweeps the stage.
2. 0–200 ms: the stage turns cold blue and desaturates; flying particles
   stop mid-air.
3. 200–1200 ms: a giant translucent Roman-numeral clock face over the stage,
   hands racing while the veil halves (shards fly halfway home, the warp
   calms, the torch beam widens).
4. 15 s: the prize orb sits in a time crystal with a padlock; 15 ticks round
   the stage's edge go out one per second; the last 3 blink red and the
   crystal cracks.
5. 0 s: the crystal shatters, colour floods back, time runs on.

### Waking Snorlax

A large "Gầm Thời Gian: chơi ngay" button (with "tốn 1 trong N lượt") on
the out-of-turns screen. Its wake clock spins 3 hours forward with a sun
and moon sweeping by, Snorlax opens its eyes, the 5 turns pop back one by
one, then the grass transition into a new round.

### A wild Pokémon appeared (loading)

- **Waiting:** a night meadow, three layers of tall grass swaying out of
  step; about every 1.6 s a random clump shakes hard and a "!" pops up and
  sinks. No visible text; screen readers hear "Có gì đó trong bụi cỏ…".
- **Artwork in:** a Gen 1–3 battle transition (≈450 ms: black and white
  bars sliding opposite ways, spiralling shut, a white flash), then the
  veil's title card. It plays over the veil's first moments: at 0.45 s of
  14 s the gift's k is still 0.997.
- **Prize orb:** "Quà đang tới…" becomes a slot-machine reel of gift icons
  that spins, slows, wobbles and stops on the round's first gift with a
  flash in that gift's tier colour.
- **Artwork failed:** the grass stops, a puff of dust, "Nó chạy mất rồi!";
  the swap and retry buttons stay.

### Accessibility

Reduced motion: no spins or spirals; a tint, the countdown ticks, and a
fade for the transition. Every button has an `aria-label`; state changes are
announced through `aria-live`. CSS and SVG only: no new images or sounds.

## Testing

- **Database** (`supabase/tests/database/quiz_time.test.sql`): 5 charges,
  `no_time`, refill 2 h after the first use; one stop per round
  (`time_used`), `answered`, `no_round`, `time_over`; stopped at 3 s and
  answered at 15 s wins the first gift; stopped at 3 s and answered 25 s
  after the start is judged at 10 s (slot 3, not a time-out);
  a stopped easy round is not timed out at 20 s; `has_turns`; a refill gives
  5 turns and 3 swaps, keeps streak and records; anon can not call them;
  `time_*` columns not writable by users.
- **Node:** `roundClock`/`verdictOf` against the same numbers; the local
  engine (incl. a reload while frozen); the server engine's mapping; the
  guest's `no_time`; the constants against the migration.
- **Browser** (Puppeteer, dev 5191 with Supabase and a production build):
  stop, orb holds 15 s, answer while frozen wins the locked gift; edited
  localStorage changes nothing; refill from the Snorlax screen plays on;
  guests see no button; grass on a throttled network; 375/768/1280
  screenshots; reduced motion playable; no page errors; build under 150 kB
  with no chunk cycle.

## Errors and edges

- Refused stop: undo the effect, run on, short note.
- Network lost while frozen: the charge spent on the server stays spent;
  the server judges the answer.
- Two devices: the player's row is locked (`for update`): one stop per
  round.

## Deploy

The new migration needs `yarn start:redis-api:pm2:worker` on the VPS (its
preflight runs `supabase migration up`); `docs/quiz-server-game.md` says so.

## Not in scope

Sound; buying charges; the power for guests; usage statistics.
