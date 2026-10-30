"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } class RenderBusyError extends Error {
  constructor() {
    super('Render queue is full or its wait timeout expired')
  }
} exports.RenderBusyError = RenderBusyError;

// All HTTP workers in one process receive the same state. PM2 distributes
// the VPS render budget between processes before creating those workers.
 const createRenderGate = (options






) => {
  const running = new Int32Array(
    _nullishCoalesce(options.sharedState, () => ( new SharedArrayBuffer(4)))
  )
  let waiting = 0
  const getLimit = () =>
    Math.max(1, Math.min(options.limit, _nullishCoalesce(_optionalChain([options, 'access', _ => _.getLimit, 'optionalCall', _2 => _2()]), () => ( options.limit))))
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
      (_nullishCoalesce(_optionalChain([options, 'access', _3 => _3.canStart, 'optionalCall', _4 => _4()]), () => ( true))),
    run: async ( task) => {
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
}; exports.createRenderGate = createRenderGate
