import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

const setup = fs.readFileSync(new URL('./setup.sh', import.meta.url), 'utf8')

function sandbox(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vps-security-'))
  try {
    for (const sub of [
      'ssh/sshd_config.d',
      'fail2ban/jail.d',
      'fail2ban/filter.d',
      'sysctl.d',
    ])
      fs.mkdirSync(`${dir}/etc/${sub}`, { recursive: true })
    fs.writeFileSync(
      `${dir}/etc/ssh/sshd_config`,
      `Include ${dir}/etc/ssh/sshd_config.d/*.conf\nPort 22\n`
    )
    const source = setup
      .replace(/^main "\$@"$/m, '')
      .replaceAll('/etc/', `${dir}/etc/`)
      .replaceAll('/run/sshd', `${dir}/run/sshd`)
    const shell = (body) =>
      spawnSync(
        'bash',
        [
          '-c',
          `${source}
log() { :; }; ok() { :; }; warn() { :; }
sshd() { if [[ $1 == -T ]]; then printf 'port 22\\n'; fi; }
systemctl() { printf '%s\\n' "$*" >> '${dir}/systemctl'; }
ss() { :; }
selinux_on() { return 1; }
${body}`,
        ],
        { encoding: 'utf8' }
      )
    run({ dir, shell })
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('default setup leaves SSH configuration and service untouched', () =>
  sandbox(({ dir, shell }) => {
    const main = fs.readFileSync(`${dir}/etc/ssh/sshd_config`, 'utf8')
    const result = shell('harden_ssh')
    assert.equal(result.status, 0, result.stderr)
    assert.equal(fs.readFileSync(`${dir}/etc/ssh/sshd_config`, 'utf8'), main)
    assert.equal(
      fs.existsSync(`${dir}/etc/ssh/sshd_config.d/00-vps-hardening.conf`),
      false
    )
    assert.equal(fs.existsSync(`${dir}/systemctl`), false)
  }))

test('live SSH and systemd socket ports survive missing SSH_CONNECTION', () =>
  sandbox(({ shell }) => {
    const result = shell(`
SSH_CONNECTION=''
ss() { printf 'LISTEN 0 128 0.0.0.0:2200 0.0.0.0:* users:(("sshd",pid=123,fd=3))\\n'; }
systemctl() { if [[ $1 == show ]]; then printf '[::]:2222 (Stream)\\n'; fi; }
safe_ssh_ports
`)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(result.stdout.trim().split(/\s+/), ['22', '2200', '2222'])
  }))

test('web bans are limited to HTTP/HTTPS and QUIC, not SSH', () =>
  sandbox(({ dir, shell }) => {
    const result = shell(`
fail2ban-client() { return 0; }
setup_fail2ban
`)
    assert.equal(result.status, 0, result.stderr)
    const config = fs.readFileSync(
      `${dir}/etc/fail2ban/jail.d/zz-vps.conf`,
      'utf8'
    )
    for (const jail of ['nginx-limit-req', 'nginx-probe']) {
      const section = config.split(`[${jail}]`)[1].split(/\n\[/)[0]
      assert.doesNotMatch(section, /allports/)
      const identities = [...section.matchAll(/actname=([^,\]]+)/g)].map(
        (match) => match[1]
      )
      assert.equal(
        identities.length,
        2,
        'Older fail2ban requires explicit action identities'
      )
      assert.equal(
        new Set(identities).size,
        2,
        'TCP and UDP actions must be distinct'
      )
      assert.match(
        section,
        /nftables-multiport\[.*port="80,443", protocol=tcp\]/
      )
      assert.match(section, /nftables-multiport\[.*port="443", protocol=udp\]/)
    }
  }))

test('kernel hardening preserves the existing reverse-path filtering policy', () =>
  sandbox(({ dir, shell }) => {
    const result = shell(`
vps_network_buffer_max_bytes() { echo 8388608; }
modprobe() { return 1; }
sysctl() { printf '%s\\n' "$*" >> '${dir}/sysctl'; }
setup_sysctl
`)
    assert.equal(result.status, 0, result.stderr)
    assert.doesNotMatch(
      fs.readFileSync(`${dir}/etc/sysctl.d/90-vps-hardening.conf`, 'utf8'),
      /rp_filter\s*=/
    )
    assert.match(
      fs.readFileSync(`${dir}/etc/sysctl.d/90-vps-hardening.conf`, 'utf8'),
      /net\.ipv4\.tcp_rmem = 4096 131072 8388608/
    )
    assert.doesNotMatch(fs.readFileSync(`${dir}/sysctl`, 'utf8'), /rp_filter/)
  }))

test('firewalld updates active zones in runtime and permanent config without reload', () =>
  sandbox(({ dir, shell }) => {
    const result = shell(`
FAMILY=rhel
FIREWALL_BACKEND=firewalld
firewall-cmd() {
  printf '%s\\n' "$*" >> '${dir}/firewall'
  case "$*" in
    *--get-active-zones*) printf 'internal\\n  interfaces: eth0\\nadmin\\n  sources: 198.51.100.0/24\\n' ;;
    *--get-default-zone*) echo public ;;
  esac
}
firewall_open_web
firewall_status
`)
    assert.equal(result.status, 0, result.stderr)
    const commands = fs
      .readFileSync(`${dir}/firewall`, 'utf8')
      .trim()
      .split('\n')
    assert.ok(
      commands.every(
        (line) =>
          !/--reload|--remove-|--set-default|--runtime-to-permanent/.test(line)
      )
    )
    for (const zone of ['internal', 'admin', 'public']) {
      for (const port of ['22/tcp', '80/tcp', '443/tcp', '443/udp']) {
        const writes = commands.filter(
          (line) =>
            line.includes(`--zone=${zone}`) &&
            line.includes(`--add-port=${port}`)
        )
        assert.ok(
          writes.some((line) => line.includes('--permanent')),
          `${zone} ${port} permanent missing`
        )
        assert.ok(
          writes.some((line) => !line.includes('--permanent')),
          `${zone} ${port} runtime missing`
        )
      }
    }
    const serviceCalls = fs.existsSync(`${dir}/systemctl`)
      ? fs.readFileSync(`${dir}/systemctl`, 'utf8')
      : ''
    assert.doesNotMatch(serviceCalls, /enable|restart|start/)
  }))

test('UFW keeps current policies and is never enabled automatically', () =>
  sandbox(({ dir, shell }) => {
    const result = shell(`
FAMILY=debian
FIREWALL_BACKEND=ufw
ufw() { printf '%s\\n' "$*" >> '${dir}/ufw'; }
firewall_open_web
firewall_status
`)
    assert.equal(result.status, 0, result.stderr)
    const commands = fs.readFileSync(`${dir}/ufw`, 'utf8')
    assert.match(commands, /allow 22\/tcp/)
    assert.doesNotMatch(commands, /default |enable|delete |reset/)
  }))

test('an inactive firewall is left inactive', () =>
  sandbox(({ dir, shell }) => {
    const result = shell(`
FAMILY=debian
FIREWALL_BACKEND=none
ufw() { printf '%s\\n' "$*" >> '${dir}/ufw'; }
firewall_open_web
firewall_status
`)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(fs.existsSync(`${dir}/ufw`), false)
    assert.equal(fs.existsSync(`${dir}/systemctl`), false)
  }))

test('active firewalld is detected on Debian instead of installing or selecting UFW', () =>
  sandbox(({ shell }) => {
    const result = shell(`
FAMILY=debian
ufw() { echo 'Status: inactive'; }
firewall-cmd() { [[ $1 == --state ]]; }
detect_firewall
echo "$FIREWALL_BACKEND"
`)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), 'firewalld')
  }))

