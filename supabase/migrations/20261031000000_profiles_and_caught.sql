-- Accounts: a profile per user, and the Pokémon each trainer has caught.
-- Row level security on every table: a user reads and writes only their own
-- rows; anon (no session) reaches nothing. Tables are not exposed by default
-- (api.auto_expose_new_tables = false), so the GRANTs below are the only way in.

-- profiles ---------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- a profile is created with the account (the user can not insert one)
create function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.create_profile_for_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_user();

-- caught -----------------------------------------------------------------

create table public.caught (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pokemon_id smallint not null check (pokemon_id between 1 and 1025),
  caught_at timestamptz not null default now(),
  primary key (user_id, pokemon_id)
);

alter table public.caught enable row level security;

create policy "caught: read own" on public.caught
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "caught: add own" on public.caught
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "caught: remove own" on public.caught
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.caught to authenticated;
