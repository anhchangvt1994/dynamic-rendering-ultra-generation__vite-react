export interface ICpuPressureSample {
  avg10: number
  avg60: number
}

interface IAdaptiveRenderLimitOptions {
  maxConcurrency: number
  minConcurrency?: number
  minAvailableMemoryMB?: number
  readCpuPressure: () => ICpuPressureSample | undefined
  readAvailableMemoryMB?: () => number
  now?: () => number
  highCpuAvg10?: number
  highCpuAvg60?: number
  recoveryCpuAvg10?: number
  recoveryCpuAvg60?: number
  recoveryWindowMs?: number
  onChange?: (change: {
    from: number
    to: number
    reason: 'cpu-pressure' | 'memory-pressure' | 'recovered'
  }) => void
}

/**
 * Applies fast load shedding and slow recovery to an instance-local render cap.
 * PSI values are percentages of time tasks were stalled on the host CPU.
 */
export const createAdaptiveRenderLimit = (
  options: IAdaptiveRenderLimitOptions
) => {
  const maxConcurrency = Math.max(1, Math.floor(options.maxConcurrency))
  const minConcurrency = Math.min(
    maxConcurrency,
    Math.max(1, Math.floor(options.minConcurrency ?? 1))
  )
  const minimumAvailableMemoryMB = Math.max(
    0,
    options.minAvailableMemoryMB ?? 512
  )
  const now = options.now ?? Date.now
  const recoveryWindowMs = Math.max(1000, options.recoveryWindowMs ?? 30000)
  let currentConcurrency = maxConcurrency
  let recoveryStartedAt: number | undefined
  const setConcurrency = (
    next: number,
    reason: 'cpu-pressure' | 'memory-pressure' | 'recovered'
  ) => {
    if (next === currentConcurrency) return
    const from = currentConcurrency
    currentConcurrency = next
    options.onChange?.({ from, to: next, reason })
  }

  return () => {
    const pressure = options.readCpuPressure()
    const availableMemoryMB =
      options.readAvailableMemoryMB?.() ?? Number.POSITIVE_INFINITY
    const validPressure =
      pressure &&
      Number.isFinite(pressure.avg10) &&
      Number.isFinite(pressure.avg60) &&
      pressure.avg10 >= 0 &&
      pressure.avg60 >= 0
    const cpuPressureHigh =
      validPressure &&
      (pressure.avg10 >= (options.highCpuAvg10 ?? 20) ||
        pressure.avg60 >= (options.highCpuAvg60 ?? 25))
    const memoryPressureHigh =
      Number.isFinite(availableMemoryMB) &&
      availableMemoryMB < minimumAvailableMemoryMB * 2

    if (cpuPressureHigh || memoryPressureHigh) {
      recoveryStartedAt = undefined
      setConcurrency(
        minConcurrency,
        memoryPressureHigh ? 'memory-pressure' : 'cpu-pressure'
      )
      return currentConcurrency
    }

    const cpuPressureRecovered =
      validPressure &&
      pressure.avg10 <= (options.recoveryCpuAvg10 ?? 10) &&
      pressure.avg60 <= (options.recoveryCpuAvg60 ?? 15)
    const memoryRecovered =
      !Number.isFinite(availableMemoryMB) ||
      availableMemoryMB >= minimumAvailableMemoryMB * 3

    if (currentConcurrency < maxConcurrency) {
      if (cpuPressureRecovered && memoryRecovered) {
        const time = now()
        recoveryStartedAt ??= time
        if (time - recoveryStartedAt >= recoveryWindowMs) {
          recoveryStartedAt = undefined
          setConcurrency(maxConcurrency, 'recovered')
        }
      } else recoveryStartedAt = undefined
    }

    return currentConcurrency
  }
}
