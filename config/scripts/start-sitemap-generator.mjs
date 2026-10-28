import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
let register
try {
  register = require.resolve('sucrase/register')
} catch {
  console.error(
    'Sucrase is missing. Run yarn install --production=false in the project root.'
  )
  process.exit(1)
}
// Sitemap code is read directly by Sucrase; recompiling all SSR sources here
// does not contribute to generation. Forward CLI arguments without a shell.
const child = spawn(
  process.execPath,
  ['-r', register, 'server/sitemap/index.ts', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: { ...process.env, ENV: 'production' },
  }
)
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0)
})
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal))
