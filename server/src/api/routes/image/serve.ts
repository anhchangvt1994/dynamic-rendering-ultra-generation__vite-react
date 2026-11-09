import fs from 'fs'
import path from 'path'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { Worker } from 'worker_threads'
import { workerJob } from './job'
import { PIPELINE_VERSION } from './pipeline'
import { pickSource } from './sources'
import { removeFile, stagedFile, writeAtomic } from './staged'

/**
 * GET /api/image/<key>.webp (express, fastify and uWebSockets adapters
 * beside this file): a small pixel-art animation, upscaled into a
 * crisp animated WebP the first time somebody asks for it, then served from
 * disk. The source is ANIMATED_SOURCE_URL with "{key}" replaced. 404 when the
 * source has no such animation (the client falls back to the original).
 *
 * Memory stays flat: a few jobs at a time (ANIMATED_MAX_JOBS), a bounded
 * queue (excess answers 503), one job per key however many ask at once.
 */

export const SOURCE = String(PROCESS_ENV.ANIMATED_SOURCE_URL || '').trim()
const SOURCE_CHAIN = [
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/lets-go-pikachu-lets-go-eevee/{key}.gif',
  'https://s3.pokeos.com/pokeos-uploads/assets/pokemon/home/animated/{key}.gif?v=3',
]
/** Bump when the source selection changes: invalidates animation and rig caches. */
export const SOURCE_VERSION = 3
export const SIZE = Number(PROCESS_ENV.ANIMATED_SIZE) || 800
const QUALITY = Number(PROCESS_ENV.ANIMATED_QUALITY) || 95
export const JOB_TIMEOUT_MS =
  Number(PROCESS_ENV.ANIMATED_JOB_TIMEOUT_MS) || 600000
const MAX_JOBS = Number(PROCESS_ENV.ANIMATED_MAX_JOBS) || 1
const MAX_QUEUE = Number(PROCESS_ENV.ANIMATED_MAX_QUEUE) || 24
const FETCH_TIMEOUT_MS = Number(PROCESS_ENV.ANIMATED_FETCH_TIMEOUT_MS) || 8000
const ESRGAN_DIR = String(PROCESS_ENV.ANIMATED_ESRGAN_DIR || '').trim()
const ESRGAN_MODEL = String(PROCESS_ENV.ANIMATED_ESRGAN_MODEL || '').trim()
const RIFE_DIR = String(PROCESS_ENV.ANIMATED_RIFE_DIR || '').trim()
const FPS_FACTOR = Number(PROCESS_ENV.ANIMATED_FPS_FACTOR) || 4
const STILL = String(PROCESS_ENV.ANIMATED_STILL_URL || '').trim()
export const KEY = /^[a-z0-9-]{1,40}$/

export const cacheDir = (() => {
  const root =
    ServerConfig.rootCache && fs.existsSync(ServerConfig.rootCache)
      ? ServerConfig.rootCache
      : '/tmp'
  const dir = path.join(root, 'animated')
  fs.mkdirSync(dir, { recursive: true })
  return dir
})()

/** "/api/image/25.webp" → "25"; null if malformed */
export const readKey = (url: string) => {
  const key = url.match(/^\/api\/image\/([a-z0-9-]+)\.webp$/)?.[1]
  return key && KEY.test(key) ? key : null
}

export class Busy extends Error {}
export class Missing extends Error {}

let running = 0
const waiting: (() => void)[] = []
export const withSlot = async <T>(work: () => Promise<T>) => {
  if (running >= MAX_JOBS) {
    if (waiting.length >= MAX_QUEUE) throw new Busy()
    await new Promise<void>((resolve) => waiting.push(resolve))
  }
  running++
  try {
    return await work()
  } finally {
    running--
    waiting.shift()?.()
  }
}

