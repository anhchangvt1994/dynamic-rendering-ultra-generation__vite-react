import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import vm from 'node:vm'
import { transform } from 'sucrase'
import PM2API from 'pm2/lib/API.js'

const root = path.resolve(import.meta.dirname, '../..')

test('SSH hardening preserves password/root login and existing SSH ports', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vps-ssh-test-'))
  try {
    fs.mkdirSync(`${dir}/etc/ssh/sshd_config.d`, { recursive: true })
    fs.writeFileSync(
      `${dir}/etc/ssh/sshd_config`,
      `Include ${dir}/etc/ssh/sshd_config.d/*.conf\nPort 2200\nPermitRootLogin yes\nPasswordAuthentication yes\n`
    )
    const source = fs
      .readFileSync(`${root}/scripts/vps-setup/setup.sh`, 'utf8')
      .replace(/^main "\$@"$/m, '')
      .replaceAll('/etc/ssh', `${dir}/etc/ssh`)
      .replaceAll('/run/sshd', `${dir}/run/sshd`)
    const script = `${source}
log() { :; }; ok() { :; }; warn() { :; }
sed() { if [[ $1 == -i && $(uname -s) == Darwin ]]; then shift; command sed -i '' "$@"; else command sed "$@"; fi; }
has_usable_key() { return 0; }
selinux_on() { return 1; }
systemctl() { [[ $1 != is-active ]]; }
sshd() { if [[ $1 == -T ]]; then printf 'port 2200\\npermitrootlogin yes\\npasswordauthentication yes\\n'; fi; }
ufw() { printf '%s\\n' "$*" >> '${dir}/firewall'; }
SUDO_USER=root
NEW_USER=deploy
SSH_PORT=2222
SSH_CONNECTION='198.51.100.10 50000 203.0.113.10 2200'
ORIGINAL_SSH_PORTS='22 2200'
FAMILY=debian
FIREWALL_BACKEND=ufw
harden_ssh
firewall_open_web
`
    const result = spawnSync('bash', ['-c', script], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    const config = fs.readFileSync(
      `${dir}/etc/ssh/sshd_config.d/00-vps-hardening.conf`,
      'utf8'
    )
    assert.doesNotMatch(
      config,
      /^(PermitRootLogin|PasswordAuthentication|KbdInteractiveAuthentication) /m
    )
    for (const port of ['22', '2200', '2222'])
      assert.match(config, new RegExp(`^Port ${port}$`, 'm'))
    const firewall = fs.readFileSync(`${dir}/firewall`, 'utf8')
    assert.doesNotMatch(firewall, /delete /)
    for (const port of ['22', '2200', '2222'])
      assert.match(firewall, new RegExp(`allow ${port}/tcp`))
    // A rerun must not silently weaken a policy the administrator already uses.
    fs.writeFileSync(
      `${dir}/etc/ssh/sshd_config.d/00-vps-hardening.conf`,
      'PermitRootLogin no\nPasswordAuthentication no\nKbdInteractiveAuthentication no\n'
    )
    const rerun = spawnSync('bash', ['-c', script], { encoding: 'utf8' })
    assert.equal(rerun.status, 0, rerun.stderr)
    const existing = fs.readFileSync(
      `${dir}/etc/ssh/sshd_config.d/00-vps-hardening.conf`,
      'utf8'
    )
    assert.match(existing, /^PermitRootLogin no$/m)
    assert.match(existing, /^PasswordAuthentication no$/m)
    assert.match(existing, /^KbdInteractiveAuthentication no$/m)
    const mainBefore = fs.readFileSync(`${dir}/etc/ssh/sshd_config`, 'utf8')
    for (const failure of [
      'sshd() { [[ $1 != -t ]]; }',
      'systemctl() { return 1; }',
    ]) {
      const rejected = spawnSync(
        'bash',
        [
          '-c',
          script.replace(
            'harden_ssh\nfirewall_open_web',
            `${failure}\nharden_ssh\nfirewall_open_web`
          ),
        ],
        { encoding: 'utf8' }
      )
      assert.notEqual(
        rejected.status,
        0,
        'Invalid SSH configuration/service must stop setup'
      )
      assert.equal(
        fs.readFileSync(`${dir}/etc/ssh/sshd_config`, 'utf8'),
        mainBefore
      )
      assert.equal(
        fs.readFileSync(
          `${dir}/etc/ssh/sshd_config.d/00-vps-hardening.conf`,
          'utf8'
        ),
        existing
      )
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

for (const existing of [0, 1, 2])
  test(`PM2 starts or reconciles ${existing} existing TypeScript workers with Node and Sucrase`, async () => {
    let options
    let scales = 0
    const receiver = {
      _startJson: (config, opts, action, callback) => {
        options = config.apps[0]
        callback?.(null)
      },
      _operate: (action, id, callback) => callback?.(null),
      Client: {
        getProcessByName: (name, callback) =>
          callback(
            null,
            Array.from({ length: existing }, (_, id) => ({
              pm2_env: { pm_id: id },
            }))
          ),
      },
    }
    const pm2 = {
      connect: (_, callback) => callback(null),
      list: (callback) =>
        callback(null, [
          ...Array.from({ length: existing }, (_, id) => ({
            name: 'worker-app',
            pm_id: id,
          })),
          { name: 'unrelated-app', pm_id: 99 },
        ]),
      start: (value) => {
        options = value
      },
      restart: (id, value, callback) => {
        PM2API.prototype.restart.call(receiver, id, value, callback)
      },
      scale: (name, instances, callback) => {
        scales++
        PM2API.prototype.scale.call(receiver, name, instances, callback)
      },
    }
    const source = fs.readFileSync(
      `${root}/server/src/puppeteer-ssr/pm2.uws.worker.ts`,
      'utf8'
    )
    vm.runInNewContext(
      transform(source, { transforms: ['typescript', 'imports'] }).code,
      {
        require: (name) => {
          if (name === 'pm2') return pm2
          if (name === '../constants')
            return { resourceDirectory: 'src', resourceExtension: 'ts' }
          if (name === '../utils/InitEnv') return { PROCESS_ENV: {} }
          if (name === '../utils/ResourceBudget')
            return {
              getResourceBudget: () => ({
                instances: 1,
                requestWorkers: 1,
                nodeHeapMB: 512,
                processMemoryMB: 1024,
              }),
            }
          if (name === './constants') return { PM2_PROCESS_NAME: 'worker-app' }
          return {}
        },
        exports: {},
        process,
        console,
      }
    )
    await new Promise((resolve) => setImmediate(resolve))
    assert.ok(options, 'PM2 start was not called')
    assert.equal(options.interpreter, process.execPath)
    assert.equal(options.env.APP_INSTANCES, '1')
    assert.equal(scales, existing > 1 ? 1 : 0)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vps-worker-test-'))
    try {
      const fixture = path.join(dir, 'worker.ts')
      fs.writeFileSync(
        fixture,
        'const value: string = "worker-ready"; console.log(value)'
      )
      const args =
        `${options.node_args || ''} ${options.interpreter_args || ''}`
          .trim()
          .split(/\s+/)
      const result = spawnSync(options.interpreter, [...args, fixture], {
        cwd: root,
        encoding: 'utf8',
      })
      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stdout, /worker-ready/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

test('plain yarn installs build tools even under NODE_ENV=production', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vps-yarn-test-'))
  try {
    fs.mkdirSync(`${dir}/.yarn/releases`, { recursive: true })
    fs.copyFileSync(
      `${root}/.yarn/releases/yarn-1.22.22.cjs`,
      `${dir}/.yarn/releases/yarn-1.22.22.cjs`
    )
    if (fs.existsSync(`${root}/.yarnrc`))
      fs.copyFileSync(`${root}/.yarnrc`, `${dir}/.yarnrc`)
    fs.mkdirSync(`${dir}/fixtures/build-probe`, { recursive: true })
    fs.writeFileSync(
      `${dir}/fixtures/build-probe/package.json`,
      JSON.stringify({ name: 'build-probe', version: '1.0.0' })
    )
    fs.writeFileSync(
      `${dir}/package.json`,
      JSON.stringify({
        private: true,
        devDependencies: { 'build-probe': 'file:./fixtures/build-probe' },
      })
    )
    const result = spawnSync(
      process.execPath,
      ['.yarn/releases/yarn-1.22.22.cjs', '--offline', '--non-interactive'],
      {
        cwd: dir,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          YARN_CACHE_FOLDER: `${dir}/cache`,
        },
        encoding: 'utf8',
      }
    )
    assert.equal(result.status, 0, result.stderr)
    assert.ok(
      fs.existsSync(`${dir}/node_modules/build-probe/package.json`),
      'Yarn skipped the build dependency in production'
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a fresh frozen install links local workspaces instead of copying their dependency trees', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vps-workspaces-test-'))
  try {
    const manifest = JSON.parse(fs.readFileSync(`${root}/package.json`, 'utf8'))
    fs.writeFileSync(
      `${dir}/package.json`,
      JSON.stringify({
        private: true,
        workspaces: manifest.workspaces,
        devDependencies: manifest.devDependencies,
      })
    )
    fs.writeFileSync(`${dir}/yarn.lock`, '# yarn lockfile v1\n')
    for (const [name, subdirectory] of [
      ['server', 'server'],
      ['build-tool-packages', 'config/build-tool-packages'],
      ['commit-packages', 'config/commit-packages'],
      ['lint-and-format-packages', 'config/lint-and-format-packages'],
    ]) {
      fs.mkdirSync(`${dir}/${subdirectory}`, { recursive: true })
      fs.writeFileSync(
        `${dir}/${subdirectory}/package.json`,
        JSON.stringify({ name, version: '1.0.0' })
      )
    }
    const result = spawnSync(
      process.execPath,
      [
        `${root}/.yarn/releases/yarn-1.22.22.cjs`,
        'install',
        '--offline',
        '--frozen-lockfile',
        '--ignore-scripts',
      ],
      {
        cwd: dir,
        env: { ...process.env, YARN_CACHE_FOLDER: `${dir}/cache` },
        encoding: 'utf8',
      }
    )
    assert.equal(result.status, 0, result.stderr)
    for (const name of Object.keys(manifest.devDependencies))
      assert.ok(
        fs.lstatSync(`${dir}/node_modules/${name}`).isSymbolicLink(),
        `${name} must be a workspace link`
      )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('server build works without a Sucrase executable on PATH', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vps-build-test-'))
  try {
    fs.mkdirSync(`${dir}/server/src`, { recursive: true })
    fs.copyFileSync(
      `${root}/server/server-build.js`,
      `${dir}/server/server-build.js`
    )
    fs.symlinkSync(`${root}/node_modules`, `${dir}/node_modules`)
    fs.writeFileSync(
      `${dir}/server/src/example.ts`,
      'export const value: number = 42'
    )
    const result = spawnSync(process.execPath, ['server/server-build.js'], {
      cwd: dir,
      env: { ...process.env, PATH: '/nonexistent' },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(
      fs.readFileSync(`${dir}/server/dist/example.js`, 'utf8'),
      /exports.value/
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