test('two active firewall managers stop setup before mutation', () =>
  sandbox(({ dir, shell }) => {
    const result = shell(`
ufw() { echo 'Status: active'; }
firewall-cmd() { [[ $1 == --state ]]; }
detect_firewall
`)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Both UFW and firewalld are active/)
    assert.equal(fs.existsSync(`${dir}/systemctl`), false)
  }))

test('unknown SSH ports do not silently become port 22', () =>
  sandbox(({ shell }) => {
    const result = shell(`
SSH_CONNECTION=''
sshd() { return 1; }
ss() { return 1; }
systemctl() { return 1; }
safe_ssh_ports
`)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), '')
  }))

test('a requested port change refuses socket activation before writing SSH files', () =>
  sandbox(({ dir, shell }) => {
    const main = fs.readFileSync(`${dir}/etc/ssh/sshd_config`, 'utf8')
    const result = shell('SSH_PORT=2222\nharden_ssh')
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /socket-activated/)
    assert.equal(fs.readFileSync(`${dir}/etc/ssh/sshd_config`, 'utf8'), main)
    assert.equal(
      fs.existsSync(`${dir}/etc/ssh/sshd_config.d/00-vps-hardening.conf`),
      false
    )
    assert.doesNotMatch(
      fs.readFileSync(`${dir}/systemctl`, 'utf8'),
      /restart|reload/
    )
  }))

test('invalid fail2ban config restores the previous jail before returning failure', () =>
  sandbox(({ dir, shell }) => {
    const jail = `${dir}/etc/fail2ban/jail.d/zz-vps.conf`
    const filter = `${dir}/etc/fail2ban/filter.d/nginx-probe.conf`
    fs.writeFileSync(jail, '# previous working jail\n')
    fs.writeFileSync(filter, '# previous working filter\n')
    const result = shell(`
fail2ban-client() { [[ $1 != -t ]]; }
setup_fail2ban
`)
    assert.notEqual(result.status, 0)
    assert.equal(fs.readFileSync(jail, 'utf8'), '# previous working jail\n')
    assert.equal(fs.readFileSync(filter, 'utf8'), '# previous working filter\n')
    const calls = fs.existsSync(`${dir}/systemctl`)
      ? fs.readFileSync(`${dir}/systemctl`, 'utf8')
      : ''
    assert.doesNotMatch(calls, /restart|enable/)
  }))
