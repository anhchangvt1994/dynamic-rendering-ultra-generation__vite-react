// HTTP tasks can overlap independently of expensive browser work. A queued
// fallback borrows one existing Page; no browser/page is created per URL.
export const createPagePool = (size: number) => {
  if (!Number.isSafeInteger(size) || size < 1)
    throw new Error('Page pool size must be positive')
  const free = Array.from({ length: size }, (_, i) => i)
  const waiting: ((lane: number) => void)[] = []
  let active = 0,
    peak = 0
  return {
    async run<T>(callback: (lane: number) => Promise<T>): Promise<T> {
      const lane = free.length
        ? free.shift()!
        : await new Promise<number>((resolve) => waiting.push(resolve))
      active++
      peak = Math.max(peak, active)
      try {
        return await callback(lane)
      } finally {
        active--
        const next = waiting.shift()
        if (next) next(lane)
        else free.push(lane)
      }
    },
    get peak() {
      return peak
    },
  }
}
