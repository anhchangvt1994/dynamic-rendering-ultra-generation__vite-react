/**
 * NOTE - Supabase (Auth + Data API), behind ENABLE_SUPABASE (server/.env)
 * - supabaseClientEnv()   -> the only Supabase values the browser gets: the
 *                            public URL and the publishable key
 * - ensureLocalSupabase() -> yarn dev: the pinned CLI (config/build-tool-packages) starts
 *                            the stack of supabase/config.toml in a Docker
 *                            compatible runtime, then waits for its health
 * - ensureSelfHostedSupabase() -> yarn start (preflight): the stack of
 *                            infra/supabase/docker-compose.yml, its secrets
 *                            and DKIM key made on the first run, migrations
 *                            applied; then the public URL and the mail DNS
 *                            are checked and what is missing is printed
 * Nothing here installs Docker or changes nginx, DNS or the firewall.
 */
import { spawn, spawnSync } from 'child_process'
import crypto from 'crypto'
import dns from 'dns/promises'
import dotenv from 'dotenv'
import fs from 'fs'
import net from 'net'
import { fileURLToPath } from 'url'
import { isEnabled, loadEnv } from './ServerEnv.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const CLI = `${ROOT}node_modules/.bin/supabase`
const HEALTH_TIMEOUT = 90000
const COMPOSE_FILE = `${ROOT}infra/supabase/docker-compose.yml`
const SECRETS_FILE = `${ROOT}infra/supabase/.env`
const DKIM_SELECTOR = 'mail'

const log = (...args) => console.log('[supabase]', ...args)

/**
 * A key the browser may hold: publishable (sb_publishable_...) or the legacy
 * anon JWT. Secret / service-role keys are refused, never bundled.
 */
export const assertPublishableKey = (key, source) => {
  if (!key) throw new Error(`${source}: SUPABASE_PUBLISHABLE_KEY is empty`)
  if (key.startsWith('sb_publishable_')) return key
  if (key.startsWith('sb_secret_'))
    throw new Error(`${source}: a secret key can not be sent to the browser`)
  const role = (() => {
    try {
      return JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role
    } catch {
      return undefined
    }
  })()
  if (role !== 'anon')
    throw new Error(
      `${source}: SUPABASE_PUBLISHABLE_KEY must be a publishable (or anon) key`
    )
  return key
} // assertPublishableKey

/**
 * NOTE - For env/env.supabase.mjs. Flag off: nothing reaches the bundle.
 * yarn dev passes the local stack's values through process.env.
 */
export const supabaseClientEnv = () => {
  const mode =
    process.env.NODE_ENV === 'development' ? 'development' : 'production'
  const env = loadEnv(mode)
  if (!isEnabled(env.ENABLE_SUPABASE))
    return { enabled: false, url: '', publishable_key: '' }
  // NOTE - Self-hosted (yarn build on the VPS): the anon key of the stack,
  // whose secrets are made now if this build comes before the first start
  if (mode === 'production' && !env.SUPABASE_PUBLISHABLE_KEY)
    env.SUPABASE_PUBLISHABLE_KEY = ensureSupabaseSecrets().ANON_KEY

  const source = 'ENABLE_SUPABASE=true'
  const url = String(env.SUPABASE_PUBLIC_URL || '').replace(/\/+$/, '')
  try {
    new URL(url)
  } catch {
    throw new Error(`${source}: SUPABASE_PUBLIC_URL is not a URL ("${url}")`)
  }
  return {
    enabled: true,
    url,
    publishable_key: assertPublishableKey(env.SUPABASE_PUBLISHABLE_KEY, source),
  }
} // supabaseClientEnv

const supabase = (args, options = {}) =>
  spawnSync(CLI, args, { cwd: ROOT, encoding: 'utf8', ...options })

/** The running local stack (supabase status), or null */
const localStatus = () => {
  const result = supabase(['status', '-o', 'json'])
  if (result.status !== 0) return null
  try {
    // NOTE - The CLI may print notices before the JSON
    const json = result.stdout.slice(result.stdout.indexOf('{'))
    return JSON.parse(json)
  } catch {
    return null
  }
} // localStatus

