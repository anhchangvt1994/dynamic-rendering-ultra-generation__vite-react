import { useEffect, useRef, useState } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'

// Decorative paper lanterns under an awning; sway, candle flicker and glow live in styles.hub.
// Per lantern: --hue (paper tone), --cord (string px), --d/--a (sway), --fd (flicker period, uneven).
const LANTERNS = [
  { id: 25, hue: 40, cord: 6, d: 6.2, a: 3.2, fd: 1.45 },
  { id: 133, hue: 28, cord: 6, d: 7.4, a: 2.6, fd: 2.05 },
  { id: 39, hue: 46, cord: 5, d: 5.8, a: 3.6, fd: 1.7 },
  { id: 54, hue: 34, cord: 4, d: 6.8, a: 2.8, fd: 1.25 },
  { id: 143, hue: 22, cord: 5, d: 7.8, a: 3.0, fd: 2.3 },
  { id: 175, hue: 44, cord: 8, d: 6.0, a: 2.4, fd: 1.9 },
  { id: 151, hue: 36, cord: 6, d: 7.0, a: 3.4, fd: 1.55 },
]
const POOL = [
  1, 4, 7, 25, 35, 39, 52, 54, 58, 63, 79, 92, 94, 113, 131, 133, 143, 147, 151, 152, 175, 183, 196, 197, 245, 252,
  258, 261, 300, 359, 393, 417, 447, 448, 470, 471, 490, 658, 700, 778,
]
const SWAP_MS = 440
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Lantern({ l, i, shown }: { l: (typeof LANTERNS)[number]; i: number; shown: number[] }) {
  const [id, setId] = useState(l.id)
  const [hide, setHide] = useState(false)
  const count = useRef(0)
  const goal = useRef(4 + Math.floor(Math.random() * 2))
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  // each flicker cycle of the halo counts; every 4-5th one swaps the Pokémon
  const onFlicker = () => {
    if (reduced() || ++count.current < goal.current) return
    count.current = 0
    goal.current = 4 + Math.floor(Math.random() * 2)
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
      style={{
        ['--i' as string]: i,
        ['--hue' as string]: l.hue,
        ['--cord' as string]: `${l.cord}px`,
        ['--d' as string]: `${l.d}s`,
        ['--a' as string]: `${l.a}deg`,
        ['--fd' as string]: `${l.fd}s`,
      }}
    >
      <i className="hub-lamp-halo" onAnimationIteration={onFlicker} />
      <span className="hub-lamp">
        <img
          src={getPokemonImage(id)}
          alt=""
          draggable={false}
          loading="lazy"
          data-hide={hide || undefined}
          onLoad={() => setHide(false)}
        />
      </span>
    </li>
  )
}

export default function Bulbs() {
  const shown = useRef<number[]>(LANTERNS.map(l => l.id)).current
  return (
    <div className="hub-bulbs" aria-hidden="true">
      <span className="hub-bulbs-eave" />
      <ol>
        {LANTERNS.map((l, i) => (
          <Lantern key={i} l={l} i={i} shown={shown} />
        ))}
      </ol>
    </div>
  )
}
