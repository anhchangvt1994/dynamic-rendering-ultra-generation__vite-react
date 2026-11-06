// Fallbacks for what browsers only give secure contexts (https, localhost):
// crypto.randomUUID, crypto.subtle and navigator.locks are all missing when
// the dev site is opened over http on a LAN ip, e.g. from a phone.

const hex = (n) => n.toString(16).padStart(2, '0')

/** A v4 uuid: randomUUID when there is one, else from getRandomValues. */
export function randomId(c = globalThis.crypto) {
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, hex).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])
const rotr = (x, n) => (x >>> n) | (x << (32 - n))

/** SHA-256 of bytes, in plain js (for where crypto.subtle is missing). */
export function sha256(bytes) {
  const len = bytes.length
  const padded = new Uint8Array((((len + 9 + 63) >> 6) << 6))
  padded.set(bytes)
  padded[len] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 8, Math.floor(len / 0x20000000))
  view.setUint32(padded.length - 4, (len << 3) >>> 0)
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ])
  const W = new Uint32Array(64)
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4)
    for (let i = 16; i < 64; i++) {
      const a = W[i - 15]
      const b = W[i - 2]
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)
      W[i] = W[i - 16] + s0 + W[i - 7] + s1
    }
    let [a, b, c, d, e, f, g, h] = H
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0
      h = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    H[0] += a
    H[1] += b
    H[2] += c
    H[3] += d
    H[4] += e
    H[5] += f
    H[6] += g
    H[7] += h
  }
  const out = new Uint8Array(32)
  const ov = new DataView(out.buffer)
  H.forEach((v, i) => ov.setUint32(i * 4, v))
  return out
}

/** SHA-256 digest: crypto.subtle when there is one, else plain js. */
export async function digest(bytes) {
  const subtle = globalThis.crypto?.subtle
  if (subtle) return new Uint8Array(await subtle.digest('SHA-256', bytes))
  return sha256(bytes)
}

/**
 * A lock with navigator.locks' shape, held within this tab only: one holder
 * per name at a time, in request order.
 */
export function tabLock() {
  const tails = new Map()
  return (name, fn) => {
    const run = (tails.get(name) ?? Promise.resolve()).then(() => fn())
    const tail = run.catch(() => {})
    tails.set(name, tail)
    tail.then(() => tails.get(name) === tail && tails.delete(name))
    return run
  }
}

const sharedTabLock = tabLock()

/** navigator.locks when there is one, else a lock within this tab. */
export const webLock = () =>
  globalThis.navigator?.locks
    ? (name, fn) => globalThis.navigator.locks.request(name, fn)
    : sharedTabLock
