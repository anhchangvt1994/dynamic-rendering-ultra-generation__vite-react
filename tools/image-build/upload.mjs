// yarn upload:pokemon-art — asks for the target, then rsyncs pokemon-art/ to it.
// Answers are remembered in .cache/upload-pokemon-art.json (Enter keeps them).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'

const memory = path.resolve('.cache/upload-pokemon-art.json')
let saved = {}
try {
  saved = JSON.parse(fs.readFileSync(memory, 'utf8'))
} catch {}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
const ask = async (label, key, fallback = '') => {
  const def = saved[key] ?? fallback
  const answer = (await rl.question(`${label}${def ? ` [${def}]` : ''}: `)).trim()
  return answer || def
}

const local = await ask('Local folder', 'local', 'pokemon-art')
const target = await ask('Server (user@host)', 'target')
const remote = await ask('Remote folder (inbox beside the checkout)', 'remote')
const port = await ask('SSH port', 'port', '22')
const dry = /^y/i.test(await ask('Dry run (y/n)', 'dry', 'n'))
rl.close()

if (!target || !remote) {
  console.error('Server and remote folder are required')
  process.exit(1)
}
if (!fs.existsSync(local)) {
  console.error(`${local} not found`)
  process.exit(1)
}
fs.mkdirSync(path.dirname(memory), { recursive: true })
fs.writeFileSync(
  memory,
  JSON.stringify({ local, target, remote, port, dry: 'n' }, null, 2)
)

const ssh = (remoteCommand) =>
  spawnSync('ssh', ['-p', port, target, remoteCommand], {
    stdio: 'inherit',
  })

const quoteShell = (value) => `'${value.replaceAll("'", "'\\''")}'`
if (!dry) {
  const mkdir = ssh(`mkdir -p -- ${quoteShell(remote)}`)
  if (mkdir.status !== 0) process.exit(mkdir.status ?? 1)
}

const args = [
  '-a',
  '--stats',
  '--exclude',
  'build.json',
  '--exclude',
  '.stage',
  '-e',
  `ssh -p ${port}`,
  ...(dry ? ['-n', '-v'] : []),
  `${local.replace(/\/+$/, '')}/`,
  `${target}:${remote.replace(/\/+$/, '')}/`,
]
console.log(`rsync ${args.join(' ')}`)
process.exit(spawnSync('rsync', args, { stdio: 'inherit' }).status ?? 1)
