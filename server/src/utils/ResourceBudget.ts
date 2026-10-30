import fs from 'fs'
import os from 'os'

const read = (file: string) => {
  try {
    return fs.readFileSync(file, 'utf8').trim()
  } catch {
    return ''
  }
}
const positive = (value: unknown, fallback: number) => {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : fallback
}

export const getResources = () => {
  const availableCpus = os.availableParallelism?.() ?? os.cpus().length
  const [quota, period] = read('/sys/fs/cgroup/cpu.max')
    .split(/\s+/)
    .map(Number)
  const cpuCount =
    Number.isFinite(quota) && quota > 0 && period > 0
      ? Math.max(1, Math.min(availableCpus, Math.floor(quota / period)))
      : availableCpus
  const memoryLimit = Number(read('/sys/fs/cgroup/memory.max'))
  const memoryBytes =
    memoryLimit > 0 ? Math.min(os.totalmem(), memoryLimit) : os.totalmem()
  return { cpuCount, memoryMB: Math.floor(memoryBytes / 1048576) }
}

export const getResourceBudget = (
  env: { [key: string]: unknown } = process.env,
  resources = getResources()
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
          env.APP_INSTANCES ?? env.CLUSTER_INSTANCES,
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
}

const AVAILABLE_MEMORY_SAMPLE_TTL_MS = 100
let availableMemorySample: { sampledAt: number; memoryMB: number } | undefined

export const getAvailableMemoryMB = () => {
  const now = Date.now()
  if (
    availableMemorySample &&
    now - availableMemorySample.sampledAt < AVAILABLE_MEMORY_SAMPLE_TTL_MS
  )
    return availableMemorySample.memoryMB

  const limit = Number(read('/sys/fs/cgroup/memory.max'))
  let memoryMB: number
  if (limit > 0) {
    const current = Number(read('/sys/fs/cgroup/memory.current'))
    const inactive = Number(
      /^inactive_file (\d+)$/m.exec(read('/sys/fs/cgroup/memory.stat'))?.[1] ??
        0
    )
    memoryMB = Math.max(0, (limit - current + inactive) / 1048576)
  } else if (process.platform === 'darwin') memoryMB = Infinity
  else {
    const availableKiB = Number(
      /^MemAvailable:\s+(\d+)/m.exec(read('/proc/meminfo'))?.[1]
    )
    memoryMB = availableKiB > 0 ? availableKiB / 1024 : os.freemem() / 1048576
  }

  availableMemorySample = { sampledAt: now, memoryMB }
  return memoryMB
}

export interface ICpuPressure {
  avg10: number
  avg60: number
}

const CPU_PRESSURE_SAMPLE_TTL_MS = 1000
let cpuPressureSample:
  | { sampledAt: number; pressure: ICpuPressure | undefined }
  | undefined

/** Read host-wide CPU stall pressure; unsupported platforms fail open. */
export const getCpuPressure = (): ICpuPressure | undefined => {
  const now = Date.now()
  if (
    cpuPressureSample &&
    now - cpuPressureSample.sampledAt < CPU_PRESSURE_SAMPLE_TTL_MS
  )
    return cpuPressureSample.pressure

  const line = /^some\s+([^\n]+)$/m.exec(read('/proc/pressure/cpu'))?.[1] ?? ''
  const avg10 = Number(/(?:^|\s)avg10=([\d.]+)/.exec(line)?.[1])
  const avg60 = Number(/(?:^|\s)avg60=([\d.]+)/.exec(line)?.[1])
  const pressure =
    Number.isFinite(avg10) && avg10 >= 0 && Number.isFinite(avg60) && avg60 >= 0
      ? { avg10, avg60 }
      : undefined

  cpuPressureSample = { sampledAt: now, pressure }
  return pressure
}
