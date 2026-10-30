export class RenderBusyError extends Error {
  constructor() {
    super('Render queue is full or its wait timeout expired')
  }
}

// All HTTP workers in one process receive the same state. PM2 distributes
// the VPS render budget between processes before creating those workers.
export const createRenderGate = (options: {
  limit: number
  getLimit?: () => number
  queueLimit: number
  waitTimeoutMs: number
  sharedState?: SharedArrayBuffer
  canStart?: () => boolean
}) => {
  const running = new Int32Array(
    options.sharedState ?? new SharedArrayBuffer(4)
  )
  let waiting = 0
  const getLimit = () =>
    Math.max(1, Math.min(options.limit, options.getLimit?.() ?? options.limit))
  const claim = () => {
    if (options.canStart && !options.canStart()) return false
    for (;;) {
      const count = Atomics.load(running, 0)
      if (count >= getLimit()) return false
      if (Atomics.compareExchange(running, 0, count, count + 1) === count)
        return true
    }
  }
  return {
    hasCapacity: () =>
      Atomics.load(running, 0) < getLimit() &&
      (options.canStart?.() ?? true),
    run: async <T>(task: () => Promise<T>): Promise<T> => {
      if (!claim()) {
        if (waiting >= options.queueLimit) throw new RenderBusyError()
        waiting++
        const deadline = Date.now() + options.waitTimeoutMs
        try {
          for (;;) {
            if (Date.now() >= deadline) throw new RenderBusyError()
            if (claim()) break
            await new Promise((resolve) => setTimeout(resolve, 25))
          }
        } finally {
          waiting--
        }
      }
      try {
        return await task()
      } finally {
        Atomics.sub(running, 0, 1)
      }
    },
  }
}
