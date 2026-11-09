/**
 * One species' rig for the room (server: /api/image/rig): rig.json, its
 * sprite sheet and its flow, decoded once per session. While the server
 * builds it rig.json answers 202, and we ask again.
 */
export type Lab = [number, number, number]

export type RigJson = {
  v: number
  frame: { w: number; h: number }
  sheet: { cols: number; size: number }
  frames: number
  delays: number[]
  src: { n: number; k: number }
  flow: { cols: number; tile: number; bits: number }
  clusters: { lab: Lab; share: number }[]
  lock: { ink: number; light: number }
  primary: { size: number; bits: string }
  branches: { points: [number, number][]; radius: number[] }[]
  noMarks?: true
}

export type Rig = { json: RigJson; sheet: ImageBitmap; flow: ImageBitmap }

const POLL_MS = 1500
const POLLS = 80

const loaded = new Map<number, Rig>()
const loading = new Map<number, Promise<Rig | null>>()

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// the flow holds coordinates, not colours: no colour management on it
const bitmap = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return createImageBitmap(await res.blob(), {
    premultiplyAlpha: 'premultiply',
    colorSpaceConversion: 'none',
  })
}

async function fetchRig(speciesId: number): Promise<Rig | null> {
  const base = `/api/image/rig/${speciesId}`
  try {
    for (let poll = 0; poll <= POLLS; poll++) {
      const res = await fetch(`${base}/rig.json`)
      if (res.status === 202) {
        if (poll === POLLS) return null
        await wait(POLL_MS)
        continue
      }
      if (!res.ok) return null
      const json = (await res.json()) as RigJson
      const [sheet, flow] = await Promise.all([
        bitmap(`${base}/sheet.webp`),
        bitmap(`${base}/flow.png`),
      ])
      const rig = { json, sheet, flow }
      loaded.set(speciesId, rig)
      return rig
    }
  } catch {
    // offline, or a file that would not decode
  }
  return null
}

/**
 * Starts (or joins) the species' rig download. Shared by everyone who asks
 * and never cancelled by one of them leaving, so the room can ask for it
 * the moment it opens, while the picture is still on its way, and the
 * canvas finds it ready.
 */
export function preloadRig(speciesId: number): Promise<Rig | null> {
  const known = loaded.get(speciesId)
  if (known) return Promise.resolve(known)
  let job = loading.get(speciesId)
  if (!job) {
    job = fetchRig(speciesId).finally(() => loading.delete(speciesId))
    loading.set(speciesId, job)
  }
  return job
}

/** The species' rig, or null when there is none (yet) or it fails to load. */
export function loadRig(
  speciesId: number,
  signal: AbortSignal
): Promise<Rig | null> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    signal.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    })
    preloadRig(speciesId).then(resolve, reject)
  })
}
