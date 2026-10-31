# Route Supabase Auth mail through Resend

Supabase Auth continues to submit mail to the private Docker Mailserver. When the optional relay settings below are present, Docker Mailserver forwards mail through Resend SMTP using STARTTLS on port 587. The Resend API key stays on the server in an ignored file and is not added to the container environment or browser bundle.

## 1. Verify the sending domain in Resend

Create a Resend account, add the exact sending domain used by `MAIL_FROM` (currently `auth.anhchangvt1994.com`), and enable sending. Copy the records Resend shows for that domain. Add those exact values in Hostinger DNS. Do not create a second SPF TXT record at an owner name that already has SPF; merge the provider's `include` into the existing policy if Resend instructs you to do so. Keep unrelated records and the current DMARC record intact. A DNS checker reporting a record exists is not the same as Resend verifying it; wait for the domain status to show verified.

Resend's dashboard is authoritative for the SPF owner, include value, DKIM record name/selector, and any MX or return-path records. Names can vary with the selected domain configuration. Do not guess a DKIM public key or replace an existing key.

## 2. Add private server settings

On the VPS, create or edit `server/.env.local` (not `server/.env` or `server/.env.production`):

```dotenv
MAIL_RELAY_HOST=smtp.resend.com
MAIL_RELAY_PORT=587
MAIL_RELAY_USER=resend
MAIL_RELAY_PASSWORD=<Resend SMTP API key>

# Set these to the exact DNS owner names and values shown by Resend.
MAIL_RELAY_SPF_DOMAIN=send.auth.anhchangvt1994.com
MAIL_RELAY_SPF_INCLUDE=amazonses.com
MAIL_RELAY_DKIM_HOST=resend._domainkey.auth.anhchangvt1994.com
```

Restrict this file on the VPS with `chmod 600 server/.env.local`.

The example SPF/DKIM owner names and SPF include are common Resend defaults, not a substitute for the records in your Resend dashboard. Change them if the dashboard shows different values. Keep the API key out of chat, screenshots, Git, and the frontend `.env` files. `server/.env.local` is gitignored and overrides the mode-specific server environment file.

The self-host startup writes the matching Postfix SASL map to `infra/supabase/postfix-sasl-password.cf` with file mode `0600`. That generated file is also gitignored. Docker Compose receives the relay hostname and port but not the username or password in container metadata.

To disable the relay and return to direct VPS delivery, remove all four `MAIL_RELAY_*` connection settings from `server/.env.local` (host, port, user, and password), then restart the stack. The generated auth map is cleared on startup.

## 3. Start and inspect

Restart the Supabase self-host stack using the project's normal deployment command, then run:

```sh
yarn -s supabase:check
```

The mail diagnostic checks relay reachability, the private credentials file permissions, the configured SPF and DKIM DNS names, and DMARC. In relay mode it does not treat the VPS IP, PTR, or outbound port 25 as the sender route. It never prints the API key.

Send a fresh verification email after Resend shows the domain as verified. Confirm that Resend records the email as accepted/delivered, then inspect Gmail's **Show original** authentication results for SPF, DKIM, and DMARC. Keep the message's real Spam/Inbox classification when recording the result. Resend can improve sending infrastructure and reputation, but no SMTP provider can guarantee Inbox placement for every recipient or provider.

## References

- [Resend SMTP connection details](https://resend.com/changelog/smtp-service)
- [Docker Mailserver relay host configuration](https://docker-mailserver.github.io/docker-mailserver/latest/config/advanced/mail-forwarding/relay-hosts/)
- [Gmail sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
