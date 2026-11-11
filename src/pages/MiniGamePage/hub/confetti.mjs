// mulberry32: a small deterministic PRNG so a result screen replays the same burst per seed.
function rng(seed) {
  let a = (Number.isFinite(seed) ? seed : 0) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Confetti pieces for a seed: x %, delay/dur ms, rotation deg, hue, size px. */
export function confettiPieces(seed, count) {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const r = rng(seed)
  return Array.from({ length: n }, () => ({
    x: Math.round(r() * 100),
    delay: Math.round(r() * 400),
    dur: 900 + Math.round(r() * 900),
    rot: Math.round(r() * 720 - 360),
    hue: Math.floor(r() * 360),
    size: 6 + Math.round(r() * 6),
  }))
}
