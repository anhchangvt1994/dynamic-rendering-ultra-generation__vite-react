import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { transform } from 'sucrase'

const project = fileURLToPath(new URL('../../', import.meta.url))
const write = (root, file, content) => {
  const target = path.join(root, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
}

for (const browserEnabled of [true, false])
  test(
    `the real uWS entry serves routes on ready (browser enabled: ${browserEnabled})`,
    { timeout: 15000 },
    async (t) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uws-readiness-'))
      t.after(() => fs.rmSync(root, { recursive: true, force: true }))
      write(root, 'package.json', '{"type":"commonjs"}')
      fs.symlinkSync(
        path.join(project, 'node_modules'),
        path.join(root, 'node_modules'),
        'dir'
      )
      const source = fs.readFileSync(
        path.join(project, 'server/src/index.uws.worker.ts'),
        'utf8'
      )
      write(
        root,
        'server/dist/index.uws.worker.js',
        transform(source, { transforms: ['typescript', 'imports'] }).code
      )
      // Keep the production entry, native sockets and worker threads real. Replace
      // crawler/Redis/browser services so this test uses no external infrastructure.
      write(
        root,
        'server/dist/puppeteer-ssr/utils/BrowserManager.js',
        `exports.__esModule = true; exports.default = () => ${browserEnabled ? '({ get: async () => undefined })' : 'undefined'}`
      )
      write(
        root,
        'server/dist/server.config.js',
        'exports.__esModule = true; exports.default = {isRemoteCrawler: true}'
      )
      write(
        root,
        'server/dist/utils/ConsoleHandler.js',
        'exports.__esModule = true; exports.default = console'
      )
      write(
        root,
        'server/dist/utils/InitEnv.js',
        'exports.ENV_MODE = "production"; exports.PROCESS_ENV = { PORT: process.env.PORT }'
      )
      write(
        root,
        'server/dist/utils/PortHandler.js',
        'exports.findFreePort = async () => 0; exports.getPort = () => 0; exports.setPort = () => {}'
      )
      write(
        root,
        'server/dist/utils/ResourceBudget.js',
        'exports.getResourceBudget = () => ({ requestWorkers: 2, workerHeapMB: 64 })'
      )
      write(root, 'server/dist/utils/CleanerService.js', 'module.exports = {}')
      write(
        root,
        'server/dist/api/index.uws.js',
        'exports.default = Promise.resolve({init() {}})'
      )
      write(
        root,
        'server/dist/sitemap/index.uws.js',
        'exports.default = Promise.resolve({init() {}})'
      )
      write(
        root,
        'server/dist/puppeteer-ssr/index.uws.js',
        `
    const {workerData} = require('node:worker_threads');
    exports.default = new Promise(resolve => setTimeout(() => resolve({
      init(app) { app.get('/*', res => res.end('application ready')); require('node:fs').writeFileSync('route-' + workerData.order + '.ready', ''); }
    }), workerData.order === 1 ? 150 : 500));
  `
      )
      const probe = net.createServer()
      probe.listen(0, '127.0.0.1')
      await once(probe, 'listening')
      const port = probe.address().port
      await new Promise((resolve) => probe.close(resolve))
      const child = fork(
        path.join(root, 'server/dist/index.uws.worker.js'),
        [],
        {
          cwd: root,
          env: { ...process.env, PORT: String(port) },
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        }
      )
      let logs = ''
      child.stdout.on('data', (chunk) => {
        logs += chunk
      })
      child.stderr.on('data', (chunk) => {
        logs += chunk
      })
      t.after(async () => {
        if (child.exitCode === null) {
          const exited = once(child, 'exit')
          child.kill('SIGKILL')
          await exited
        }
      })
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('HTTP workers never became ready: ' + logs)),
          3000
        )
        child.on('message', (message) => {
          if (message === 'ready') {
            clearTimeout(timeout)
            resolve()
          }
        })
        child.once('error', reject)
        child.once('exit', (code) =>
          reject(new Error(`Server exited ${code}: ${logs}`))
        )
      })
      assert.ok(fs.existsSync(path.join(root, 'route-1.ready')))
      assert.ok(
        fs.existsSync(path.join(root, 'route-2.ready')),
        'ready must wait for every configured HTTP worker'
      )
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(3000),
      }).catch((error) => {
        throw new Error(
          `HTTP failed: ${error.cause?.message || error.message}; server logs: ${logs}`
        )
      })
      const body = await response.text()
      assert.equal(
        response.status,
        200,
        `ready must imply working routes, received: ${body}`
      )
      assert.equal(body, 'application ready')
    }
  )
