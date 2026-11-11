/**
 * yarn build:pokemon-art: builds, on this machine, everything the server
 * serves for the Pokémon pictures, into pokemon-art/<key>/ (POKEMON_ART_DIR):
 *   anim.webp   the upscaled animation (/api/image/<key>.webp)
 *   rig.json, sheet-N.webp, flow.webp, flow-lo.webp, eye.png   the room's rig (/api/image/rig/<key>/…)
 *   build.json  the versions it was built with (what makes a key up to date)
 * Upload that folder to the server; the server only reads it.
 *
 *   yarn build:pokemon-art                 every species PokéAPI lists, new or stale ones only
 *   yarn build:pokemon-art --ids 25,133-136
 *   --force            rebuild even when up to date
 *   --failed           only incomplete species: any rig file missing (built again)
 *   --jobs N           rig builds at the same time, one process each (default: cores/3: the GPU upscale is the limit, more only heats the CPU)
 *   --gpu-jobs N       upscales at the same time (default 2 with ESRGAN: more only shares the GPU; else CPU cores)
 *   --sheet-quality N  WebP quality of the rig sheet (default 98)
 *   --out DIR          default pokemon-art/ (or POKEMON_ART_DIR)
 *   --max N            species count when PokéAPI is unreachable
 * Sources and the upscaler come from server/.env (ANIMATED_*).
 */
import dotenv from 'dotenv'
import fs from 'fs'
import { fork } from 'child_process'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { PIPELINE_VERSION, upscaleAnimation } from './pipeline'
import { RIG_VERSION, buildRig } from './rig/build'
import { pickSource } from './sources'

const ROOT = path.resolve(__dirname, '../../')

// shell > server/.env.local > server/.env, like the server's own env
const loadEnv = () => {
  const parse = (file: string) => {
    const p = path.join(ROOT, 'server', file)
    return fs.existsSync(p) ? dotenv.parse(fs.readFileSync(p)) : {}
  }
  const merged = { ...parse('.env'), ...parse('.env.local') }
  for (const [k, v] of Object.entries(merged))
    if (process.env[k] === undefined) process.env[k] = v
}
loadEnv()

const env = (k: string) => String(process.env[k] || '').trim()
const SOURCE = env('ANIMATED_SOURCE_URL')
const STILL = env('ANIMATED_STILL_URL')
const SOURCE_CHAIN = [
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/lets-go-pikachu-lets-go-eevee/{key}.gif',
  'https://s3.pokeos.com/pokeos-uploads/assets/pokemon/home/animated/{key}.gif?v=3',
]
/** Bump when the source selection changes: every key is rebuilt. */
const SOURCE_VERSION = 3
const SIZE = Number(env('ANIMATED_SIZE')) || 512
const QUALITY = Number(env('ANIMATED_QUALITY')) || 95
const FETCH_TIMEOUT_MS = Number(env('ANIMATED_FETCH_TIMEOUT_MS')) || 30000
const TIMEOUT_MS = Number(env('ANIMATED_JOB_TIMEOUT_MS')) || 3600000

class Missing extends Error {}

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? undefined : (process.argv[i + 1] ?? '')
}
const flag = (name: string) => process.argv.includes(`--${name}`)

const OUT = path.resolve(
  ROOT,
  arg('out') || env('POKEMON_ART_DIR') || 'pokemon-art'
)
const SHEET_QUALITY = Number(arg('sheet-quality')) || 98
const CORES = os.availableParallelism?.() ?? os.cpus().length
const JOBS = Math.max(
  1,
  Number(arg('jobs')) || Math.max(2, Math.floor(CORES / 3))
)
const GPU_JOBS = Math.max(
  1,
  Number(arg('gpu-jobs')) || (env('ANIMATED_ESRGAN_DIR') ? 2 : CORES)
)

