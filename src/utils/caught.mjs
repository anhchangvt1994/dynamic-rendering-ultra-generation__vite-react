// Persistent caught marks, with an in-memory fallback when browser storage is
// unavailable. The same store powers detail actions and the collection view.
const KEY = 'pokedex:caught'
const listeners = new Set()
const fallbacks = new WeakMap()
const unavailable = {}
const supported = (id) => Number.isInteger(id) && id >= 1 && id <= 1025
const store = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
const read = (storage) => {
  const fallback = fallbacks.get(storage || unavailable)
  if (fallback) return new Set(fallback)
  try {
    const ids = JSON.parse(storage?.getItem(KEY) || '[]')
    return new Set(Array.isArray(ids) ? ids.filter(supported) : [])
  } catch {
    return new Set()
  }
}
export function getCaught(storage = store()) {
  return read(storage)
}
export function isCaught(id, storage = store()) {
  return read(storage).has(id)
}
const write = (ids, storage) => {
  try {
    if (!storage) throw new Error('Storage unavailable')
    storage.setItem(KEY, JSON.stringify([...ids].sort((a, b) => a - b)))
    fallbacks.delete(storage)
  } catch {
    fallbacks.set(storage || unavailable, ids)
  }
  listeners.forEach((listener) => listener())
}
export function toggleCaught(id, storage = store()) {
  if (!supported(id)) return false
  const ids = read(storage)
  const caught = !ids.has(id)
  caught ? ids.add(id) : ids.delete(id)
  write(ids, storage)
  return caught
}
// the whole collection at once (an account's, after signing in or out)
export function replaceCaught(ids, storage = store()) {
  write(new Set([...ids].filter(supported)), storage)
}
export function subscribeCaught(listener) {
  listeners.add(listener)
  const onStorage = (event) => {
    if (event.key !== KEY && event.key !== null) return
    const storage = store()
    if (storage) fallbacks.delete(storage)
    listener()
  }
  if (typeof window !== 'undefined')
    window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined')
      window.removeEventListener('storage', onStorage)
  }
}
