import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { workerJob } = require('./job.ts')

const fakeWorker = () => {
  const w = new EventEmitter()
  w.terminated = 0
  w.terminate = () => {
    w.terminated++
    return Promise.resolve(0)
  }
  return w
}

test('a job that runs out of time ends its worker', async () => {
  const w = fakeWorker()
  await assert.rejects(workerJob(w, 20, 'rig'), /rig timed out/)
  assert.equal(w.terminated, 1)
})

test('a job settles on its message and ends its worker', async () => {
  const w = fakeWorker()
  const job = workerJob(w, 1000, 'rig')
  w.emit('message', { ok: 1 })
  assert.deepEqual(await job, { ok: 1 })
  assert.equal(w.terminated, 1)
})

test('an error message, an error or an exit rejects', async () => {
  for (const [event, arg, pattern] of [
    ['message', { error: 'bad sheet' }, /bad sheet/],
    ['error', new Error('boom'), /boom/],
    ['exit', 3, /rig worker exited 3/],
  ]) {
    const w = fakeWorker()
    const job = workerJob(w, 1000, 'rig')
    w.emit(event, arg)
    await assert.rejects(job, pattern)
    assert.ok(w.terminated >= 1)
  }
})