const startLocal = () =>
  new Promise((resolve, reject) => {
    log('Starting the local stack (the first run downloads its images)...')
    const child = spawn(CLI, ['start'], { cwd: ROOT, stdio: 'inherit' })
    child.once('error', reject)
    child.once('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`supabase start exited with code ${code}`))
    )
  })

const waitForHealth = async (url, key) => {
  const startTime = Date.now()
  const headers = { apikey: key }
  let reason = ''
  while (Date.now() - startTime < HEALTH_TIMEOUT) {
    try {
      const [auth, rest] = await Promise.all(
        [`${url}/auth/v1/health`, `${url}/rest/v1/`].map((endpoint) =>
          fetch(endpoint, { headers, signal: AbortSignal.timeout(3000) })
        )
      )
      if (auth.ok && rest.ok) return
      reason = `auth ${auth.status}, rest ${rest.status}`
    } catch (err) {
      reason = err.cause?.code || err.message
    }
    await new Promise((res) => setTimeout(res, 1000))
  }
  throw new Error(`Supabase at ${url} is not healthy (${reason})`)
} // waitForHealth

const VPS_SCRIPT = `${ROOT}scripts/vps-setup/supabase.sh`
const has = (command) =>
  spawnSync('sh', ['-c', `command -v ${command}`], { stdio: 'ignore' })
    .status === 0
const run = (command, args) => {
  log(`$ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed`)
}

/** missing | denied | down | no-compose | ready */
const dockerState = () => {
  const info = spawnSync('docker', ['info'], {
    encoding: 'utf8',
    timeout: 20000,
  })
  if (info.error?.code === 'ENOENT') return 'missing'
  if (info.status !== 0)
    return /permission denied/i.test(info.stderr) ? 'denied' : 'down'
  return spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' }).status
    ? 'no-compose'
    : 'ready'
} // dockerState

// NOTE - macOS: Homebrew's docker CLI + Compose + Colima (a light VM), or the
// runtime already there (Docker Desktop / OrbStack are only started)
const installDockerMac = (state) => {
  if (!has('brew'))
    throw new Error(
      'Docker is needed and Homebrew is not installed: install Homebrew (https://brew.sh), then run this again'
    )
  const formulae = ['docker', 'docker-compose', 'colima'].filter(
    (formula) =>
      spawnSync('brew', ['list', '--versions', formula], { stdio: 'ignore' })
        .status !== 0
  )
  if (state === 'missing' || state === 'no-compose' || !has('colima'))
    if (formulae.length) run('brew', ['install', ...formulae])

  // docker finds Compose v2 among its CLI plugins
  const prefix = spawnSync('brew', ['--prefix'], {
    encoding: 'utf8',
  }).stdout.trim()
  const plugins = `${process.env.HOME}/.docker/cli-plugins`
  const plugin = `${plugins}/docker-compose`
  if (!fs.existsSync(plugin)) {
    fs.mkdirSync(plugins, { recursive: true })
    fs.symlinkSync(`${prefix}/opt/docker-compose/bin/docker-compose`, plugin)
    log(`Linked Compose v2 into ${plugins}`)
  }

  if (dockerState() !== 'down') return
  for (const app of ['OrbStack', 'Docker'])
    if (fs.existsSync(`/Applications/${app}.app`)) {
      run('open', ['-a', app])
      return
    }
  // NOTE - Its own Colima profile: a profile used for something else is
  // left alone (colima start switches the docker context to this one)
  run('colima', [
    'start',
    '--profile',
    'supabase',
    '--cpu',
    '2',
    '--memory',
    '4',
  ])
} // installDockerMac

/**
 * NOTE - Linux (the VPS): scripts/vps-setup/supabase.sh installs Docker +
 * Compose and lets this user use them. It needs root: as root, or with sudo
 * from a terminal (asks the password); a service without sudo gets the
 * command to run once instead.
 */
