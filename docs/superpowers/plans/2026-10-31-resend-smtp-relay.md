# Resend SMTP Relay Implementation Plan

**Goal:** Route Supabase Auth email through authenticated Resend SMTP while keeping relay credentials out of Git, Docker environment metadata, and browser configuration.

**Architecture:** GoTrue continues sending to the existing internal Docker Mailserver. When configured, Docker Mailserver uses Resend over STARTTLS on port 587 with credentials in a generated, ignored Postfix SASL file; otherwise it retains direct delivery. DNS names for SPF and DKIM are configurable to match the Resend dashboard.

**Spec:** `docs/superpowers/specs/2026-10-31-resend-smtp-relay-design.md`

## Global constraints

- Credentials live in ignored `server/.env.local` and a generated mode-`0600` SASL file. Never add them to tracked env files, Docker container variables, logs, or the browser bundle.
- Preserve existing DNS records; use exact provider-generated records and do not create duplicate SPF records at an owner name.
- Preserve pre-existing `server/dist` changes and do not use Gmail's “Not spam” action as the technical fix.

## Implementation status

- [x] Load private `.env.local` overrides consistently in the Node and TypeScript env loaders; explicitly ignore private and generated secret files.
- [x] Validate relay settings and construct the bracketed relay host; reject incomplete credentials and unsafe host/port values without printing secrets.
- [x] Generate a mode-`0600` Postfix SASL map before stack startup; clear it in direct-delivery mode; strip relay credentials from the Docker Compose child environment; recreate only the mail container if a changed bind-mounted map was not applied by Compose.
- [x] Configure Docker Mailserver with the optional relay and read-only SASL map mount.
- [x] Add relay-aware DNS and socket diagnostics that do not attribute direct VPS IP/PTR/port-25 checks to Resend.
- [x] Document domain verification, private API-key setup, fresh-message checks, and Inbox-placement limits.
- [x] Run static syntax/config checks, inspect the final diff, and confirm the existing `server/dist` changes remain untouched.

## Review focus

- Relay host with missing username or password fails before Compose starts.
- With no relay configured, direct delivery remains enabled and stale SASL credentials are cleared.
- Runtime diagnostics never expose the SMTP password or map contents.
- SPF/DKIM DNS names and SPF include can match the exact values in Resend's account dashboard.
- No provider/API setup or delivery can be confirmed until the user creates/verifies their Resend domain and supplies the key privately on the VPS.
