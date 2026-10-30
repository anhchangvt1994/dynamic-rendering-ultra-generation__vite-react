"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }























/**
 * Applies fast load shedding and slow recovery to an instance-local render cap.
 * PSI values are percentages of time tasks were stalled on the host CPU.
 */
 const createAdaptiveRenderLimit = (
  options
) => {
  const maxConcurrency = Math.max(1, Math.floor(options.maxConcurrency))
  const minConcurrency = Math.min(
    maxConcurrency,
    Math.max(1, Math.floor(_nullishCoalesce(options.minConcurrency, () => ( 1))))
  )
  const minimumAvailableMemoryMB = Math.max(
    0,
    _nullishCoalesce(options.minAvailableMemoryMB, () => ( 512))
  )
  const now = _nullishCoalesce(options.now, () => ( Date.now))
  const recoveryWindowMs = Math.max(1000, _nullishCoalesce(options.recoveryWindowMs, () => ( 30000)))
  let currentConcurrency = maxConcurrency
  let recoveryStartedAt
  const setConcurrency = (
    next,
    reason
  ) => {
    if (next === currentConcurrency) return
    const from = currentConcurrency
    currentConcurrency = next
    _optionalChain([options, 'access', _ => _.onChange, 'optionalCall', _2 => _2({ from, to: next, reason })])
  }

  return () => {
    const pressure = options.readCpuPressure()
    const availableMemoryMB =
      _nullishCoalesce(_optionalChain([options, 'access', _3 => _3.readAvailableMemoryMB, 'optionalCall', _4 => _4()]), () => ( Number.POSITIVE_INFINITY))
    const validPressure =
      pressure &&
      Number.isFinite(pressure.avg10) &&
      Number.isFinite(pressure.avg60) &&
      pressure.avg10 >= 0 &&
      pressure.avg60 >= 0
    const cpuPressureHigh =
      validPressure &&
      (pressure.avg10 >= (_nullishCoalesce(options.highCpuAvg10, () => ( 20))) ||
        pressure.avg60 >= (_nullishCoalesce(options.highCpuAvg60, () => ( 25))))
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
      pressure.avg10 <= (_nullishCoalesce(options.recoveryCpuAvg10, () => ( 10))) &&
      pressure.avg60 <= (_nullishCoalesce(options.recoveryCpuAvg60, () => ( 15)))
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
}; exports.createAdaptiveRenderLimit = createAdaptiveRenderLimit
