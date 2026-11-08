-- Pokémon build reference data: species base stats, learnsets, moves and the
-- TM / HM items that teach them. Filled by supabase/seed/pokemon_build_v1.sql
-- (scripts/pokemon-build/build-seed.mjs); readable by everyone, writable by
-- nobody but the owner role.

create table public.pokemon_species_base (
  species smallint primary key check (species between 1 and 1025),
  hp smallint not null,
  atk smallint not null,
  def smallint not null,
  spa smallint not null,
  spd smallint not null,
  spe smallint not null,
  growth text not null check (growth in ('slow', 'medium-slow', 'medium', 'fast', 'erratic', 'fluctuating')),
  gender_rate smallint not null check (gender_rate between -1 and 8),
  -- [{"name":"keen-eye","hidden":false,"slot":1}, ...]
  abilities jsonb not null
);

create table public.pokemon_moves_ref (
  move text primary key,
  type text not null,
  power smallint,
  accuracy smallint,
  pp smallint,
  damage_class text not null
);

create table public.pokemon_learnset (
  species smallint not null references public.pokemon_species_base (species) on delete cascade,
  move text not null references public.pokemon_moves_ref (move),
  method text not null check (method in ('level-up', 'machine', 'egg', 'tutor')),
  level smallint not null default 0,
  primary key (species, move, method)
);
create index pokemon_learnset_move on public.pokemon_learnset (move);

create table public.pokemon_machines (
  item_id text primary key references public.quiz_items (id),
  move text not null references public.pokemon_moves_ref (move)
);

alter table public.pokemon_species_base enable row level security;
alter table public.pokemon_moves_ref enable row level security;
alter table public.pokemon_learnset enable row level security;
alter table public.pokemon_machines enable row level security;

create policy "read species" on public.pokemon_species_base for select using (true);
create policy "read moves" on public.pokemon_moves_ref for select using (true);
create policy "read learnset" on public.pokemon_learnset for select using (true);
create policy "read machines" on public.pokemon_machines for select using (true);

revoke all on public.pokemon_species_base, public.pokemon_moves_ref, public.pokemon_learnset, public.pokemon_machines from anon, authenticated;
grant select on public.pokemon_species_base, public.pokemon_moves_ref, public.pokemon_learnset, public.pokemon_machines to anon, authenticated;
