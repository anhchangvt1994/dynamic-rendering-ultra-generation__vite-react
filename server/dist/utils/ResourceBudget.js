"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _os = require('os'); var _os2 = _interopRequireDefault(_os);

const read = (file) => {
  try {
    return _fs2.default.readFileSync(file, 'utf8').trim()
  } catch (e) {
    return ''
  }
}
const positive = (value, fallback) => {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : fallback
}

 const getResources = () => {
  const availableCpus = _nullishCoalesce(_optionalChain([_os2.default, 'access', _ => _.availableParallelism, 'optionalCall', _2 => _2()]), () => ( _os2.default.cpus().length))
  const [quota, period] = read('/sys/fs/cgroup/cpu.max')
    .split(/\s+/)
    .map(Number)
  const cpuCount =
    Number.isFinite(quota) && quota > 0 && period > 0
      ? Math.max(1, Math.min(availableCpus, Math.floor(quota / period)))
      : availableCpus
  const memoryLimit = Number(read('/sys/fs/cgroup/memory.max'))
  const memoryBytes =
    memoryLimit > 0 ? Math.min(_os2.default.totalmem(), memoryLimit) : _os2.default.totalmem()
  return { cpuCount, memoryMB: Math.floor(memoryBytes / 1048576) }
}; exports.getResources = getResources

 const getResourceBudget = (
  env = process.env,
  resources = exports.getResources.call(void 0, )
) => {
  const { cpuCount, memoryMB } = resources
  const reserveMB = Math.max(384, Math.floor(memoryMB * 0.25))
  const memoryCapacity = Math.max(1, Math.floor((memoryMB - reserveMB) / 384))
  // This is the host-wide maximum, not a promise to keep every slot active.
  // The render gate can shed instance-local permits under CPU/RAM pressure.
  // Small RAM still caps the maximum; an explicit override remains RAM bounded.
  const renderTotal = Math.min(
    memoryCapacity,
    positive(
      env.CRAWL_CONCURRENCY,
      cpuCount >= 4 ? 4 : cpuCount >= 2 ? 2 : 1
    )
  )
  const requestedInstances =
    env.CLUSTER_INSTANCES === 'max'
      ? cpuCount
      : positive(
          _nullishCoalesce(env.APP_INSTANCES, () => ( env.CLUSTER_INSTANCES)),
          cpuCount >= 4 ? 2 : 1
        )
  const instances = Math.max(1, Math.min(requestedInstances, renderTotal))
  const renderConcurrency = Math.max(1, Math.floor(renderTotal / instances))
  const requestWorkers = Math.min(
    positive(env.REQUEST_WORKERS, 1),
    renderConcurrency,
    cpuCount
  )
  const processMemoryMB = Math.max(
    128,
    Math.floor((memoryMB * 0.7) / instances)
  )
  const workerHeapMB = Math.max(
    96,
    Math.min(
      256,
      Math.floor(processMemoryMB / (requestWorkers * (renderConcurrency + 3)))
    )
  )
  return {
    ...resources,
    instances,
    requestWorkers,
    renderConcurrency,
    processMemoryMB,
    workerHeapMB,
    nodeHeapMB: Math.max(
      128,
      Math.min(1024, Math.floor(processMemoryMB * 0.35))
    ),
    hotCacheBytes:
      Math.max(
        4,
        Math.min(32, Math.floor(memoryMB / (instances * requestWorkers * 64)))
      ) * 1048576,
    queueLimit: Math.min(256, positive(env.CRAWL_QUEUE_LIMIT, 32)),
    queueTimeoutMs: Math.min(
      60000,
      positive(env.CRAWL_QUEUE_TIMEOUT_MS, 15000)
    ),
  }
}; exports.getResourceBudget = getResourceBudget

const AVAILABLE_MEMORY_SAMPLE_TTL_MS = 100
let availableMemorySample

 const getAvailableMemoryMB = () => {
  const now = Date.now()
  if (
    availableMemorySample &&
    now - availableMemorySample.sampledAt < AVAILABLE_MEMORY_SAMPLE_TTL_MS
  )
    return availableMemorySample.memoryMB

  const limit = Number(read('/sys/fs/cgroup/memory.max'))
  let memoryMB
  if (limit > 0) {
    const current = Number(read('/sys/fs/cgroup/memory.current'))
    const inactive = Number(
      _nullishCoalesce(_optionalChain([/^inactive_file (\d+)$/m, 'access', _3 => _3.exec, 'call', _4 => _4(read('/sys/fs/cgroup/memory.stat')), 'optionalAccess', _5 => _5[1]]), () => (
        0))
    )
    memoryMB = Math.max(0, (limit - current + inactive) / 1048576)
  } else if (process.platform === 'darwin') memoryMB = Infinity
  else {
    const availableKiB = Number(
      _optionalChain([/^MemAvailable:\s+(\d+)/m, 'access', _6 => _6.exec, 'call', _7 => _7(read('/proc/meminfo')), 'optionalAccess', _8 => _8[1]])
    )
    memoryMB = availableKiB > 0 ? availableKiB / 1024 : _os2.default.freemem() / 1048576
  }

  availableMemorySample = { sampledAt: now, memoryMB }
  return memoryMB
}; exports.getAvailableMemoryMB = getAvailableMemoryMB






const CPU_PRESSURE_SAMPLE_TTL_MS = 1000
let cpuPressureSample



/** Read host-wide CPU stall pressure; unsupported platforms fail open. */
 const getCpuPressure = () => {
  const now = Date.now()
  if (
    cpuPressureSample &&
    now - cpuPressureSample.sampledAt < CPU_PRESSURE_SAMPLE_TTL_MS
  )
    return cpuPressureSample.pressure

  const line = _nullishCoalesce(_optionalChain([/^some\s+([^\n]+)$/m, 'access', _9 => _9.exec, 'call', _10 => _10(read('/proc/pressure/cpu')), 'optionalAccess', _11 => _11[1]]), () => ( ''))
  const avg10 = Number(_optionalChain([/(?:^|\s)avg10=([\d.]+)/, 'access', _12 => _12.exec, 'call', _13 => _13(line), 'optionalAccess', _14 => _14[1]]))
  const avg60 = Number(_optionalChain([/(?:^|\s)avg60=([\d.]+)/, 'access', _15 => _15.exec, 'call', _16 => _16(line), 'optionalAccess', _17 => _17[1]]))
  const pressure =
    Number.isFinite(avg10) && avg10 >= 0 && Number.isFinite(avg60) && avg60 >= 0
      ? { avg10, avg60 }
      : undefined

  cpuPressureSample = { sampledAt: now, pressure }
  return pressure
}; exports.getCpuPressure = getCpuPressure
