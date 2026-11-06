type WorkerLike = {
  once(event: 'message', listener: (message: any) => void): unknown
  once(event: 'error', listener: (err: Error) => void): unknown
  once(event: 'exit', listener: (code: number) => void): unknown
  terminate(): unknown
}

/**
 * A worker's one answer: its message, or a rejection on an error message,
 * an error, an exit or running out of `ms`. Whichever comes first, the worker
 * is ended, so a timed-out build stops using CPU and memory.
 */
export const workerJob = <T = any>(
  worker: WorkerLike,
  ms: number,
  label: string
) =>
  new Promise<T>((resolve, reject) => {
    let done = false
    const settle = (fn: () => void) => {
      if (done) return
      done = true
      clearTimeout(timer)
      worker.terminate()
      fn()
    }
    const timer = setTimeout(
      () => settle(() => reject(new Error(`${label} timed out`))),
      ms
    )
    worker.once('message', (message) =>
      settle(() =>
        message?.error ? reject(new Error(message.error)) : resolve(message)
      )
    )
    worker.once('error', (err) => settle(() => reject(err)))
    worker.once('exit', (code) =>
      settle(() => reject(new Error(`${label} worker exited ${code}`)))
    )
  })
