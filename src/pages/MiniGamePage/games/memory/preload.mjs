export function memoryArtworkCandidates(count = 24) {
  const size = Math.max(0, Math.min(1025, Math.floor(count)))
  return Array.from({ length: size }, (_, i) => Math.floor(((i + 0.5) * 1025) / size) + 1)
}

/** @param {number} id @param {{ ImageClass?: any, getSrc?: (id: number) => string }} [options] */
export function loadMemoryImage(id, { ImageClass = globalThis.Image, getSrc } = {}) {
  if (!ImageClass || typeof getSrc !== 'function') return Promise.resolve(false)
  return new Promise((resolve) => {
    const image = new ImageClass()
    let done = false
    const finish = (ready) => {
      if (done) return
      done = true
      resolve(ready)
    }
    image.onload = async () => {
      try {
        if (typeof image.decode === 'function') await image.decode()
        finish(true)
      } catch {
        finish(false)
      }
    }
    image.onerror = () => finish(false)
    image.src = getSrc(id)
    if (image.complete && image.naturalWidth === undefined) image.onload?.()
    if (image.complete && image.naturalWidth > 0) {
      if (typeof image.decode === 'function') image.decode().then(() => finish(true), () => finish(false))
      else finish(true)
    }
  })
}

/** @param {{ ImageClass?: any, candidates?: number[], timeoutMs?: number, getSrc?: (id: number) => string }} [options] */
export function preloadMemoryArtwork({
  ImageClass = globalThis.Image,
  candidates,
  timeoutMs = 1000,
  getSrc,
} = {}) {
  if (!ImageClass || typeof getSrc !== 'function' || !Array.isArray(candidates)) return Promise.resolve()
  return new Promise((resolve) => {
    let pending = candidates.length
    if (pending === 0) return resolve()
    const finish = () => {
      if (pending > 0) {
        pending = 0
        resolve()
      }
    }
    const timer = setTimeout(finish, timeoutMs)
    for (const id of candidates) {
      const image = new ImageClass()
      const done = () => {
        if (pending <= 0) return
        pending -= 1
        if (pending === 0) {
          clearTimeout(timer)
          resolve()
        }
      }
      image.onload = done
      image.onerror = done
      image.src = getSrc(id)
      if (image.complete) done()
    }
  })
}
