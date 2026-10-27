/**
 * NOTE - In memory cache (LRU + TTL) of one server process
 * Hot responses (pages, API data) are served from memory instead of being
 * read / decompressed / compressed again on every request. `wrap` also
 * merges concurrent loads of the same key (only one load runs).
 */
export interface IMemoryCache<T> {
  get: (key: string) => T | undefined
  set: (key: string, value: T, ttlMs?: number) => void
  delete: (key: string) => void
  wrap: (
    key: string,
    load: () => Promise<T | undefined>,
    ttlMs?: number
  ) => Promise<T | undefined>
}

const MemoryCache = <T>(options: {
  ttlMs: number
  max: number
  maxBytes?: number
  sizeOf?: (value: T) => number
}): IMemoryCache<T> => {
  const entries = new Map<
    string,
    { value: T; expiresAt: number; bytes: number }
  >()
  const loading = new Map<string, Promise<T | undefined>>()
  let bytes = 0
  const remove = (key: string) => {
    const entry = entries.get(key)
    if (entry) bytes -= entry.bytes
    entries.delete(key)
  }
  const prune = () => {
    const now = Date.now()
    for (const [key, entry] of entries) if (entry.expiresAt <= now) remove(key)
  }
  // A TTL must also release cold entries that are never requested again.
  setInterval(prune, Math.max(50, Math.min(options.ttlMs, 5000))).unref?.()

  const _get = (key: string) => {
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

  const _set = (key: string, value: T, ttlMs = options.ttlMs) => {
    prune()
    remove(key)
    const entryBytes = options.maxBytes
      ? (options.sizeOf?.(value) ??
        Buffer.byteLength(JSON.stringify(value) ?? ''))
      : 0
    if (entryBytes > (options.maxBytes ?? Infinity) || ttlMs <= 0) return
    entries.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      bytes: entryBytes,
    })
    bytes += entryBytes
    while (entries.size > options.max || bytes > (options.maxBytes ?? Infinity))
      remove(entries.keys().next().value as string)
  } // _set

  const _wrap = async (
    key: string,
    load: () => Promise<T | undefined>,
    ttlMs?: number
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

export default MemoryCache
