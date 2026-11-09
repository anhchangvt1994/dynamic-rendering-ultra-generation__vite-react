// Pure timeline of the evolution effect: a 3 s light flicker followed by the
// approved 12 s water timeline (fx-combined-water) shifted by 3 s.
export const TOTAL = 15
const SHIFT = 3

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const seg = (u, a, b) => clamp((u - a) / (b - a))
const ease = (x) => x * x * (3 - 2 * x)
const out = (x) => 1 - (1 - x) ** 3

const CAPTIONS = [
  [0.2, 1.2, 'Có điều gì đó đang xảy ra…'],
  [1.2, 3.0, 'Ánh sáng dồn lại…'],
  [3.0, 4.4, 'Vòng hệ hiện ra'],
  [4.4, 6.2, 'Quét cấu trúc cơ thể'],
  [6.3, 8.0, 'Nước dậy sóng quanh nó…'],
  [8.4, 11.2, 'Tiến hoá!'],
]

/** Sprite whiteness before the evolution: 2 → 12 Hz, amplitude .25 → 1, white hold 3.0–4.4 s. */
export function flickerWeight(u, { reduced = false } = {}) {
  const envelope = u < 4.4 ? 1 : 1 - seg(u, 4.4, 5)
  if (reduced) return 0.35 * envelope
  if (u >= 5) return 0
  if (u >= 3) return envelope
  const k = seg(u, 0, 3)
  const phase = 2 * u + (10 / 6) * u * u
  const amp = 0.25 + 0.75 * ease(k)
  return amp * Math.max(0, Math.sin(2 * Math.PI * phase)) ** 0.6
}

/** Glow of an evolution-ready card: slow breath plus a double flash every 4 s. */
export function readyGlow(t, { reduced = false } = {}) {
  if (reduced) return 0.35
  const c = ((t % 4) + 4) % 4
  const f = (x) => Math.exp(-((c - x) * (c - x)) / 0.004)
  return clamp(0.3 + 0.2 * Math.sin(t * 2.2) + 0.6 * f(3.0) + 0.8 * f(3.35))
}

export function frameAt(u, { reduced = false } = {}) {
  const w = u - SHIFT
  const kUp = ease(seg(w, 1.2, 4.6))
  const kDown = 1 - out(seg(w, 5.4, 8.0))
  const k = w < 5.3 ? kUp : kDown
  const g = w < 5.3 ? ease(seg(w, 2.4, 4.9)) : 1 - ease(seg(w, 5.4, 6.8))
  const glow = Math.max(flickerWeight(u, { reduced }), g)
  const appear = seg(w, 5.2, 5.6)
  const s = seg(w, 1.7, 3.4)
  const waveOn = w > 3 && w < 5 ? seg(w, 3, 3.6) : w >= 5.3 && w < 7.4 ? 1 - seg(w, 6.6, 7.4) : 0
  const burst = !reduced
  const shardP = out(seg(w, 5.1, 6.2))
  const caption = CAPTIONS.find(([a, z]) => u >= a && u < z)

  return {
    scrim: u < 0.8 ? ease(seg(u, 0, 0.8)) : 1 - ease(seg(u, 14.2, 15)),
    oldOpacity: 1 - seg(w, 5.0, 5.3),
    newOpacity: appear,
    oldScale: 1 - 0.12 * ease(seg(w, 3.6, 5.0)),
    newScale: 0.3 + 0.7 * out(appear) + 0.12 * Math.sin(Math.PI * seg(w, 5.2, 6.0)),
    glow: reduced ? Math.min(0.6, glow * 0.6) : glow,
    halo: 0.85 * (reduced ? Math.min(0.6, glow * 0.6) : glow),
    displaceScale: reduced ? 0 : 46 * k,
    ringOpacity: ease(seg(w, 0.6, 1.4)) * (1 - seg(w, 5.0, 5.2)),
    ringRotate: u * 60,
    ringScale: w < 5 ? 1 - 0.45 * ease(seg(w, 3.6, 5.0)) : 1,
    ring2Opacity: ease(seg(w, 5.4, 6.2)),
    ring2Scale: 1 + (1 - ease(seg(w, 5.4, 6.2))) * 0.6,
    scanOn: s > 0 && s < 1 ? 1 : 0,
    scanTop: 36 + s * 45,
    orb: w > 4.7 && w < 6 ? 1 - seg(w, 5.2, 6.0) : 0,
    orbScale: 1 + out(seg(w, 4.7, 5.6)) * 6,
    rays: burst && w > 5.0 && w < 5.9 ? 0.9 * (1 - seg(w, 5.3, 5.9)) : 0,
    raysScale: out(seg(w, 5.0, 5.5)),
    shards: burst ? shardP : 0,
    flash: burst && w > 5.0 && w < 5.5 ? 0.8 * Math.sin(Math.PI * seg(w, 5.0, 5.5)) : 0,
    lift: ease(seg(w, 8.4, 9.2)),
    ticket: out(seg(w, 8.8, 9.6)),
    stamp: out(seg(w, 9.9, 10.2)),
    deltas: [0, 1, 2].map((i) => seg(w, 10.1 + i * 0.15, 10.4 + i * 0.15)),
    badge: ease(seg(w, 10.6, 10.9)),
    caption: caption ? caption[2] : '',
    waves: waveOn,
  }
}
