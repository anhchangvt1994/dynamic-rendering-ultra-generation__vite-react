// Pokémon the reader opened recently (newest first, max 10), in
// localStorage. Every access is guarded like the caught store.
const KEY = 'pokedex:recent'
const MAX = 10
const listeners = new Set()
const store = () => (typeof localStorage === 'undefined' ? null : localStorage)

export function getRecent(storage = store()) {
  try {
    const list = JSON.parse(storage?.getItem(KEY) || '[]')
    return Array.isArray(list)
      ? list
          .filter(
            (item) =>
              item && Number.isInteger(item.id) && typeof item.name === 'string'
          )
          .slice(0, MAX)
      : []
  } catch {
    return []
  }
}

/** Moves (or adds) { id, name } to the front. */
export function pushRecent(entry, storage = store()) {
  if (!entry || !Number.isInteger(entry.id) || !entry.name) return
  const list = [
    entry,
    ...getRecent(storage).filter((item) => item.name !== entry.name),
  ].slice(0, MAX)
  try {
    storage?.setItem(KEY, JSON.stringify(list))
  } catch {
    // full or blocked storage: nothing to remember
  }
  listeners.forEach((listener) => listener())
}

export function subscribeRecent(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