const installDockerLinux = () => {
  const user = spawnSync('id', ['-un'], { encoding: 'utf8' }).stdout.trim()
  const args = [VPS_SCRIPT, '--docker-only', '--app-user', user]
  if (process.getuid?.() === 0) return run('bash', args)
  const canSudo =
    has('sudo') &&
    (process.stdin.isTTY ||
      spawnSync('sudo', ['-n', 'true'], { stdio: 'ignore' }).status === 0)
  if (!canSudo)
    throw new Error(
      'Docker is needed: run once, from a terminal on this server: sudo bash scripts/vps-setup/supabase.sh'
    )
  run('sudo', ['bash', ...args])
} // installDockerLinux

/** A running Docker runtime with Compose v2: installed and started if not */
const ensureDocker = async () => {
  let state = dockerState()
  if (state === 'ready') return
  log(
    `Docker is ${state === 'no-compose' ? 'missing Compose v2' : state}: setting it up...`
  )
  if (process.platform === 'darwin') installDockerMac(state)
  else if (process.platform === 'linux') installDockerLinux()
  else
    throw new Error(
      `Docker is ${state}: install Docker Desktop, then run this again`
    )
  // a runtime just started takes a moment to answer
  for (let i = 0; i < 30 && (state = dockerState()) === 'down'; i++)
    await new Promise((res) => setTimeout(res, 1000))
  if (state !== 'ready')
    throw new Error(
      state === 'denied'
        ? 'This user can not use Docker yet: log out and in again (or restart the app service)'
        : `Docker is still ${state} after setting it up (see above)`
    )
  log('Docker is ready')
} // ensureDocker

/** yarn dev with ENABLE_SUPABASE=true: { url, publishableKey, mailUrl } */
export async function ensureLocalSupabase() {
  if (!fs.existsSync(CLI))
    throw new Error(
      'The Supabase CLI is missing: run yarn install (it is pinned in config/build-tool-packages/package.json)'
    )
  if (!fs.existsSync(`${ROOT}supabase/config.toml`))
    throw new Error('supabase/config.toml is missing')

  await ensureDocker()

  let status = localStatus()
  if (!status?.API_URL) {
    await startLocal()
    status = localStatus()
  }
  if (!status?.API_URL)
    throw new Error('supabase status reports no API_URL after supabase start')

  const url = status.API_URL.replace(/\/+$/, '')
  const publishableKey = assertPublishableKey(
    status.PUBLISHABLE_KEY || status.ANON_KEY,
    'supabase status'
  )
  await waitForHealth(url, publishableKey)

  const mailUrl = status.MAILPIT_URL || status.INBUCKET_URL
  log(`Ready at ${url}${mailUrl ? ` (emails: ${mailUrl})` : ''}`)
  return { url, publishableKey, mailUrl }
} // ensureLocalSupabase

// ---------------------------------------------------------------------------
// Self-hosted stack (yarn start)
// ---------------------------------------------------------------------------

const signJwt = (payload, secret) => {
  const part = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(unsigned)
    .digest('base64url')
  return `${unsigned}.${signature}`
} // signJwt

/**
 * NOTE - infra/supabase/.env (mode 600, never committed): the database
 * password, the JWT secret and the two keys signed with it. Made once; delete
 * it only with the database volume (docker compose down -v), they belong
 * together.
 */
export const ensureSupabaseSecrets = () => {
  if (fs.existsSync(SECRETS_FILE))
    return dotenv.parse(fs.readFileSync(SECRETS_FILE))

  const random = (bytes) => crypto.randomBytes(bytes).toString('hex')
  const jwtSecret = random(32)
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 10 * 365 * 24 * 3600
  const secrets = {
    POSTGRES_PASSWORD: random(24),
    JWT_SECRET: jwtSecret,
    ANON_KEY: signJwt({ role: 'anon', iss: 'supabase', iat, exp }, jwtSecret),
    SERVICE_ROLE_KEY: signJwt(
      { role: 'service_role', iss: 'supabase', iat, exp },
      jwtSecret
    ),
  }
  fs.writeFileSync(
    SECRETS_FILE,
    '# Generated by config/utils/Supabase.mjs: never commit, never send to the browser (only ANON_KEY is public)\n' +
      Object.entries(secrets)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') +
      '\n',
    { mode: 0o600 }
  )
  log(`Generated the stack's secrets in ${SECRETS_FILE}`)
  return secrets
} // ensureSupabaseSecrets

