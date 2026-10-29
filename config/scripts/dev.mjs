import { fork } from 'node:child_process'
import { once } from 'node:events'
import { createRequire } from 'node:module'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const portFlag = process.argv.indexOf('--port')
const webPort = Number(
  portFlag >= 0 ? process.argv[portFlag + 1] : process.env.DEV_PORT || 5173
)
let backend
let vite
let closing = false
let started = false
let backendExitError

async function close() {
  if (closing) return
  closing = true
  const closeBackend = async () => {
    if (backend && backend.exitCode === null && backend.signalCode === null) {
      const exited = once(backend, 'exit')
      backend.kill('SIGINT')
      const timeout = setTimeout(() => backend.kill('SIGKILL'), 3000)
      await exited
      clearTimeout(timeout)
    }
  }
  let deadline
  try {
    await Promise.race([
      Promise.allSettled([vite?.close(), closeBackend()]),
      new Promise((resolve) => {
        deadline = setTimeout(() => {
          vite?.httpServer?.closeAllConnections()
          resolve()
        }, 5000)
      }),
    ])
  } finally {
    clearTimeout(deadline)
  }
}

for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => close().finally(() => process.exit(0)))
process.once('exit', () => {
  if (backend && backend.exitCode === null && backend.signalCode === null)
    backend.kill('SIGKILL')
})

async function freeApiPort() {
  const socket = net.createServer()
  socket.listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const { port } = socket.address()
  await new Promise((resolve) => socket.close(resolve))
  return port
}

try {
  if (!Number.isInteger(webPort) || webPort < 1 || webPort > 65535)
    throw new Error('DEV_PORT/--port must be a port between 1 and 65535')
  const apiPort = process.env.DEV_API_PORT
    ? Number(process.env.DEV_API_PORT)
    : await freeApiPort()
  if (
    !Number.isInteger(apiPort) ||
    apiPort < 1 ||
    apiPort > 65535 ||
    apiPort === webPort
  )
    throw new Error(
      'DEV_API_PORT must be valid and different from the web port'
    )
  process.env.DEV_API_PORT = String(apiPort)
  process.env.DEV_PORT = String(webPort)
  backend = fork(
    fileURLToPath(new URL('../../server/src/index.ts', import.meta.url)),
    [],
    {
      cwd: root,
      execArgv: ['--require', require.resolve('sucrase/register')],
      env: {
        ...process.env,
        ENV: 'development',
        MODE: 'development',
        PORT: String(apiPort),
        DEV_SERVER_MANAGED: '1',
      },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    }
  )
  backend.on('exit', (code, signal) => {
    backendExitError = new Error(`API backend exited (${signal || code})`)
    if (started && !closing) {
      console.error(
        `[dev] API backend exited (${signal || code}); stopping Vite`
      )
      close().finally(() => process.exit(code || 1))
    }
  })
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(new Error('API backend did not become ready within 30 seconds')),
      30000
    )
    const ready = (message) => {
      if (message === 'ready') finish()
    }
    const failed = (error) => finish(error)
    const exited = (code, signal) =>
      finish(new Error(`API backend exited before ready (${signal || code})`))
    const finish = (error) => {
      clearTimeout(timeout)
      backend.off('message', ready)
      backend.off('error', failed)
      backend.off('exit', exited)
      error ? reject(error) : resolve()
    }
    backend.on('message', ready)
    backend.once('error', failed)
    backend.once('exit', exited)
  })
  vite = await createServer({ root, mode: 'development' })
  if (backendExitError) throw backendExitError
  await vite.listen()
  if (backendExitError) throw backendExitError
  started = true
  console.log(
    '\n[dev] Open the website using a Vite URL below (including from another LAN device):'
  )
  vite.printUrls()
} catch (error) {
  console.error(`[dev] ${error.message}`)
  await close()
  process.exit(1)
}
