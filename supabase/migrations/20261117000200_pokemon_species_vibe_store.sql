-- The server stores a species' vibe only through this function: a missing
-- row is added, a row of an older rule version replaced, and a row of the
-- same version (the seed's, or one already stored) kept. Players can not
-- call it; the service role no longer writes the table directly.
--
-- Deploy order for appearance v3 (20261117000000..000200): ship the client
-- that reads v3 receipts and clear the page caches first, then run these
-- migrations. A tab left open from before gets "client_outdated" for a
-- newer receipt and is asked to reload.
create function public.pokemon_species_vibe_store(p_species smallint, p_vibe text, p_v integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.pokemon_species_vibes(species_id, vibe, v, updated_at)
  values (p_species, p_vibe, p_v, now())
  on conflict (species_id) do update
    set vibe = excluded.vibe, v = excluded.v, updated_at = now()
    where public.pokemon_species_vibes.v < excluded.v;
$$;
revoke execute on function public.pokemon_species_vibe_store(smallint, text, integer) from public, anon, authenticated;
grant execute on function public.pokemon_species_vibe_store(smallint, text, integer) to service_role;
revoke insert, update on public.pokemon_species_vibes from service_role;
