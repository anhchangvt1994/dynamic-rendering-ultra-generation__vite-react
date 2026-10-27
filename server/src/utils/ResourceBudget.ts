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
  // Avoid pool fanout while overlapping network/page waits. The two-render
  // multicore floor was measured with mixed HTTP/API load; small RAM still
  // reduces it to one. An explicit override remains RAM bounded.
  const renderTotal = Math.min(
    memoryCapacity,
    positive(
      env.CRAWL_CONCURRENCY,
      Math.min(4, cpuCount >= 2 ? Math.max(2, cpuCount - 1) : 1)
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

export const getAvailableMemoryMB = () => {
  const limit = Number(read('/sys/fs/cgroup/memory.max'))
  if (limit > 0) {
    const current = Number(read('/sys/fs/cgroup/memory.current'))
    const inactive = Number(
      /^inactive_file (\d+)$/m.exec(read('/sys/fs/cgroup/memory.stat'))?.[1] ??
        0
    )
    return Math.max(0, (limit - current + inactive) / 1048576)
  }
  if (process.platform === 'darwin') return Infinity
  const availableKiB = Number(
    /^MemAvailable:\s+(\d+)/m.exec(read('/proc/meminfo'))?.[1]
  )
  return availableKiB > 0 ? availableKiB / 1024 : os.freemem() / 1048576
}
