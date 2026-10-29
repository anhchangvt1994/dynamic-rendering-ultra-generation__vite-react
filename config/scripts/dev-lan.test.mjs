import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer as createHttpServer } from 'node:http'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer, loadConfigFromFile } from 'vite'

const root = fileURLToPath(new URL('../../', import.meta.url))

test(
  'LAN dev serves JSON API requests and keeps Vite modules out of the backend',
  { timeout: 30000 },
  async (t) => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-lan-cache-'))
    const received = []
    const backend = createHttpServer((req, res) => {
      received.push(req.url)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ backend: true, path: req.url }))
    })
    backend.listen(0, '127.0.0.1')
    await once(backend, 'listening')
    let vite
    t.after(async () => {
      backend.closeAllConnections()
      vite?.httpServer?.closeAllConnections()
      await Promise.all([
        vite?.close(),
        new Promise((resolve) => backend.close(resolve)),
      ])
      fs.rmSync(temporary, { recursive: true, force: true })
    })
    const loaded = await loadConfigFromFile(
      { command: 'serve', mode: 'development' },
      path.join(root, 'vite.config.mts')
    )
    // Keep the shipped routing/bypass logic; substitute only the API transport.
    for (const proxy of Object.values(loaded.config.server.proxy))
      proxy.target = `http://127.0.0.1:${backend.address().port}`
    vite = await createServer({
      ...loaded.config,
      configFile: false,
      cacheDir: temporary,
      logLevel: 'silent',
      root,
      server: {
        ...loaded.config.server,
        host: '0.0.0.0',
        port: 0,
        strictPort: false,
        hmr: false,
        preTransformRequests: false,
        warmup: { clientFiles: [] },
      },
    })
    await vite.listen()
    const address =
      Object.values(os.networkInterfaces())
        .flat()
        .find(
          (item) =>
            item.family === 'IPv4' &&
            !item.internal &&
            item.address.startsWith('192.168.')
        )?.address || '127.0.0.1'
    const origin = `http://${address}:${vite.httpServer.address().port}`
    const response = await fetch(`${origin}/api?fixture=1`, {
      headers: { Accept: '*/*' },
      signal: AbortSignal.timeout(5000),
    })
    assert.match(response.headers.get('content-type'), /application\/json/)
    assert.deepEqual(await response.json(), {
      backend: true,
      path: '/api?fixture=1',
    })
    for (const url of ['/@vite/client', '/src/index.tsx']) {
      const module = await fetch(origin + url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      assert.match(module.headers.get('content-type'), /javascript/)
      assert.ok((await module.text()).length > 0)
      assert.equal(
        received.includes(url),
        false,
        'Source and HMR modules must be handled by Vite even with JSON Accept headers'
      )
    }
    console.log('Verified real LAN URL:', origin)
  }
)
