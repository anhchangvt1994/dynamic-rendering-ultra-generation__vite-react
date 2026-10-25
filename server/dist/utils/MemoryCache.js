"use strict";Object.defineProperty(exports, "__esModule", {value: true});/**
 * NOTE - In memory cache (LRU + TTL) of one server process
 * Hot responses (pages, API data) are served from memory instead of being
 * read / decompressed / compressed again on every request. `wrap` also
 * merges concurrent loads of the same key (only one load runs).
 */











const MemoryCache = (options


) => {
  const entries = new Map()
  const loading = new Map()

  const _get = (key) => {
    const entry = entries.get(key)
    if (!entry) return

    if (entry.expiresAt <= Date.now()) {
      entries.delete(key)
      return
    }

    // NOTE - Map keeps the insertion order: move the key to the end (LRU)
    entries.delete(key)
    entries.set(key, entry)

    return entry.value
  } // _get

  const _set = (key, value, ttlMs = options.ttlMs) => {
    entries.delete(key)
    entries.set(key, { value, expiresAt: Date.now() + ttlMs })

    if (entries.size > options.max)
      entries.delete(entries.keys().next().value )
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
    delete: (key) => entries.delete(key),
    wrap: _wrap,
  }
}

exports. default = MemoryCache