/** server env -> the values docker-compose.yml reads (no secrets) */
const stackEnv = (env) => {
  const required = (key) => {
    const value = String(env[key] || '').trim()
    if (!value)
      throw new Error(`ENABLE_SUPABASE=true: ${key} is missing in server/.env`)
    return value
  }
  const publicUrl = required('SUPABASE_PUBLIC_URL').replace(/\/+$/, '')
  const mailDomain = required('MAIL_DOMAIN')
  const mailFrom = required('MAIL_FROM')
  // NOTE - DMARC passes only when the From domain is the DKIM signed one
  if (!mailFrom.toLowerCase().endsWith(`@${mailDomain.toLowerCase()}`))
    throw new Error(`MAIL_FROM (${mailFrom}) must be an address @${mailDomain}`)
  return {
    SUPABASE_PUBLIC_URL: publicUrl,
    SUPABASE_SITE_URL: required('HOST').replace(/\/+$/, ''),
    SUPABASE_REDIRECT_URLS: String(env.SUPABASE_REDIRECT_URLS || ''),
    SUPABASE_DB_PORT: String(env.SUPABASE_DB_PORT || 54322),
    SUPABASE_AUTH_PORT: String(env.SUPABASE_AUTH_PORT || 54331),
    SUPABASE_REST_PORT: String(env.SUPABASE_REST_PORT || 54332),
    MAIL_HOSTNAME: required('MAIL_HOSTNAME'),
    MAIL_DOMAIN: mailDomain,
    MAIL_FROM: mailFrom,
    MAIL_SENDER_NAME: String(env.MAIL_SENDER_NAME || 'Pokédex'),
    MAIL_RELAY_HOST: String(env.MAIL_RELAY_HOST || ''),
  }
} // stackEnv

const compose = (args, stack, options = {}) =>
  spawnSync(
    'docker',
    ['compose', '-f', COMPOSE_FILE, '--env-file', SECRETS_FILE, ...args],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...stack },
      ...options,
    }
  )

const composeOrThrow = (args, stack, what) => {
  const result = compose(args, stack, { stdio: 'inherit' })
  if (result.status !== 0)
    throw new Error(
      `${what} failed: docker compose -f infra/supabase/docker-compose.yml ${args.join(' ')}`
    )
}

/** The DKIM public key record (p=...) of MAIL_DOMAIN, made on first use */
const ensureDkim = (stack) => {
  const file = `/tmp/docker-mailserver/opendkim/keys/${stack.MAIL_DOMAIN}/${DKIM_SELECTOR}.txt`
  let record = compose(['exec', '-T', 'mail', 'cat', file], stack)
  if (record.status !== 0) {
    log(`Generating the DKIM key of ${stack.MAIL_DOMAIN}...`)
    composeOrThrow(
      [
        'exec',
        '-T',
        'mail',
        'setup',
        'config',
        'dkim',
        'domain',
        stack.MAIL_DOMAIN,
        'keysize',
        '2048',
        'selector',
        DKIM_SELECTOR,
      ],
      stack,
      'DKIM key generation'
    )
    // NOTE - The keys reach OpenDKIM when the container is created: a
    // restart keeps the old filesystem and skips that setup
    composeOrThrow(
      ['up', '-d', '--wait', '--force-recreate', 'mail'],
      stack,
      'Mail server recreation'
    )
    record = compose(['exec', '-T', 'mail', 'cat', file], stack)
  } else if (
    compose(
      ['exec', '-T', 'mail', 'grep', '-q', '.', '/etc/opendkim/SigningTable'],
      stack
    ).status !== 0
  ) {
    log('Loading the DKIM key into the mail server...')
    composeOrThrow(
      ['up', '-d', '--wait', '--force-recreate', 'mail'],
      stack,
      'Mail server recreation'
    )
  }
  // mail._domainkey IN TXT ( "v=DKIM1; h=sha256; k=rsa; " "p=MII..." "..." )
  const value = [...(record.stdout || '').matchAll(/"([^"]*)"/g)]
    .map((match) => match[1])
    .join('')
  if (!value.includes('p='))
    throw new Error(`No DKIM key in the mail server (${file})`)
  return value.replace(/\s+/g, ' ').trim()
} // ensureDkim

