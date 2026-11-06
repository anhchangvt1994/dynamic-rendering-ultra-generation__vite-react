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

const POLL_MS = 4000
const POLLS = 30

const loaded = new Map<number, Rig>()

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true }
    )
  })

// the flow holds coordinates, not colours: no colour management on it
const bitmap = async (url: string, signal: AbortSignal) => {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return createImageBitmap(await res.blob(), {
    premultiplyAlpha: 'premultiply',
    colorSpaceConversion: 'none',
  })
}

/** The species' rig, or null when there is none (yet) or it fails to load. */
export async function loadRig(
  speciesId: number,
  signal: AbortSignal
): Promise<Rig | null> {
  const known = loaded.get(speciesId)
  if (known) return known
  const base = `/api/image/rig/${speciesId}`
  try {
    for (let poll = 0; poll <= POLLS; poll++) {
      const res = await fetch(`${base}/rig.json`, { signal })
      if (res.status === 202) {
        if (poll === POLLS) return null
        await wait(POLL_MS, signal)
        continue
      }
      if (!res.ok) return null
      const json = (await res.json()) as RigJson
      const [sheet, flow] = await Promise.all([
        bitmap(`${base}/sheet.webp`, signal),
        bitmap(`${base}/flow.png`, signal),
      ])
      const rig = { json, sheet, flow }
      loaded.set(speciesId, rig)
      return rig
    }
  } catch {
    // aborted, offline, or a file that would not decode
  }
  return null
}
