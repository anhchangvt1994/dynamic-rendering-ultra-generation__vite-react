// "Đã bắt" — Pokémon the reader marked as caught, kept in localStorage.
// Every access is guarded: storage can be missing (SSR), blocked or full.

const KEY = 'pokedex:caught'
const listeners = new Set()

const read = (storage) => {
  try {
    const ids = JSON.parse(storage?.getItem(KEY) || '[]')
    return new Set(Array.isArray(ids) ? ids.filter(Number.isInteger) : [])
  } catch {
    return new Set()
  }
}

const store = () => (typeof localStorage === 'undefined' ? null : localStorage)

export function getCaught(storage = store()) {
  return read(storage)
}

export function isCaught(id, storage = store()) {
  return read(storage).has(id)
}

/** Flips one id; returns whether it is now caught. */
export function toggleCaught(id, storage = store()) {
  const ids = read(storage)
  const caught = !ids.has(id)
  if (caught) ids.add(id)
  else ids.delete(id)
  try {
    storage?.setItem(KEY, JSON.stringify([...ids].sort((a, b) => a - b)))
  } catch {
    // quota or privacy mode: the toggle still works for this page view
  }
  listeners.forEach((listener) => listener())
  return caught
}

/** For useSyncExternalStore: notified on every toggle in this tab. */
export function subscribeCaught(listener) {
  listeners.add(listener)
  const onStorage = (event) => event.key === KEY && listener()
  if (typeof window !== 'undefined')
    window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined')
      window.removeEventListener('storage', onStorage)
  }
}
