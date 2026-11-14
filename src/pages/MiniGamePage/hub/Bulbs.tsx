import { useEffect, useRef, useState } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'

// Festival light string: three swags of glass orbs, each holding a Pokémon.
// Per orb: --x (% along the rail), --t (0..1 depth on the swag), --hue, --d/--a (sway), --cord.
// A rainbow chase runs along the string; every few chase cycles an orb swaps its Pokémon.
const SWAGS = 3
const PER = 5
const START = [25, 133, 39, 54, 143, 175, 151, 94, 6, 150, 197, 249, 448, 282, 59]
const POOL = [
  1, 4, 7, 25, 35, 39, 52, 54, 58, 63, 79, 92, 94, 113, 131, 133, 143, 147, 151, 152, 175, 183, 196, 197, 245, 252,
  258, 261, 300, 359, 393, 417, 447, 448, 470, 471, 490, 658, 700, 778,
]
const ORBS = Array.from({ length: SWAGS * PER }, (_, i) => {
  const s = Math.floor(i / PER)
  const j = i % PER
  const u = (j + 1) / (PER + 1)
  return {
    id: START[i],
    x: ((s + u) / SWAGS) * 100,
    t: 4 * u * (1 - u),
    hue: (338 + i * 24) % 360,
    cord: 5 + ((i * 7) % 5),
    d: 4.6 + ((i * 13) % 17) / 6,
    a: 3 + ((i * 5) % 7) / 2,
    extra: j % 2 === 1,
  }
})
const SWAP_MS = 420
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Orb({ o, i, shown }: { o: (typeof ORBS)[number]; i: number; shown: number[] }) {
  const [id, setId] = useState(o.id)
  const [hide, setHide] = useState(false)
  const count = useRef(0)
  const goal = useRef(3 + (i % 2))
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const onCycle = () => {
    if (reduced() || ++count.current < goal.current) return
    count.current = 0
    goal.current = 3 + Math.floor(Math.random() * 2)
    setHide(true)
    timer.current = setTimeout(() => {
      const free = POOL.filter(p => p !== id && !shown.includes(p))
      setId(free[Math.floor(Math.random() * free.length)] ?? id)
      timer.current = setTimeout(() => setHide(false), 700) // fallback if onLoad never fires
    }, SWAP_MS)
  }
  shown[i] = id

  return (
    <li
      data-extra={o.extra || undefined}
      style={{
        ['--i' as string]: i,
        ['--x' as string]: `${o.x.toFixed(3)}%`,
        ['--t' as string]: o.t.toFixed(3),
        ['--hue' as string]: o.hue,
        ['--cord' as string]: `${o.cord}px`,
        ['--d' as string]: `${o.d.toFixed(2)}s`,
        ['--a' as string]: `${o.a}deg`,
      }}
    >
      <span className="hub-swing">
        <i className="hub-orb-glow" onAnimationIteration={onCycle} />
        <b className="hub-orb-cord" />
        <span className="hub-orb">
          <img
            src={getPokemonImage(id)}
            alt=""
            draggable={false}
            loading="lazy"
            data-hide={hide || undefined}
            onLoad={() => setHide(false)}
          />
        </span>
        <em className="hub-orb-spark" />
      </span>
    </li>
  )
}

const SAG = 34
const PATH = Array.from({ length: SWAGS }, (_, s) => {
  const a = (s / SWAGS) * 100
  const b = ((s + 1) / SWAGS) * 100
  return `${s ? '' : `M${a} 0 `}Q${((a + b) / 2).toFixed(3)} ${SAG * 2} ${b.toFixed(3)} 0`
}).join(' ')

export default function Bulbs() {
  const shown = useRef<number[]>(START.slice()).current
  return (
    <div className="hub-bulbs" aria-hidden="true">
      <span className="hub-aurora" />
      <span className="hub-rail" />
      <svg className="hub-wire" viewBox={`0 0 100 ${SAG + 2}`} preserveAspectRatio="none">
        <path className="hub-wire-base" d={PATH} vectorEffect="non-scaling-stroke" />
        <path className="hub-wire-run" d={PATH} vectorEffect="non-scaling-stroke" />
      </svg>
      <ol>
        {ORBS.map((o, i) => (
          <Orb key={i} o={o} i={i} shown={shown} />
        ))}
      </ol>
    </div>
  )
}
