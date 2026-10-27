import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'
import puppeteer from 'puppeteer-core'
import workerpool from 'workerpool'

const require = createRequire(import.meta.url)
require('sucrase/register')
const {
  closeRenderTarget,
} = require('../../server/src/puppeteer-ssr/utils/RenderCleanup.ts')
const { createRenderGate } = require('../../server/src/utils/RenderGate.ts')

for (const initializationStalls of [false, true])
  test(`a cancelled render closes its Chromium target (initialization stalled: ${initializationStalls})`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-cleanup-'))
    let browser, pool
    try {
      browser = await puppeteer.launch({
        executablePath:
          process.env.CHROME_EXECUTABLE ||
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true,
        userDataDir: path.join(dir, 'profile'),
        args: ['--no-sandbox', '--disable-gpu'],
      })
      const before = (await browser.pages()).length
      const fixture = path.join(dir, 'worker.cjs')
      fs.writeFileSync(
        fixture,
        `
      require(${JSON.stringify(require.resolve('sucrase/register'))});
      const workerpool = require(${JSON.stringify(require.resolve('workerpool'))});
      const { createRenderPage } = require(${JSON.stringify(path.resolve(import.meta.dirname, '../../server/src/puppeteer-ssr/utils/CreateRenderPage.ts'))});
      const puppeteer = require(${JSON.stringify(require.resolve('puppeteer-core'))});
      workerpool.worker({ render: async endpoint => {
        const browser = await puppeteer.connect({browserWSEndpoint: endpoint});
        if (${initializationStalls}) browser.waitForTarget = () => new Promise(() => {});
        await createRenderPage(browser, 'chromium');
        await new Promise(() => {});
      }});
    `
      )
      pool = workerpool.pool(fixture, {
        minWorkers: 0,
        maxWorkers: 1,
        workerTerminateTimeout: 100,
      })
      const gate = createRenderGate({
        limit: 1,
        queueLimit: 1,
        waitTimeoutMs: 500,
      })
      await gate.run(async () => {
        let targetId, onPage
        const pageReady = new Promise((resolve) => {
          onPage = resolve
        })
        const task = pool.exec('render', [browser.wsEndpoint()], {
          on: (payload) => {
            targetId = payload.value
            onPage()
          },
        })
        await pageReady
        assert.ok(targetId)
        task.timeout(50)
        await assert.rejects(Promise.resolve(task), /timed out/i)
        await closeRenderTarget(browser, targetId)
        assert.equal((await browser.pages()).length, before)
      })
      assert.equal(await gate.run(async () => 'next-render'), 'next-render')
    } finally {
      await pool?.terminate(true)
      await browser?.close()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