const fetchFrom = async (template: string, key: string) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(template.replace('{key}', key), {
      signal: controller.signal,
    })
    if (res.status === 404 || res.status === 410) return null
    if (!res.ok) throw new Error(`source answered ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

// The configured source is tried only after both preferred catalogs 404; the
// pipeline's sharpening is reserved for it (`sharpen`).
export const fetchSource = (key: string) =>
  pickSource(key, SOURCE_CHAIN, SOURCE, fetchFrom, Missing)

// The build runs in its own worker thread: the main thread keeps answering
// requests whatever the upscale (pixel loops, ESRGAN) is doing.
const buildInWorker = (source: Buffer, sharpen: boolean) =>
  new Promise<Buffer>((resolve, reject) => {
    const worker = new Worker(
      path.join(__dirname, `worker${path.extname(__filename)}`),
      {
        workerData: {
          source,
          options: {
            size: SIZE,
            quality: QUALITY,
            esrganDir: ESRGAN_DIR || undefined,
            esrganModel: ESRGAN_MODEL || undefined,
            rifeDir: RIFE_DIR || undefined,
            fpsFactor: FPS_FACTOR,
            sharpen,
            // each of the (up to two) passes dies before the worker is cut off
            esrganTimeoutMs: Math.floor(JOB_TIMEOUT_MS / 2) - 5000,
          },
        },
        execArgv: process.execArgv.filter(
          (arg) => !/^--max[-_]old[-_]space[-_]size/.test(arg)
        ),
        resourceLimits: { maxOldGenerationSizeMb: 512 },
      }
    )
    workerJob(worker, JOB_TIMEOUT_MS, 'animation build').then(
      (message) => resolve(Buffer.from(message.webp)),
      reject
    )
  })

const inflight = new Map<string, Promise<Buffer>>()
/** true while the animation for `key` is being built or waits for a slot */
export const isBuilding = (key: string) => inflight.has(key)
const failed = new Map<string, number>() // key → when it failed: rest a minute
const missing = new Set<string>() // known 404s: do not ask the source again
// Never make a request wait for a build: start it, answer "not yet" (202) and
// let the client ask again; a finished one is served from disk.
export const animationFor = (key: string): Buffer | null => {
  const file = path.join(
    cacheDir,
    `${PIPELINE_VERSION}-${SOURCE_VERSION}-${SIZE}-${key}.webp`
  )
  const gif = stagedFile(file)
  if (fs.existsSync(file)) {
    void removeFile(gif).catch(() => undefined)
    return fs.readFileSync(file)
  }
  if (missing.has(key)) throw new Missing()
  if (Date.now() - (failed.get(key) ?? 0) < 60000)
    throw new Error('failed lately')
  if (!inflight.has(key))
    inflight.set(
      key,
      withSlot(async () => {
        const { image, sharpen } = await fetchSource(key)
        const gif = stagedFile(file)
        await writeAtomic(gif, image)
        const webp = await buildInWorker(image, sharpen)
        await writeAtomic(file, webp) // publish only complete WebP
        await removeFile(gif)
        return webp
      })
        .catch((err) => {
          if (err instanceof Missing) {
            if (missing.size > 5000) missing.clear()
            missing.add(key)
          } else if (!(err instanceof Busy)) {
            failed.set(key, Date.now())
            Console.error('Animation failed:', err)
          }
          throw err
        })
        .finally(() => inflight.delete(key))
    )
  inflight.get(key)?.catch(() => undefined) // nobody awaits it: no unhandled rejection
  return null
}

export const CACHED = 'public, max-age=86400, stale-while-revalidate=604800'

// the still stands in until the animation is on disk: a few kept in memory,
// so a page of waiting Pokémon does not hit the source for each view
const stills = new Map<string, { body: Buffer; type: string }>()
export const stillFor = async (key: string) => {
  const hit = stills.get(key)
  if (hit) return hit
  if (!STILL) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(STILL.replace('{key}', key), {
      signal: controller.signal,
    })
    if (!res.ok) return null
    const still = {
      body: Buffer.from(await res.arrayBuffer()),
      type: res.headers.get('content-type') || 'image/png',
    }
    if (stills.size >= 64) stills.delete(stills.keys().next().value as string)
    stills.set(key, still)
    return still
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Everything a route needs, framework-free. The animation when it is built
 * (cached hard); until then the still, never cached, and the build starts.
 */
export const serveImage = async (url: string) => {
  const reply = (
    status: number,
    type: string,
    body: Buffer,
    kind: 'animated' | 'gif' | 'still' | '' = ''
  ) => ({
    status,
    type,
    body,
    kind,
    cache: kind === 'animated' ? CACHED : 'no-cache',
  })
  const none = () => reply(404, 'text/plain', Buffer.from('Not found'))
  const key = readKey(url)
  if (!key) return none()
  let webp: Buffer | null = null
  try {
    webp = animationFor(key)
  } catch {
    // no animation for it, or it failed lately: the still is all there is
  }
  if (webp) return reply(200, 'image/webp', webp, 'animated')
  const gif = path.join(
    cacheDir,
    `${PIPELINE_VERSION}-${SOURCE_VERSION}-${SIZE}-${key}.gif`
  )
  if (fs.existsSync(gif))
    return reply(200, 'image/gif', fs.readFileSync(gif), 'gif')
  const still = await stillFor(key)
  if (still) return reply(200, still.type, still.body, 'still')
  // not built yet and no still to stand in: "ask again" (202), not "there is
  // none" (404); the client keeps its fallback up meanwhile and retries
  return isBuilding(key)
    ? reply(202, 'text/plain', Buffer.from('Building'))
    : none()
}
