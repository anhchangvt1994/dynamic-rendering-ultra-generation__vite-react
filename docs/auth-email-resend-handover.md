# Handover: Supabase OTP mail through Resend

Last checked: 2026-11-01 (Asia/Ho_Chi_Minh)

This file records the current setup and the steps to continue work on Supabase Auth email delivery. Read this before changing the mail configuration so we do not repeat setup or expose credentials.

## Project and access

- Repository: `anhchangvt1994/dynamic-rendering-ultra-generation__vite-react`
- Branch: `jupiter/241026_big-update`
- VPS checkout: `/root/dynamic-rendering-ultra-generation__vite-react`
- VPS: `217.217.255.86` (Ubuntu; Nginx reverse proxy; 4 vCPU, about 8 GiB RAM)
- App sign-in route: `https://anhchangvt1994.com/dang-nhap`
- Supabase public endpoint: `https://supabase.anhchangvt1994.com`
- Sending/auth domain: `auth.anhchangvt1994.com`
- Visible sender: `Pokédex <support@auth.anhchangvt1994.com>`
- User-provided administrative/contact email used during VPS setup: `anhchangvt1994@gmail.com`

## Current architecture

```text
Pokédex sign-up / password recovery
  -> Supabase Auth (GoTrue)
  -> private Docker Mailserver on the VPS
  -> authenticated Resend SMTP relay (STARTTLS, port 587)
  -> recipient mail provider (for example Gmail)
```

Supabase Auth still submits mail to the internal mail container. The mail container relays outbound messages through Resend. The frontend does not connect to SMTP and must never receive the Resend key.

## What has been configured

- Supabase self-hosting is deployed on the VPS and the OTP email flow is active.
- Resend SMTP relay is configured for `smtp.resend.com:587`, using SMTP username `resend` and STARTTLS.
- The Resend API key is stored only in the VPS private file `server/.env.local`. The file and generated Postfix SASL credentials are intended to have mode `0600`; both are gitignored. **The key is deliberately not recorded here. Do not paste it into chat, Git, screenshots, or frontend environment files.**
- The implementation loads private relay settings, generates the Postfix SASL map, and keeps the relay password out of Docker Compose container metadata. If relay configuration is removed, the existing direct-delivery fallback remains available.
- On 2026-11-01, the VPS `server/.env.local` was updated to use `MAIL_FROM=support@auth.anhchangvt1994.com` and the user-approved `MAIL_REPLY_TO=anhchangvt1994@gmail.com`; the file remains mode `0600`. Supabase must be recreated after the Reply-To code is deployed for GoTrue to pick up `GOTRUE_SMTP_HEADERS`.
- Resend's current dashboard confirms `auth.anhchangvt1994.com` is **Verified**, sending is enabled, receiving is disabled, and Resend Forge is enabled in Tokyo (`ap-northeast-1`). The dashboard shows Hostinger as DNS provider.
- Resend's verified public DNS records currently shown in its dashboard are: TXT `resend._domainkey.auth` (DKIM; public key intentionally not copied here); CNAME `rsend.auth` → `rsend-apne1.forge.rmta.net`; and CNAME `send.auth` → `send.forge.rmta.net` (TTL 3600). Hostinger appends `.anhchangvt1994.com` to these relative owner names. Do not add a second SPF policy at an owner name or replace DKIM values by guessing. Resend's current domain dashboard is authoritative for exact record names and values.
- The mail diagnostic command is `yarn -s supabase:check`.
- The VPS diagnostic passed SMTP, private credential-file permissions, SPF, DKIM, and DMARC in an earlier verification after the relay DNS settings were aligned in the private environment file. This is a historical result; rerun the diagnostic before relying on it after deployment or DNS changes.
- The setup/repair script is `sudo bash scripts/vps-setup/supabase.sh` from the repository root. It may restart the app and mail stack; inspect its behavior and current deployment state before rerunning it.

## Results observed so far