const get = async (url: string) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (res.status === 404 || res.status === 410) return null
    if (!res.ok) throw new Error(`${url} answered ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}
const fetchFrom = (template: string, key: string) =>
  get(template.replace('{key}', key))
const fetchSource = (key: string) =>
  pickSource(key, SOURCE_CHAIN, SOURCE, fetchFrom, Missing)
const fetchStill = async (key: string) =>
  STILL ? get(STILL.replace('{key}', key)) : null

/** "1,25,133-136" → [1, 25, 133, 134, 135, 136] */
const parseIds = (text: string) => {
  const ids = new Set<number>()
  for (const part of text.split(',')) {
    const [a, b = a] = part.trim().split('-').map(Number)
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a)
      throw new Error(`--ids: bad range "${part}"`)
    for (let i = a; i <= b; i++) ids.add(i)
  }
  return [...ids]
}

/** Every species PokéAPI knows: a new generation is picked up on its own. */
const allIds = async () => {
  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1')
    if (!res.ok) throw new Error(`PokéAPI answered ${res.status}`)
    const { count } = (await res.json()) as { count: number }
    return Array.from({ length: count }, (_, i) => i + 1)
  } catch (err) {
    const max = Number(arg('max'))
    if (!max) throw new Error(`${(err as Error).message} (or pass --max N)`)
    return Array.from({ length: max }, (_, i) => i + 1)
  }
}

const stamp = () => ({
  rig: RIG_VERSION,
  pipeline: PIPELINE_VERSION,
  source: SOURCE_VERSION,
  size: SIZE,
  quality: QUALITY,
  sheetQuality: SHEET_QUALITY,
})
type Stamp = ReturnType<typeof stamp> & { kind: 'animated' | 'still' }

const readStamp = (dir: string): Stamp | null => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'build.json'), 'utf8'))
  } catch {
    return null
  }
}
const current = (s: Stamp | null) =>
  !!s &&
  JSON.stringify({ ...s, kind: 0 }) === JSON.stringify({ ...stamp(), kind: 0 })

const put = async (dir: string, name: string, body: Buffer | string) => {
  const file = path.join(dir, name)
  const tmp = `${file}.${process.pid}.tmp`
  await fs.promises.writeFile(tmp, body)
  await fs.promises.rename(tmp, file)
}

const withTimeout = <T>(work: Promise<T>, label: string) => {
  let timer: NodeJS.Timeout
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out`)),
        TIMEOUT_MS
      )
    }),
  ]).finally(() => clearTimeout(timer))
}

/** Every file buildKey writes; anim.webp too when the species is animated. */
const RIG_OUTPUT = [
  'build.json',
  'rig.json',
  'sheet-0.webp',
  'flow.webp',
  'flow-lo.webp',
  'eye.png',
]

type Result = 'built' | 'skipped' | 'none'
type Task = 'anim' | 'rig'

const stageDir = (key: string) => path.join(OUT, key, '.stage')
const stageRead = (key: string, name: string) =>
  fs.promises.readFile(path.join(stageDir(key), name))

/** Stage 1 (GPU): the source and its upscaled animation, kept in .stage/. */
async function animTask(
  key: string,
  force = false
): Promise<'skipped' | 'none' | 'animated' | 'still'> {
  const dir = path.join(OUT, key)
  const known = readStamp(dir)
  if (!force && !flag('force') && current(known)) {
    // a species built from its still may have got its animation since
    if (known?.kind === 'animated') return 'skipped'
    const found = await fetchSource(key).then(
      () => true,
      (err) => {
        if (err instanceof Missing) return false
        throw err
      }
    )
    if (!found) return 'skipped'
  }
  let src: { image: Buffer; sharpen: boolean } | null = null
  try {
    src = await fetchSource(key)
  } catch (err) {
    if (!(err instanceof Missing)) throw err
  }
  await fs.promises.rm(stageDir(key), { recursive: true, force: true })
  await fs.promises.mkdir(stageDir(key), { recursive: true })
  if (!src) {
    const still = await fetchStill(key)
    if (!still) return 'none'
    await fs.promises.writeFile(path.join(stageDir(key), 'still.bin'), still)
    return 'still'
  }
  const source = src
  const anim = await withTimeout(
    upscaleAnimation(source.image, {
      size: SIZE,
      quality: QUALITY,
      esrganDir: env('ANIMATED_ESRGAN_DIR') || undefined,
      esrganModel: env('ANIMATED_ESRGAN_MODEL') || undefined,
      rifeDir: env('ANIMATED_RIFE_DIR') || undefined,
      fpsFactor: Number(env('ANIMATED_FPS_FACTOR')) || 4,
      sharpen: source.sharpen,
      esrganTimeoutMs: Math.floor(TIMEOUT_MS / 2) - 5000,
    }),
    'animation'
  )
  await fs.promises.writeFile(
    path.join(stageDir(key), 'source.bin'),
    source.image
  )
  await fs.promises.writeFile(path.join(stageDir(key), 'anim.webp'), anim)
  return 'animated'
}

