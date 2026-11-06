/**
 * Runs one upscale off the main thread (see serve.ts): the pixel loops and the
 * ESRGAN process then never block requests. One worker per job, ended after
 * it, so every byte it used goes back to the system.
 */
import sharp from 'sharp'
import { parentPort, workerData } from 'worker_threads'
import { upscaleAnimation } from './pipeline'

sharp.cache(false)
sharp.concurrency(1)

upscaleAnimation(Buffer.from(workerData.source), workerData.options)
  .then((webp) => {
    const copy = new Uint8Array(webp) // own buffer, handed over without a copy
    parentPort?.postMessage({ webp: copy }, [copy.buffer])
  })
  .catch((err) =>
    parentPort?.postMessage({ error: String(err?.message || err) })
  )