- A Gmail “Show original” result supplied during setup showed SPF **PASS**, DKIM **PASS** with `auth.anhchangvt1994.com`, and DMARC **PASS**.
- The latest email inspected in Resend showed **Sent** and **Delivered**, with no bounce event visible. “Delivered” means the recipient mail server accepted the message; it does not prove the message landed in Inbox.
- A later test to a different Google Workspace mailbox also arrived in Spam. Its Gmail “Show original” showed SPF **PASS** with IP `23.251.234.51`, DKIM **PASS** with `auth.anhchangvt1994.com`, and DMARC **PASS**; Gmail said it was delivered after 2 seconds. Gmail displayed the warning that the message is similar to messages previously identified as spam. The warning does not identify whether the cause is sender/domain reputation or message similarity, so do not treat it as proof of a DNS/authentication fault.
- That test recipient was a Google Workspace address, not a personal `@gmail.com` account. Google says Postmaster Tools reports outgoing mail to personal Gmail accounts, so this test is not expected to populate its dashboards. The opened Gmail conversation also showed one deleted message in the same subject thread; the mailbox is therefore not a fully verified clean-room history.
- Test OTP messages have landed in Gmail Spam. This remains an inbox-placement/reputation issue; passing SPF, DKIM, and DMARC does not guarantee Inbox placement.
- Resend Deliverability Insights on the latest delivered OTP email found one actionable issue: `Don't use "no-reply"`. The sender address is now configured as `support@auth.anhchangvt1994.com`; `MAIL_REPLY_TO` is set only in the VPS `server/.env.local` to the approved support inbox. `GOTRUE_SMTP_HEADERS` is generated from that private value so it does not need to be committed. Deployment and a fresh-message inbox-placement check are still required.
- Resend Logs showed 12 successful `POST /emails` requests in the preceding 48 minutes. Avoid repeated test sends while assessing inbox placement; this is a new sending domain and Gmail's own notice says the message resembles mail previously classified as spam.
- Google Postmaster Tools was checked for `auth.anhchangvt1994.com`. In the last-7-days view, **Spam**, **Authentication**, **Delivery Errors**, and **Compliance status** all said “No data was found for this domain.” This is missing telemetry, not a pass/fail diagnosis and not evidence that no messages went to Spam.
- Google's guidance says dashboards can omit data when outgoing Gmail volume is low, and updates are not real time. The dashboard is intended for mail to personal Gmail accounts. Check again after sufficient real traffic; do not generate artificial bulk traffic to populate it.
- Gmail's “Not spam” action was explicitly rejected as a technical workaround. Do not use it to claim the issue is fixed.

## Safe continuation checklist

1. Start from the VPS repository above and confirm the current branch/status before edits. Preserve pre-existing changes, especially generated or tracked files under `server/dist`; do not overwrite them as part of mail work.
2. Check that `server/.env.local` exists on the VPS and is private (`chmod 600 server/.env.local`). Do not print or copy its values. Required setting names are:

   ```text
   MAIL_RELAY_HOST
   MAIL_RELAY_PORT
   MAIL_RELAY_USER
   MAIL_RELAY_PASSWORD
   MAIL_RELAY_SPF_DOMAIN
   MAIL_RELAY_SPF_INCLUDE
   MAIL_RELAY_DKIM_HOST
   ```

   The first four are SMTP connection settings; the last three let the diagnostic check the provider's actual DNS owners. Use the current Resend dashboard for their exact values rather than assuming examples in older docs are still current.

3. Run `yarn -s supabase:check` from the project root on the VPS. It should identify relay mode and check connectivity, private credential-file permissions, SPF, DKIM, and DMARC without revealing the key. If anything fails, capture the exact failing check and fix only that layer.
4. For one controlled test, trigger sign-up or password recovery from `/dang-nhap` using an address that requested it. Check Resend's email activity for Sent/Delivered/Failed/Bounced and independently record whether the recipient saw Inbox or Spam. Do not treat Delivered as Inbox placement.
5. If the test is in Spam and authentication still passes, keep the classification unchanged. Check message content/headers and any provider feedback; use Postmaster only when it has data. Avoid repeated tests to many unrelated addresses.
6. Recheck Postmaster Tools later. Its current lack of data prevents a reliable diagnosis of domain/IP reputation or Gmail spam rate. No DNS change is justified by the current Postmaster result alone.

## Decisions and guardrails

- Resend SMTP relay is the selected mail path; no paid AWS SES setup is part of this plan.
- Keep the OTP email transactional, expected, and limited to a user-requested sign-up or recovery. Do not add marketing content or tracking to OTP messages.
- Preserve the authenticated sender domain and existing DNS unless Resend's dashboard or a failing diagnostic provides a specific, verified change.
- Do not promise that every provider will put every message in Inbox. Relay acceptance, authentication, and mailbox placement are separate outcomes.
- Never record the Resend API key, SMTP password, OTP codes, or full email bodies in this file.

## Existing implementation references

- `docs/auth-email-resend.md` — setup and operation guide.
- `docs/superpowers/specs/2026-10-31-resend-smtp-relay-design.md` — approved design and constraints.
- `docs/superpowers/plans/2026-10-31-resend-smtp-relay.md` — implementation checklist.
- `scripts/vps-setup/supabase.sh` — VPS Supabase/mail setup script.
- `config/scripts/supabase-check.mjs` — `supabase:check` diagnostic.

## Links

- [Google Postmaster Tools dashboards and missing-data notes](https://support.google.com/mail/answer/14668346?hl=en)
- [Google Gmail sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
- [Resend SMTP documentation](https://resend.com/changelog/smtp-service)
