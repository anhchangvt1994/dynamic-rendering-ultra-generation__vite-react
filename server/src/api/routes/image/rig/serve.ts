/**
 * GET /api/image/rig/<key>/<file> (adapters in ../index*.ts): one species'
 * rig for the room, built once its animation is on disk (or, when the source
 * has none, from the still), then served from disk. Until then rig.json
 * answers 202 and the client asks again.
 */
import fs from 'fs'
import path from 'path'
import { Worker } from 'worker_threads'
import Console from '../../../../utils/ConsoleHandler'
import { PIPELINE_VERSION } from '../pipeline'
import {
  Busy,
  CACHED,
  JOB_TIMEOUT_MS,
  KEY,
  Missing,
  SIZE,
  SOURCE,
  animationFor,
  cacheDir,
  fetchSource,
  stillFor,
  withSlot,
} from '../serve'
import { RIG_VERSION } from './build'

const FILES: Record<string, string> = {
  'rig.json': 'application/json',
  'sheet.webp': 'image/webp',
  'flow.png': 'image/png',
}

/** "/api/image/rig/25/flow.png" → ["25", "flow.png"]; null if malformed */
export const readRigUrl = (url: string) => {
  const m = url.match(/^\/api\/image\/rig\/([^/]+)\/([^/?]+)$/)
  return m && KEY.test(m[1]) && FILES[m[2]] ? { key: m[1], file: m[2] } : null
}

const dirOf = (key: string) =>
  path.join(
    cacheDir,
    'rig',
    `${RIG_VERSION}-${PIPELINE_VERSION}-${SIZE}-${key}`
  )

type Built = { json: unknown; sheet: Buffer; flow: Buffer }

const buildInWorker = (data: {
  source: Buffer | null
  webp: Buffer | null
  still: Buffer | null
  key: string
}) =>
  new Promise<Built>((resolve, reject) => {
    const worker = new Worker(
      path.join(__dirname, `worker${path.extname(__filename)}`),
      {
        workerData: data,
        execArgv: process.execArgv.filter(
          (arg) => !/^--max[-_]old[-_]space[-_]size/.test(arg)
        ),
        resourceLimits: { maxOldGenerationSizeMb: 512 },
      }
    )
    const timer = setTimeout(
      () => reject(new Error('rig build timed out')),
      JOB_TIMEOUT_MS
    )
    const end = () => {
      clearTimeout(timer)
      worker.terminate()
    }
    worker.once('message', (message) => {
      end()
      if (message.error) reject(new Error(message.error))
      else
        resolve({
          json: message.json,
          sheet: Buffer.from(message.sheet),
          flow: Buffer.from(message.flow),
        })
    })
    worker.once('error', (err) => {
      end()
      reject(err)
    })
    worker.once('exit', (code) => {
      end()
      reject(new Error(`rig worker exited ${code}`))
    })
  })

// rig.json goes last: its presence means the other two are there
const store = async (dir: string, built: Built) => {
  await fs.promises.mkdir(dir, { recursive: true })
  const put = async (name: string, body: Buffer | string) => {
    const file = path.join(dir, name)
    const tmp = `${file}.${process.pid}.tmp`
    await fs.promises.writeFile(tmp, body)
    await fs.promises.rename(tmp, file)
  }
  await put('sheet.webp', built.sheet)
  await put('flow.png', built.flow)
  await put('rig.json', JSON.stringify(built.json))
}

const inflight = new Set<string>()
const failed = new Map<string, number>() // key → when it failed: rest a minute

const start = (key: string, work: () => Promise<Built | null>) => {
  if (inflight.has(key)) return
  inflight.add(key)
  withSlot(async () => {
    const built = await work()
    if (built) await store(dirOf(key), built)
  })
    .catch((err) => {
      if (!(err instanceof Busy)) {
        failed.set(key, Date.now())
        Console.error('Rig failed:', err)
      }
    })
    .finally(() => inflight.delete(key))
}

/**
 * The rig file when built; 202 while the animation or the rig is on its way;
 * 404 when there is nothing to build from (or it failed in the last minute).
 */
export const serveRig = async (url: string) => {
  const reply = (
    status: number,
    type: string,
    body: Buffer | string,
    cache = 'no-store'
  ) => ({
    status,
    type,
    body: typeof body === 'string' ? Buffer.from(body) : body,
    cache,
  })
  const none = () => reply(404, 'text/plain', 'Not found')
  const parsed = readRigUrl(url)
  if (!SOURCE || !parsed) return none()
  const { key, file } = parsed
  const dir = dirOf(key)
  const target = path.join(dir, file)
  if (fs.existsSync(path.join(dir, 'rig.json')))
    return fs.existsSync(target)
      ? reply(200, FILES[file], await fs.promises.readFile(target), CACHED)
      : none()
  if (file !== 'rig.json') return none()
  if (Date.now() - (failed.get(key) ?? 0) < 60000) return none()
  const building = () =>
    reply(202, 'application/json', JSON.stringify({ status: 'building' }))
  if (inflight.has(key)) return building()
  let webp: Buffer | null = null
  try {
    webp = animationFor(key)
  } catch (err) {
    if (!(err instanceof Missing)) return building() // failed lately: retry soon
    start(key, async () => {
      const still = (await stillFor(key))?.body ?? null
      if (!still) {
        failed.set(key, Date.now())
        return null
      }
      return buildInWorker({ source: null, webp: null, still, key })
    })
    return building()
  }
  if (!webp) return building() // the animation is on its way
  const animated = webp
  start(key, async () =>
    buildInWorker({
      source: await fetchSource(key),
      webp: animated,
      still: null,
      key,
    })
  )
  return building()
}
