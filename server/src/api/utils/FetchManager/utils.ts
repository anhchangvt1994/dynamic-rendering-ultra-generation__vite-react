import { Agent } from 'undici'
import Console from '../../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { getDataPath } from '../../../utils/PathHandler'
import { ICacheResult } from '../CacheManager/types'
import {
  get as getDataCache,
  set as setDataCache,
  updateStatus as updateDataCacheStatus,
} from '../CacheManager/utils'

const dataPath = getDataPath()

// NOTE - Keep the connections to the upstream APIs open while they are idle.
// The default keep-alive of fetch (undici) is 4s: the first request after a
// pause of a few seconds (ex: a user changes the pokemon slides, stops, then
// changes again) opened a new connection (DNS + TCP + TLS handshakes, +100ms
// up to several hundreds of ms far from the API)
const UPSTREAM_KEEP_ALIVE =
  Number(PROCESS_ENV.UPSTREAM_KEEP_ALIVE_MS) || 60 * 1000

const upstreamAgent = new Agent({
  connections: Math.max(
    1,
    Math.min(32, Number(PROCESS_ENV.UPSTREAM_CONNECTIONS) || 8)
  ),
  pipelining: 1,
  keepAliveTimeout: UPSTREAM_KEEP_ALIVE,
  keepAliveMaxTimeout: Math.max(UPSTREAM_KEEP_ALIVE, 10 * 60 * 1000),
})

export const fetchData = async (
  input: RequestInfo | URL,
  init?: RequestInit & { timeout?: number | 'infinite' }
): Promise<{
  status: number
  data: any
  compressData: any
  cookies?: string[]
  message?: string
}> => {
  if (!input)
    return {
      status: 500,
      data: {},
      compressData: {},
      message: 'URL is required',
    }

  const controller = new AbortController()
  const callerSignal =
    init?.signal ?? (input instanceof Request ? input.signal : undefined)
  const cancel = () => controller.abort(callerSignal?.reason)
  if (callerSignal?.aborted) cancel()
  else callerSignal?.addEventListener('abort', cancel, { once: true })

  let timedOut = false
  const timeout =
    init?.timeout ?? (Number(PROCESS_ENV.UPSTREAM_TIMEOUT_MS) || 10000)
  const timer =
    timeout === 'infinite'
      ? undefined
      : setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeout)

  try {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    )
    for (const key of [...headers.keys()]) {
      if (
        /referer|static-html-path|accept-encoding|connection|host|x-real-ip|x-forwarded-|sec-fetch-|priority|cookie/.test(
          key
        )
      )
        headers.delete(key)
    }
    headers.set('accept-encoding', 'gzip, deflate, br')
    const { timeout: ignoredTimeout, ...requestInit } = init ?? {}
    const response = await fetch(input, {
      ...requestInit,
      headers,
      signal: controller.signal,
      dispatcher: upstreamAgent,
    } as RequestInit)
    // Keep the timeout armed through body consumption, not just headers.
    const data = await response.text()
    return {
      status: response.status,
      message: response.statusText,
      cookies: response.headers.getSetCookie(),
      data,
      compressData: {},
    }
  } catch (error) {
    if (!controller.signal.aborted) Console.error(error)
    return {
      status: timedOut ? 408 : 500,
      data: {},
      compressData: {},
      message: timedOut ? 'Request Timeout' : 'Server Error',
    }
  } finally {
    clearTimeout(timer)
    callerSignal?.removeEventListener('abort', cancel)
  }
} // fetchData

export const refreshData = async (cacheKeyList: string[]) => {
  if (!cacheKeyList?.length) return
  const keys = [...new Set(cacheKeyList)]
  let next = 0
  const refresh = async () => {
    while (next < keys.length) {
      const key = keys[next++]
      const apiCache = await getDataCache(dataPath, key, 'br')
      if (!apiCache?.cache || !apiCache.url) continue
      await updateDataCacheStatus(dataPath, key, 'br', 'fetch')
      const result = await fetchData(apiCache.url as string, {
        method: apiCache.method,
        headers: apiCache.headers,
        body: apiCache.body,
      })
      const cached = apiCache.cache as Exclude<
        NonNullable<ICacheResult>['cache'],
        string | Buffer | undefined
      >
      // A failed refresh retains an existing successful response and still
      // completes, rather than leaving an unresolved promise behind.
      if (result.status === 200 || !cached || cached.status !== 200) {
        await setDataCache(dataPath, key, 'br', {
          url: apiCache.url as string,
          method: apiCache.method as string,
          body: apiCache.body,
          headers: apiCache.headers,
          cache: { expiredTime: cached?.expiredTime, ...result },
        })
      }
      await updateDataCacheStatus(dataPath, key, 'br', 'ready')
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, keys.length) }, refresh))
  return 'finish'
} // refreshData
