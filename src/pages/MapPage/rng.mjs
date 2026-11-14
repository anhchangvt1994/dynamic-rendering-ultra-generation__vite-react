/** A 32-bit seed from any mix of strings and numbers (cyrb53-style, order sensitive). */
export function hashSeed(...parts) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (const ch of parts.map((p) => `${p}`.length + ':' + p).join('|')) {
    const c = ch.charCodeAt(0)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0) ^ (h1 >>> 0)
}

/** mulberry32: a function returning [0, 1), the same sequence for the same seed. */
export function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
