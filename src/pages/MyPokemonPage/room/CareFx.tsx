import type { CSSProperties } from 'react'
import DishArt from 'pages/KitchenPage/DishArt'
import { STATS } from 'pages/KitchenPage/kitchen.mjs'
import type { DishView } from 'pages/KitchenPage/engine/types'

export type FxKind = 'feed' | 'bathe' | 'pet' | 'angry'
export type Fx = {
  n: number
  kind: FxKind
  /** affection won by this care */
  gain: number
  taste?: 'liked' | 'disliked' | 'neutral'
  dish?: DishView
}

/** the need each care fills, for the ring that flashes */
export const NEED_OF: Record<FxKind, 'hunger' | 'clean' | 'fun' | null> = {
  feed: 'hunger',
  bathe: 'clean',
  pet: 'fun',
  angry: null,
}

type Part = {
  p: 'heart' | 'spark' | 'bubble' | 'drop' | 'crumb' | 'puff' | 'anger'
  /** where it ends, then where it starts, in the circle's radius */
  x: number
  y: number
  x0?: number
  y0?: number
  s: number
  d: number
  r?: number
  c?: string
  t?: number
}

const round = (v: number) => Math.round(v * 1000) / 1000

/** n parts fanned between two angles (degrees, 0 = right, -90 = up) */
const fan = (
  n: number,
  from: number,
  to: number,
  dist: number[],
  make: (i: number, angle: number) => Omit<Part, 'x' | 'y'>
): Part[] =>
  Array.from({ length: n }, (_, i) => {
    const angle = from + ((to - from) * i) / Math.max(1, n - 1)
    const d = dist[i % dist.length]
    const rad = (angle * Math.PI) / 180
    return {
      x: round(Math.cos(rad) * d),
      y: round(Math.sin(rad) * d),
      ...make(i, angle),
    }
  })

const PINKS = ['#ff4f8b', '#ff9cc2', '#ff2d6f', '#ffc2d9']
const WATER = ['#1e8fff', '#7cc7ff', '#4fd1ff']

const HEARTS = fan(9, -165, -15, [1.3, 1.7, 1.1], (i) => ({
  p: 'heart',
  s: [1, 1.5, 0.8, 1.25, 1.1][i % 5],
  d: i * 40,
  r: [-18, 12, -8, 20, -14][i % 5],
  c: PINKS[i % PINKS.length],
}))
const SPARKS = (n: number, delay: number, dist = 1.2) =>
  fan(n, -160, 160, [dist, dist * 1.15], (i) => ({
    p: 'spark',
    s: [0.6, 0.4, 0.5][i % 3],
    d: delay + i * 45,
    r: i * 40,
  }))
const BUBBLES: Part[] = Array.from({ length: 12 }, (_, i) => {
  const x0 = round((((i * 5) % 12) / 11) * 1.5 - 0.75)
  return {
    p: 'bubble',
    x0,
    y0: round(0.45 + (i % 3) * 0.12),
    x: round(x0 + [0.18, -0.15, 0.1, -0.2][i % 4]),
    y: round(-1.45 - (i % 4) * 0.18),
    s: [0.7, 1.15, 0.5, 0.95, 1.35, 0.6][i % 6],
    d: ((i * 7) % 12) * 55,
    t: 1300 + (i % 3) * 220,
  }
})
const DROPS = fan(8, -165, -15, [1.25, 1.55], (i, angle) => ({
  p: 'drop',
  s: [0.5, 0.38][i % 2],
  d: 40 + i * 25,
  r: angle + 90,
  c: WATER[i % WATER.length],
}))
const ANGER = fan(3, -140, -40, [1.05], (i) => ({
  p: 'anger',
  s: 1.1,
  d: i * 90,
}))

function partsOf(fx: Fx): Part[] {
  if (fx.kind === 'pet') return [...HEARTS, ...SPARKS(6, 160)]
  if (fx.kind === 'bathe')
    return [...BUBBLES, ...DROPS, ...SPARKS(5, 900, 0.95)]
  if (fx.kind === 'angry') return ANGER
  const top = fx.dish?.top ?? []
  const colors = [
    STATS[top[0] ?? 'friendship'].color,
    STATS[top[1] ?? top[0] ?? 'friendship'].color,
    '#ff7a1a',
    '#ffd447',
  ]
  const crumbs = fan(12, 0, 330, [1.05, 1.4, 1.2], (i) => ({
    p: 'crumb',
    s: [0.5, 0.38, 0.62][i % 3],
    d: 560 + i * 12,
    r: i * 47,
    c: colors[i % colors.length],
  }))
  if (fx.taste === 'disliked')
    return [
      ...crumbs.slice(0, 6),
      ...fan(5, -160, -20, [0.95, 1.2], (i) => ({
        p: 'puff',
        s: [1.2, 0.9][i % 2],
        d: 600 + i * 40,
        c: '#9aa3b2',
      })),
    ]
  return [
    ...crumbs,
    ...SPARKS(5, 620),
    ...(fx.taste === 'liked'
      ? fan(5, -140, -40, [1.45], (i) => ({
          p: 'heart',
          s: [1.2, 0.9, 1.4][i % 3],
          d: 700 + i * 50,
          r: [-12, 10, -6][i % 3],
          c: PINKS[i % PINKS.length],
        }))
      : []),
  ]
}

function gainText(fx: Fx) {
  if (fx.kind === 'angry') return 'Đủ rồi! 💢'
  if (fx.taste === 'disliked') return 'Không hợp vị…'
  const plus = fx.gain > 0 ? `+${fx.gain} ♥` : ''
  if (fx.taste === 'liked') return `Món ruột! ${plus}`
  return plus
}

/**
 * What a care looks like, played once over the circle: a shock ring in the
 * care's colour, then its own burst (a dish gulped and crumbs, soap bubbles
 * and a sheen, a fan of hearts), and what it won. Purely decorative; under
 * reduced motion only the words fade in and out (styles).
 */
export default function CareFx({ fx, radius }: { fx: Fx; radius: number }) {
  const text = gainText(fx)
  return (
    <span
      className="rm-fx"
      data-fx={fx.kind}
      data-taste={fx.taste}
      aria-hidden="true"
    >
      <i className="rm-fx-wave" />
      <i className="rm-fx-wave" />
      {fx.kind === 'bathe' && <i className="rm-fx-sheen" />}
      {fx.kind === 'feed' && fx.dish && (
        <span className="rm-fx-dish">
          <DishArt
            kind={fx.dish.kind}
            top={fx.dish.top}
            size={Math.round(radius * 0.62)}
          />
        </span>
      )}
      {partsOf(fx).map((part, i) => (
        <i
          key={i}
          className="rm-fx-p"
          data-p={part.p}
          style={
            {
              '--x': part.x,
              '--y': part.y,
              '--x0': part.x0 ?? 0,
              '--y0': part.y0 ?? -0.1,
              '--s': part.s,
              '--d': `${part.d}ms`,
              '--r': `${part.r ?? 0}deg`,
              '--c': part.c,
              '--t': part.t ? `${part.t}ms` : undefined,
            } as CSSProperties
          }
        >
          {part.p === 'heart' ? '♥' : part.p === 'anger' ? '💢' : null}
        </i>
      ))}
      {text && <b className="rm-fx-gain">{text}</b>}
    </span>
  )
}