/** Stage 2 (CPU): the rig, then the files of the key, build.json last. */
async function rigTask(
  key: string,
  kind: 'animated' | 'still'
): Promise<Result> {
  const dir = path.join(OUT, key)
  const options = { sheetQuality: SHEET_QUALITY }
  const anim = kind === 'animated' ? await stageRead(key, 'anim.webp') : null
  const built = anim
    ? await buildRig(
        await stageRead(key, 'source.bin'),
        anim,
        null,
        key,
        options
      )
    : await buildRig(
        null,
        null,
        await stageRead(key, 'still.bin'),
        key,
        options
      )
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.rm(path.join(dir, 'build.json'), { force: true })
  if (anim) await put(dir, 'anim.webp', anim)
  else await fs.promises.rm(path.join(dir, 'anim.webp'), { force: true })
  await fs.promises.rm(path.join(dir, 'sheet.webp'), { force: true })
  for (let i = 0; i < 4; i++)
    if (i < built.sheets.length) await put(dir, `sheet-${i}.webp`, built.sheets[i])
    else await fs.promises.rm(path.join(dir, `sheet-${i}.webp`), { force: true })
  await put(dir, 'flow.webp', built.flow)
  await put(dir, 'flow-lo.webp', built.flowLow)
  await put(dir, 'eye.png', built.eye)
  await put(dir, 'rig.json', JSON.stringify(built.json))
  await put(dir, 'build.json', JSON.stringify({ ...stamp(), kind }))
  await fs.promises.rm(stageDir(key), { recursive: true, force: true })
  return 'built'
}

const runChild = <T>(task: Task, key: string, kind?: string, force?: boolean) =>
  new Promise<T>((resolve, reject) => {
    const child = fork(
      path.join(__dirname, 'cli.cjs'),
      [...process.argv.slice(2), '--child'],
      { execArgv: ['--max-old-space-size=4096'] }
    )
    let answered = false
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS * 2)
    child.once('message', (m: { result?: T; error?: string }) => {
      answered = true
      return m.error ? reject(new Error(m.error)) : resolve(m.result as T)
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      if (!answered)
        reject(new Error(`${task} process ended (${signal || code})`))
    })
    child.send({ task, key, kind, force })
  })

class Gate {
  private waiting: (() => void)[] = []
  constructor(private free: number) {}
  async take() {
    if (this.free > 0) return void this.free--
    await new Promise<void>((r) => this.waiting.push(r))
  }
  give() {
    const next = this.waiting.shift()
    if (next) next()
    else this.free++
  }
}

const sizeOf = (dir: string): number =>
  !fs.existsSync(dir)
    ? 0
    : fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
        const p = path.join(dir, e.name)
        return sum + (e.isDirectory() ? sizeOf(p) : fs.statSync(p).size)
      }, 0)