const waitFor = async (what, check) => {
  const startTime = Date.now()
  let reason = ''
  while (Date.now() - startTime < HEALTH_TIMEOUT) {
    try {
      reason = await check()
      if (!reason) return
    } catch (err) {
      reason = err.cause?.code || err.message
    }
    await new Promise((res) => setTimeout(res, 1000))
  }
  throw new Error(`${what} is not healthy (${reason})`)
} // waitFor

const resolver = new dns.Resolver({ timeout: 4000, tries: 2 })
resolver.setServers(['1.1.1.1', '8.8.8.8'])
const lookup = (method, name) => resolver[method](name).catch(() => [])
const txt = async (name) =>
  (await lookup('resolveTxt', name)).map((parts) => parts.join(''))

const canReach = (host, port) =>
  new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const done = (ok) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(5000, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })

/**
 * NOTE - What receivers check before trusting the mail: outbound port 25,
 * forward-confirmed reverse DNS, SPF, DKIM, DMARC. Each missing piece is
 * printed with the record to create; none of them stops the start.
 */
const checkMail = async (stack, dkim) => {
  const { MAIL_HOSTNAME: host, MAIL_DOMAIN: domain } = stack
  const lines = []
  const todo = []
  const check = (ok, label, fix) => {
    lines.push(`  ${ok ? '✓' : '✗'} ${label}`)
    if (!ok && fix) todo.push(fix)
  }

  // the server's IP: the mail host's A record, else the site's
  const hostIps = await lookup('resolve4', host)
  const [ip] = hostIps.length
    ? hostIps
    : await lookup('resolve4', new URL(stack.SUPABASE_SITE_URL).hostname)
  const ipHint = ip || '<IP of this server>'

  check(
    await canReach('gmail-smtp-in.l.google.com', 25),
    'Outbound port 25 (Gmail)',
    'Outbound port 25 is blocked: ask the VPS provider to open it, mail can not be delivered'
  )
  check(
    hostIps.length > 0,
    `A ${host} -> ${hostIps.join(', ') || 'missing'}`,
    `A     ${host}  ->  ${ipHint}`
  )
  const ptr = ip ? await lookup('reverse', ip) : []
  check(
    ptr.includes(host),
    `PTR ${ip || '?'} -> ${ptr.join(', ') || 'missing'}`,
    `PTR   ${ipHint}  ->  ${host}   (reverse DNS, set at the VPS provider: Contabo > Reverse DNS management)`
  )
  const spf = (await txt(domain)).find((value) => value.startsWith('v=spf1'))
  check(
    Boolean(
      spf && ip && (spf.includes(`ip4:${ip}`) || /\b(a|mx)(:|\s|$)/.test(spf))
    ),
    `SPF ${domain}: ${spf || 'missing'}`,
    `TXT   ${domain}  =  "v=spf1 ip4:${ipHint} -all"`
  )
  const heloSpf = (await txt(host)).find((value) => value.startsWith('v=spf1'))
  check(
    Boolean(heloSpf),
    `SPF ${host} (HELO): ${heloSpf || 'missing'}`,
    `TXT   ${host}  =  "v=spf1 a -all"`
  )
  const publicKey = dkim.match(/p=([A-Za-z0-9+/=]+)/)?.[1]
  const dkimDns = (await txt(`${DKIM_SELECTOR}._domainkey.${domain}`)).join('')
  check(
    Boolean(publicKey && dkimDns.replace(/\s+/g, '').includes(publicKey)),
    `DKIM ${DKIM_SELECTOR}._domainkey.${domain}`,
    `TXT   ${DKIM_SELECTOR}._domainkey.${domain}  =  "${dkim}"`
  )
  const dmarc = (await txt(`_dmarc.${domain}`)).find((value) =>
    value.startsWith('v=DMARC1')
  )
  check(
    Boolean(dmarc),
    `DMARC _dmarc.${domain}: ${dmarc || 'missing'}`,
    `TXT   _dmarc.${domain}  =  "v=DMARC1; p=none; adkim=s; aspf=s; rua=mailto:<your email>"`
  )
  const mx = await lookup('resolveMx', domain)
  check(
    mx.length > 0,
    `MX ${domain}: ${mx.map((record) => record.exchange).join(', ') || 'missing (recommended)'}`,
    `MX    ${domain}  ->  10 ${host}   (recommended: some receivers want the sender domain to have one)`
  )

  log(`Mail (${stack.MAIL_FROM} via ${host}):\n${lines.join('\n')}`)
  if (todo.length)
    log(
      `Until these are in place, mail may go to spam or be refused:\n${todo
        .map((line) => `    ${line}`)
        .join('\n')}`
    )
} // checkMail

