/**
 * Builds one rig off the main thread (see serve.ts): the flow and the pixel
 * loops never block requests. One worker per job, ended after it.
 */
import sharp from 'sharp'
import { parentPort, workerData } from 'worker_threads'
import { buildRig } from './build'

sharp.cache(false)
sharp.concurrency(1)

const buffer = (b: Uint8Array | null) => (b ? Buffer.from(b) : null)

buildRig(
  buffer(workerData.source),
  buffer(workerData.webp),
  buffer(workerData.still),
  workerData.key
)
  .then(({ json, sheet, flow }) => {
    const s = new Uint8Array(sheet)
    const f = new Uint8Array(flow)
    parentPort?.postMessage({ json, sheet: s, flow: f }, [s.buffer, f.buffer])
  })
  .catch((err) =>
    parentPort?.postMessage({ error: String(err?.message || err) })
  )
