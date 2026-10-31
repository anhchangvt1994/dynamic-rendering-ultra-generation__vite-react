-- A table is reachable only through the GRANTs of its migration, on every
-- database: the CLI's local stack exposes nothing by default
-- (api.auto_expose_new_tables = false), the self-hosted image (like Supabase
-- Cloud) grants every new public table to anon and authenticated. Start from
-- nothing, then grant again exactly what 20261031000000 grants.
revoke all on table public.profiles, public.caught from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, delete on public.caught to authenticated;