async function main() {
  if (!SOURCE && !SOURCE_CHAIN.length) throw new Error('no animation source')
  const all = arg('ids') ? parseIds(String(arg('ids'))) : await allIds()
  // --failed: a species whose folder lacks any file the rig build writes
  // (anim.webp too, unless it was built from its still) is built again, even
  // with a current build.json. amber.* come from build:amber-art: only listed.
  const missing = (id: number | string) => {
    const dir = path.join(OUT, String(id))
    const kind = readStamp(dir)?.kind
    const need = [...RIG_OUTPUT, ...(kind === 'still' ? [] : ['anim.webp'])]
    return need.filter((f) => !fs.existsSync(path.join(dir, f)))
  }
  const ids = flag('failed') ? all.filter((id) => missing(id).length) : all
  // a stamped folder short of a file: build.json alone must not skip it
  const redo = new Set(
    ids.filter((id) => readStamp(path.join(OUT, String(id)))).map(String)
  )
  if (flag('failed')) {
    console.log(
      `[pokemon-art] ${ids.length} of ${all.length} species are incomplete`
    )
    for (const id of ids)
      console.log(`[pokemon-art]   ${id}: missing ${missing(id).join(', ')}`)
    const noAmber = all.filter(
      (id) => !fs.existsSync(path.join(OUT, String(id), 'amber.webp'))
    )
    if (noAmber.length)
      console.log(
        `[pokemon-art] ${noAmber.length} species have no amber.webp: yarn build:amber-art`
      )
  }
  fs.mkdirSync(OUT, { recursive: true })
  console.log(
    `[pokemon-art] ${ids.length} species -> ${OUT} (rig v${RIG_VERSION}, pipeline v${PIPELINE_VERSION}, sheet q${SHEET_QUALITY}; ${GPU_JOBS} upscale + ${JOBS} rig processes)`
  )

  const counts = { built: 0, skipped: 0, none: 0, failed: 0 }
  const failures: string[] = []
  const started = Date.now()
  let next = 0
  let done = 0
  const rigs = new Gate(JOBS)
  const pending: Promise<void>[] = []
  const finish = (key: string, result: Result | 'failed', since: number) => {
    counts[result]++
    done++
    if (result !== 'skipped')
      console.log(
        `[pokemon-art] ${done}/${ids.length} ${key} ${result} ${((Date.now() - since) / 1000).toFixed(1)}s`
      )
  }
  const fail = (key: string, err: unknown) => {
    failures.push(`${key}: ${(err as Error).message}`)
    console.error(`[pokemon-art] ${key} failed:`, (err as Error).message)
    fs.rmSync(stageDir(key), { recursive: true, force: true })
  }
  // upscale workers pull keys; each finished animation goes to a rig process
  // at once, so the GPU never waits for the CPU (and never runs ahead of it)
  const upscaler = async () => {
    while (next < ids.length) {
      const key = String(ids[next++])
      const since = Date.now()
      console.log(`[pokemon-art] ${key} started`)
      let stage: 'skipped' | 'none' | 'animated' | 'still'
      try {
        // one more go: a Vulkan hiccup often passes the second time
        const force = redo.has(key)
        stage = await runChild<typeof stage>(
          'anim',
          key,
          undefined,
          force
        ).catch(() => runChild<typeof stage>('anim', key, undefined, force))
      } catch (err) {
        fail(key, err)
        finish(key, 'failed', since)
        continue
      }
      if (stage === 'skipped' || stage === 'none') {
        finish(key, stage, since)
        continue
      }
      await rigs.take()
      pending.push(
        runChild<Result>('rig', key, stage)
          .then(
            (r) => finish(key, r, since),
            (err) => {
              fail(key, err)
              finish(key, 'failed', since)
            }
          )
          .finally(() => rigs.give())
      )
    }
  }
  await Promise.all(Array.from({ length: GPU_JOBS }, upscaler))
  await Promise.all(pending)

  console.log(
    `[pokemon-art] done in ${((Date.now() - started) / 60000).toFixed(1)} min: ${counts.built} built, ${counts.skipped} up to date, ${counts.none} without any source, ${counts.failed} failed; ${(sizeOf(OUT) / 1024 / 1024).toFixed(0)} MB in ${OUT}`
  )
  if (failures.length) {
    console.error(failures.join('\n'))
    console.error(
      '[pokemon-art] retry only these: yarn build:pokemon-art --failed'
    )
    process.exitCode = 1
  }
}

// ---- child process: one task, one answer, then it exits (memory goes back) ----
if (process.argv.includes('--child')) {
  sharp.cache(false)
  sharp.concurrency(1)
  try {
    os.setPriority(10) // the machine stays usable while the build runs
  } catch {}
  process.once(
    'message',
    async (m: {
      task: Task
      key: string
      kind?: 'animated' | 'still'
      force?: boolean
    }) => {
      try {
        const result =
          m.task === 'anim'
            ? await animTask(m.key, m.force)
            : await rigTask(m.key, m.kind!)
        process.send?.({ result }, () => process.exit(0))
      } catch (err) {
        process.send?.({ error: String((err as Error)?.stack || err) }, () =>
          process.exit(0)
        )
      }
    }
  )
} else {
  main().catch((err) => {
    console.error('[pokemon-art]', err.message)
    process.exit(1)
  })
}
