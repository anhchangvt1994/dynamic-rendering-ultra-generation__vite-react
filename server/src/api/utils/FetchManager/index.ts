import Console from '../../../utils/ConsoleHandler'
import {
  fetchData as fetchDataInThread,
  refreshData as refreshDataInThread,
} from './utils'

// NOTE - Identical GET requests to the upstream API running at the same time
// share one fetch
const inflightFetches = new Map<string, ReturnType<typeof fetchDataInThread>>()

export const fetchData = async (
  input: RequestInfo | URL,
  init?: Parameters<typeof fetchDataInThread>[1]
): Promise<{
  status: number
  data: any
  compressData: any
  cookies?: string[]
  message?: string
}> => {
  if (!input) {
    Console.error('input is required!')
    return {
      status: 500,
      data: {},
      compressData: {},
      message: 'input is required',
    }
  }

  // NOTE - fetch is async I/O: it runs in this thread. In the worker pool, the
  // response (up to hundreds of KB) was copied between threads twice
  const method = (init?.method || 'GET').toUpperCase()
  if (
    method !== 'GET' ||
    init?.body ||
    init?.signal ||
    input instanceof Request
  )
    return fetchDataInThread(input, init)

  // Requests with different credentials/languages must never share a result.
  const headers = [...new Headers(init?.headers).entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )
  const key = JSON.stringify([String(input), headers, init?.timeout])
  const inflightFetch = inflightFetches.get(key)
  if (inflightFetch) return inflightFetch

  const newFetch = fetchDataInThread(input, init).finally(() =>
    inflightFetches.delete(key)
  )
  inflightFetches.set(key, newFetch)

  return newFetch
} // fetchData

export const refreshData = async (cacheKeyList: string[]) => {
  if (!cacheKeyList || !cacheKeyList.length) {
    Console.error('cacheKeyList is required!')
    return
  }

  // HTTP I/O is asynchronous. A second worker pool only duplicates the heap
  // and upstream connection pools without increasing network concurrency.
  return refreshDataInThread(cacheKeyList)
} // refreshData
