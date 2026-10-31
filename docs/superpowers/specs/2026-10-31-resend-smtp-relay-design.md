# Resend SMTP Relay Design

## Intent

Improve delivery of Supabase Auth verification and recovery messages by relaying outbound mail through Resend instead of delivering directly from the VPS IP. Gmail has authenticated the recent mail with SPF, DKIM, and DMARC, but still classified it as spam; the message and sending IP/domain reputation remain relevant.

## Goals

- Keep Supabase Auth sending to the existing private Docker Mailserver.
- Route Docker Mailserver outbound SMTP through Resend using authenticated STARTTLS on port 587.
- Configure relay host, username, and API key from the ignored `server/.env.local`; never expose them to browser config or commit them.
- Keep direct delivery available when relay configuration is absent.
- Update the mail diagnostic so relay mode checks the configured SMTP route and does not mistake VPS PTR/IP SPF for Resend's sending infrastructure.
- Preserve existing sender address and templates unless Resend requires a verified-domain adjustment.
- Verify DNS records from Resend's dashboard before changing Hostinger; do not create duplicate SPF records or remove unrelated mail records.

## Non-goals and anti-goals

- No promise that every recipient provider will place every message in Inbox.
- Do not use Gmail's “Not spam” action as the technical fix.
- Do not send non-transactional mail or add tracking to OTP messages.
- Do not expose the Resend API key in client-side environment/configuration, logs, screenshots, or chat.

## Approaches considered

1. **Resend authenticated SMTP relay (chosen):** keep the current local Auth/Postfix flow and relay outbound messages through Resend's maintained infrastructure. Requires private SMTP credentials and provider-issued DNS verification records. Best fit for the user's no-budget constraint and the current Docker Mailserver architecture.
2. **Continue direct delivery from VPS:** no provider credential or service dependency, but continues using the VPS IP's deliverability reputation and requires gradual sending/warm-up. Less likely to address the observed VPS-specific concern.
3. **Replace Supabase Auth/Postfix mail with a different mail architecture:** broader change and operational risk without a clear benefit for this OTP-only use case.

## Architecture and configuration

GoTrue continues delivering to the existing `mail` service on the internal Docker network. Docker Mailserver relays outbound SMTP through Resend (`smtp.resend.com:587`, username `resend`, password is the Resend API key). Use STARTTLS on port 587: the pinned Docker Mailserver would need special SMTP wrapper-mode configuration for Resend's implicit-TLS port 465, and a global wrapper-mode setting could break direct-delivery fallback. Keep the relay password out of Docker Compose environment variables by generating a mode-`0600` Postfix SASL credentials file under the ignored `infra/supabase` runtime files and mounting it read-only into the mail container. Load private values from `server/.env.local`, which must be added after the environment-specific config layer. When no relay is configured, retain the existing direct-delivery fallback.

Use the exact SPF, DKIM, and any return-path records shown by Resend after adding the sending domain. The current sender domain is `auth.anhchangvt1994.com`; keep it if Resend verifies it. Configure `MAIL_RELAY_SPF_DOMAIN`, `MAIL_RELAY_SPF_INCLUDE`, and `MAIL_RELAY_DKIM_HOST` to match Resend's dashboard when its DNS owner names differ from defaults. If Resend's generated records overlap an existing DNS owner name, merge or replace only that record as required, ensuring there is exactly one SPF policy per owner name. Keep existing DMARC and unrelated records intact.

## Verification and success criteria

- The Supabase mail diagnostic identifies relay mode and can reach the configured SMTP relay on its port.
- A fresh OTP message is accepted by Resend and appears in its send activity.
- Gmail “Show original” for a fresh message reports SPF, DKIM, and DMARC PASS with authentication aligned to the visible From domain.
- Record where Gmail placed the message without changing its spam classification as a deliverability workaround.
- Treat Inbox placement as an observed result for each provider, not a guarantee; inspect Resend delivery insights and Google Postmaster data when available.

## Required external setup

The user must create/verify a Resend account and domain, then place the generated API key into the private VPS environment. The agent must not ask the user to paste that key into chat. Resend's free quota and DNS records are subject to its current dashboard and terms.

## References

- Resend SMTP endpoint and credentials: https://resend.com/changelog/smtp-service
- Resend-generated SPF/DKIM records and domain verification: https://resend.com/changelog/new-domain-webhooks
- Gmail sender requirements and reputation guidance: https://support.google.com/mail/answer/81126?hl=en
