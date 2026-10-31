# Self-hosted Supabase (accounts) + send-only mail

`ENABLE_SUPABASE=true` in `server/.env.production` turns accounts on. Then
`yarn start` (any `start*` script, through `config/utils/Preflight.mjs`):

1. sets Docker + Compose v2 up when missing (see below),
2. on the first run, writes `infra/supabase/.env` (mode 600, never committed):
   database password, JWT secret, anon key (public) and service-role key (server only),
3. `docker compose up -d --wait`: Postgres, Auth (GoTrue), Data API (PostgREST),
   the email templates and a send-only mail server (docker-mailserver),
4. on the first run, generates the DKIM key of `MAIL_DOMAIN`,
5. applies `supabase/migrations` (pinned Supabase CLI, `migration up`),
6. waits for Auth and the Data API, checks `SUPABASE_PUBLIC_URL`,
7. checks the mail DNS (port 25, PTR, SPF, DKIM, DMARC, MX) and prints every
   record still missing, with its exact value.

Steps 6 and 7 only warn: the site starts anyway.

No Studio, Realtime, Storage, Edge Functions, Analytics or Kong. About 0.7 GB RAM.

`yarn dev` is not concerned: it runs the CLI's local stack, emails go to Mailpit.

## On the VPS: one command

1. Set `ENABLE_SUPABASE=true` in `server/.env.production` and deploy it.
2. On the VPS, from the project directory:

   ```bash
   sudo bash scripts/vps-setup/supabase.sh --email <you>
   ```

It installs Docker + Compose if missing, lets the app user use them, adds the
HTTPS site of `SUPABASE_PUBLIC_URL` (nginx + Let's Encrypt, `setup.sh
--site-only`) once its DNS points here, rebuilds the site with accounts,
restarts the app and prints what is left. Every step is skipped when done:
re-run it after each DNS change.

`yarn start` / `yarn dev` set Docker up by themselves too when it is missing
(macOS: Homebrew + Colima; Linux: this script, with sudo from a terminal).

What only you can do, at the DNS provider (`<IP>` = the VPS; `yarn start` and
`yarn supabase:check` print the exact values, the DKIM key included):

| Record | Name | Value |
|---|---|---|
| A | `supabase.anhchangvt1994.com` | `<IP>` |
| A | `mail.anhchangvt1994.com` | `<IP>` |
| TXT | `auth.anhchangvt1994.com` | `v=spf1 ip4:<IP> -all` |
| TXT | `mail.anhchangvt1994.com` | `v=spf1 a -all` |
| TXT | `mail._domainkey.auth.anhchangvt1994.com` | printed (DKIM) |
| TXT | `_dmarc.auth.anhchangvt1994.com` | `v=DMARC1; p=none; adkim=s; aspf=s; rua=mailto:<you>` |
| MX | `auth.anhchangvt1994.com` | `10 mail.anhchangvt1994.com` |

and at the VPS provider: reverse DNS (PTR) of `<IP>` -> `mail.anhchangvt1994.com`
(Contabo > Reverse DNS management).

## Operations

All ports are bound to 127.0.0.1. Reach the database through SSH:

```bash
ssh -L 54322:127.0.0.1:54322 deploy@<IP>   # then psql postgresql://postgres:<POSTGRES_PASSWORD>@127.0.0.1:54322/postgres
```

```bash
C="docker compose -f infra/supabase/docker-compose.yml --env-file infra/supabase/.env"
$C ps                       # state
$C logs -f auth mail        # Auth / mail delivery
$C exec -T db pg_dump -U postgres -d postgres --schema=public --schema=auth > backup.sql
```

`infra/supabase/.env` and the `db-data` volume belong together: never delete
one without the other (`$C down -v` deletes the volumes, every account with them).

Mail deliverability: a new IP has no reputation. Start DMARC at `p=none`,
watch the reports, then move to `p=quarantine`. Outlook/Hotmail are the
strictest with VPS ranges.