/** yarn start with ENABLE_SUPABASE=true (preflight) */
export async function ensureSelfHostedSupabase(env) {
  await ensureDocker()
  const secrets = ensureSupabaseSecrets()
  const stack = stackEnv(env)

  log('Starting the self-hosted stack (the first run downloads its images)...')
  composeOrThrow(['up', '-d', '--wait'], stack, 'Starting the stack')

  const dkim = ensureDkim(stack)

  if (!fs.existsSync(CLI))
    throw new Error(
      'The Supabase CLI is missing (it applies the migrations): yarn install --production=false'
    )
  const dbUrl = `postgresql://postgres:${encodeURIComponent(secrets.POSTGRES_PASSWORD)}@127.0.0.1:${stack.SUPABASE_DB_PORT}/postgres?sslmode=disable`
  const migrate = supabase(['migration', 'up', '--db-url', dbUrl], {
    stdio: 'inherit',
  })
  if (migrate.status !== 0)
    throw new Error('Applying supabase/migrations failed (see above)')

  const headers = {
    apikey: secrets.ANON_KEY,
    Authorization: `Bearer ${secrets.ANON_KEY}`,
  }
  await waitFor('Supabase Auth and Data API', async () => {
    const [auth, rest] = await Promise.all(
      [
        `http://127.0.0.1:${stack.SUPABASE_AUTH_PORT}/health`,
        `http://127.0.0.1:${stack.SUPABASE_REST_PORT}/`,
      ].map((url) => fetch(url, { headers, signal: AbortSignal.timeout(3000) }))
    )
    return auth.ok && rest.ok ? '' : `auth ${auth.status}, rest ${rest.status}`
  })
  log(
    `Ready: Auth 127.0.0.1:${stack.SUPABASE_AUTH_PORT}, Data API 127.0.0.1:${stack.SUPABASE_REST_PORT}`
  )

  await reportSelfHostedSupabase(stack, dkim)
} // ensureSelfHostedSupabase

/**
 * NOTE - What is still missing outside Docker, printed with the fix: the
 * public URL (nginx site + certificate, scripts/vps-setup/supabase.sh) and
 * the mail DNS. Checked, never changed.
 */
const reportSelfHostedSupabase = async (stack, dkim) => {
  const publicHost = new URL(stack.SUPABASE_PUBLIC_URL).hostname
  const reachable = await fetch(`${stack.SUPABASE_PUBLIC_URL}/auth/v1/health`, {
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => res.ok)
    .catch(() => false)
  if (reachable) log(`Public URL ${stack.SUPABASE_PUBLIC_URL} answers`)
  else if (!(await lookup('resolve4', publicHost)).length)
    log(
      `Warning: ${publicHost} has no A record yet: create A ${publicHost} -> the IP of this server`
    )
  else
    log(
      `Warning: ${stack.SUPABASE_PUBLIC_URL} does not answer: run once, from a terminal on this server: sudo bash scripts/vps-setup/supabase.sh`
    )

  await checkMail(stack, dkim)
} // reportSelfHostedSupabase

/** yarn supabase:check: the self-hosted stack's state, nothing started */
export async function checkSelfHostedSupabase(env) {
  const stack = stackEnv(env)
  if (dockerState() !== 'ready' || !fs.existsSync(SECRETS_FILE))
    throw new Error(
      'The stack is not set up yet: sudo bash scripts/vps-setup/supabase.sh'
    )
  await reportSelfHostedSupabase(stack, ensureDkim(stack))
}
