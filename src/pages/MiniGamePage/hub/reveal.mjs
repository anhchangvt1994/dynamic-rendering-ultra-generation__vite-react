// Entrance animation plays once per session; never under reduced motion.
const KEY = 'mg-hub-seen'

export function shouldReveal(storage, reduced) {
  if (reduced || !storage) return false
  try {
    if (storage.getItem(KEY)) return false
    storage.setItem(KEY, '1')
    return true
  } catch {
    return false
  }
}
