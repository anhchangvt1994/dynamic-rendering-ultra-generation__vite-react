"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * NOTE - In memory cache (LRU + TTL) of one server process
 * Hot responses (pages, API data) are served from memory instead of being
 * read / decompressed / compressed again on every request. `wrap` also
 * merges concurrent loads of the same key (only one load runs).
 */











const MemoryCache = (options




) => {
  const entries = new Map


()
  const loading = new Map()
  let bytes = 0
  const remove = (key) => {
    const entry = entries.get(key)
    if (entry) bytes -= entry.bytes
    entries.delete(key)
  }
  const prune = () => {
    const now = Date.now()
    for (const [key, entry] of entries) if (entry.expiresAt <= now) remove(key)
  }
  // A TTL must also release cold entries that are never requested again.
  _optionalChain([setInterval, 'call', _ => _(prune, Math.max(50, Math.min(options.ttlMs, 5000))), 'access', _2 => _2.unref, 'optionalCall', _3 => _3()])

  const _get = (key) => {
    const entry = entries.get(key)
    if (!entry) return

    if (entry.expiresAt <= Date.now()) {
      remove(key)
      return
    }

    // NOTE - Map keeps the insertion order: move the key to the end (LRU)
    entries.delete(key)
    entries.set(key, entry)

    return entry.value
  } // _get

  const _set = (key, value, ttlMs = options.ttlMs) => {
    prune()
    remove(key)
    const entryBytes = options.maxBytes
      ? (_nullishCoalesce(_optionalChain([options, 'access', _4 => _4.sizeOf, 'optionalCall', _5 => _5(value)]), () => (
        Buffer.byteLength(_nullishCoalesce(JSON.stringify(value), () => ( ''))))))
      : 0
    if (entryBytes > (_nullishCoalesce(options.maxBytes, () => ( Infinity))) || ttlMs <= 0) return
    entries.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      bytes: entryBytes,
    })
    bytes += entryBytes
    while (entries.size > options.max || bytes > (_nullishCoalesce(options.maxBytes, () => ( Infinity))))
      remove(entries.keys().next().value )
  } // _set

  const _wrap = async (
    key,
    load,
    ttlMs
  ) => {
    const value = _get(key)
    if (value !== undefined) return value

    const currentLoad = loading.get(key)
    if (currentLoad) return currentLoad

    const newLoad = load()
      .then((result) => {
        if (result !== undefined) _set(key, result, ttlMs)
        return result
      })
      .finally(() => loading.delete(key))

    loading.set(key, newLoad)

    return newLoad
  } // _wrap

  return {
    get: _get,
    set: _set,
    delete: remove,
    wrap: _wrap,
  }
}

exports. default = MemoryCache
