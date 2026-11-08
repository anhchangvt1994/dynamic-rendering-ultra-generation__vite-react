-- Pokémon evolution, part 1: the items that stand in for trade evolutions and
-- the games' special evolution items join the Who's That Pokémon catalogue
-- (src/pages/QuizPage/items.mjs, kept equal by catalogue.test.mjs). They are
-- appended after the last rank so no existing rank moves.

insert into public.quiz_items (id, tier, hard, rank) values
  ('linking-cord', 1, false, 62),
  ('kings-rock', 1, false, 63),
  ('metal-coat', 1, false, 64),
  ('protector', 1, false, 65),
  ('dragon-scale', 1, false, 66),
  ('black-augurite', 1, false, 67),
  ('electirizer', 1, false, 68),
  ('magmarizer', 1, false, 69),
  ('up-grade', 1, false, 70),
  ('dubious-disc', 1, false, 71),
  ('peat-block', 1, false, 72),
  ('prism-scale', 1, false, 73),
  ('reaper-cloth', 1, false, 74),
  ('deep-sea-tooth', 1, false, 75),
  ('deep-sea-scale', 1, false, 76),
  ('sachet', 1, false, 77),
  ('whipped-dream', 1, false, 78),
  ('tart-apple', 1, false, 79),
  ('sweet-apple', 1, false, 80),
  ('syrupy-apple', 1, false, 81),
  ('metal-alloy', 1, false, 82),
  ('auspicious-armor', 1, false, 83),
  ('malicious-armor', 1, false, 84);

-- the evolution rules, one row per way a species can evolve ----------------
-- Filled by supabase/seed/pokemon_evolution_v1.sql
-- (scripts/pokemon-evolution/build-seed.mjs). `alt` numbers the alternative
-- ways to reach the same target; any one of them is enough. Trades are already
-- rewritten into items; a row with `unavailable` set needs something the game
-- cannot evaluate (battles, steps, rain…) and is never eligible.

create table public.pokemon_evolutions (
  from_species smallint not null references public.pokemon_species_base (species) on delete cascade,
  to_species smallint not null references public.pokemon_species_base (species) on delete cascade,
  alt smallint not null default 0,
  trigger text not null check (trigger in ('level-up', 'use-item')),
  min_level smallint,
  item text references public.quiz_items (id),
  min_happiness smallint,
  min_affection smallint,
  min_beauty smallint,
  time_of_day text check (time_of_day in ('day', 'dusk', 'night')),
  gender smallint check (gender in (1, 2)),
  known_move text,
  known_move_type text,
  relative_stats smallint check (relative_stats in (-1, 0, 1)),
  party_species smallint,
  party_type text,
  trade_species smallint,
  location text,
  unavailable text,
  primary key (from_species, to_species, alt)
);
create index pokemon_evolutions_item on public.pokemon_evolutions (item) where item is not null;

-- every species a user has had, kept when it evolves ---------------------------

create table public.pokemon_dex (
  user_id uuid not null references auth.users (id) on delete cascade,
  pokemon_id smallint not null check (pokemon_id between 1 and 1025),
  first_at timestamptz not null default now(),
  via text not null default 'owned' check (via in ('owned', 'evolution')),
  primary key (user_id, pokemon_id)
);

insert into public.pokemon_dex (user_id, pokemon_id, via)
select distinct user_id, pokemon_id, 'owned' from public.pokemon_individuals
on conflict do nothing;

-- idempotency and receipts of pokemon_evolve ------------------------------------

create table public.pokemon_evolution_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_id uuid not null,
  individual_id uuid not null,
  branch smallint not null,
  item text,
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);

alter table public.pokemon_evolutions enable row level security;
alter table public.pokemon_dex enable row level security;
alter table public.pokemon_evolution_log enable row level security;

create policy "read evolutions" on public.pokemon_evolutions for select using (true);
create policy "read own dex" on public.pokemon_dex for select to authenticated using (user_id = (select auth.uid()));
create policy "read own evolution log" on public.pokemon_evolution_log for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.pokemon_evolutions, public.pokemon_dex, public.pokemon_evolution_log from anon, authenticated;
grant select on public.pokemon_evolutions to anon, authenticated;
grant select on public.pokemon_dex, public.pokemon_evolution_log to authenticated;
