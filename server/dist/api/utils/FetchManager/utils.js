"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _undici = require('undici');
var _ConsoleHandler = require('../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('../../../utils/InitEnv');
var _PathHandler = require('../../../utils/PathHandler');





var _utils = require('../CacheManager/utils');

const dataPath = _PathHandler.getDataPath.call(void 0, )

// NOTE - Keep the connections to the upstream APIs open while they are idle.
// The default keep-alive of fetch (undici) is 4s: the first request after a
// pause of a few seconds (ex: a user changes the pokemon slides, stops, then
// changes again) opened a new connection (DNS + TCP + TLS handshakes, +100ms
// up to several hundreds of ms far from the API)
const UPSTREAM_KEEP_ALIVE =
  Number(_InitEnv.PROCESS_ENV.UPSTREAM_KEEP_ALIVE_MS) || 60 * 1000

const upstreamAgent = new (0, _undici.Agent)({
  connections: Math.max(
    1,
    Math.min(32, Number(_InitEnv.PROCESS_ENV.UPSTREAM_CONNECTIONS) || 8)
  ),
  pipelining: 1,
  keepAliveTimeout: UPSTREAM_KEEP_ALIVE,
  keepAliveMaxTimeout: Math.max(UPSTREAM_KEEP_ALIVE, 10 * 60 * 1000),
})

 const fetchData = async (
  input,
  init






) => {
  if (!input)
    return {
      status: 500,
      data: {},
      compressData: {},
      message: 'URL is required',
    }

  const controller = new AbortController()
  const callerSignal =
    _nullishCoalesce(_optionalChain([init, 'optionalAccess', _ => _.signal]), () => ( (input instanceof Request ? input.signal : undefined)))
  const cancel = () => controller.abort(_optionalChain([callerSignal, 'optionalAccess', _2 => _2.reason]))
  if (_optionalChain([callerSignal, 'optionalAccess', _3 => _3.aborted])) cancel()
  else _optionalChain([callerSignal, 'optionalAccess', _4 => _4.addEventListener, 'call', _5 => _5('abort', cancel, { once: true })])

  let timedOut = false
  const timeout =
    _nullishCoalesce(_optionalChain([init, 'optionalAccess', _6 => _6.timeout]), () => ( (Number(_InitEnv.PROCESS_ENV.UPSTREAM_TIMEOUT_MS) || 10000)))
  const timer =
    timeout === 'infinite'
      ? undefined
      : setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeout)

  try {
    const headers = new Headers(
      _nullishCoalesce(_optionalChain([init, 'optionalAccess', _7 => _7.headers]), () => ( (input instanceof Request ? input.headers : undefined)))
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
    const { timeout: ignoredTimeout, ...requestInit } = _nullishCoalesce(init, () => ( {}))
    const response = await fetch(input, {
      ...requestInit,
      headers,
      signal: controller.signal,
      dispatcher: upstreamAgent,
    } )
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
    if (!controller.signal.aborted) _ConsoleHandler2.default.error(error)
    return {
      status: timedOut ? 408 : 500,
      data: {},
      compressData: {},
      message: timedOut ? 'Request Timeout' : 'Server Error',
    }
  } finally {
    clearTimeout(timer)
    _optionalChain([callerSignal, 'optionalAccess', _8 => _8.removeEventListener, 'call', _9 => _9('abort', cancel)])
  }
}; exports.fetchData = fetchData // fetchData

 const refreshData = async (cacheKeyList) => {
  if (!_optionalChain([cacheKeyList, 'optionalAccess', _10 => _10.length])) return
  const keys = [...new Set(cacheKeyList)]
  let next = 0
  const refresh = async () => {
    while (next < keys.length) {
      const key = keys[next++]
      const apiCache = await _utils.get.call(void 0, dataPath, key, 'br')
      if (!_optionalChain([apiCache, 'optionalAccess', _11 => _11.cache]) || !apiCache.url) continue
      await _utils.updateStatus.call(void 0, dataPath, key, 'br', 'fetch')
      const result = await exports.fetchData.call(void 0, apiCache.url , {
        method: apiCache.method,
        headers: apiCache.headers,
        body: apiCache.body,
      })
      const cached = apiCache.cache 



      // A failed refresh retains an existing successful response and still
      // completes, rather than leaving an unresolved promise behind.
      if (result.status === 200 || !cached || cached.status !== 200) {
        await _utils.set.call(void 0, dataPath, key, 'br', {
          url: apiCache.url ,
          method: apiCache.method ,
          body: apiCache.body,
          headers: apiCache.headers,
          cache: { expiredTime: _optionalChain([cached, 'optionalAccess', _12 => _12.expiredTime]), ...result },
        })
      }
      await _utils.updateStatus.call(void 0, dataPath, key, 'br', 'ready')
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, keys.length) }, refresh))
  return 'finish'
}; exports.refreshData = refreshData // refreshData
