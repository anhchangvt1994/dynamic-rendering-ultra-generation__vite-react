// Warms the browser's cache for the form an evolution is about to give: the
// server builds the animated WebP on the first ask (202 while it does), and
// the evolution scene lasts long enough for that to finish, so the room finds
// the animation ready.
export const WARM_MAX = 3
const RETRY_MS = 3000
const TRIES = 40

/** The species worth building: the chosen one first, ready forms only. */
export function warmPlan(forms, selected, cap = WARM_MAX) {
  const ids = forms.filter((f) => f.ready).map((f) => f.to)
  const first = ids.includes(selected) ? [selected] : []
  return [...new Set([...first, ...ids])].slice(0, cap)
}

const jobs = new Map()
const done = new Set()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Asks /api/image/<id>.webp until it answers 200; shared, never throws. */
export function warmUp(id, io = {}) {
  if (done.has(id)) return Promise.resolve()
  const running = jobs.get(id)
  if (running) return running
  const get = io.fetch ?? ((url) => fetch(url))
  const wait = io.wait ?? sleep
  const tries = io.tries ?? TRIES
  const job = (async () => {
    for (let i = 0; i < tries; i++) {
      let status = 0
      try {
        const res = await get(`/api/image/${id}.webp`)
        status = res.status
        // 200 is on its way into the cache: read it through
        if (status === 200) await res.arrayBuffer?.()
        else void res.body?.cancel?.()
      } catch {
        // offline: ask again
      }
      if (status === 200) return void done.add(id)
      if (status && status !== 202 && status < 500) return
      if (i < tries - 1) await wait(RETRY_MS)
    }
  })().finally(() => jobs.delete(id))
  jobs.set(id, job)
  return job
}
