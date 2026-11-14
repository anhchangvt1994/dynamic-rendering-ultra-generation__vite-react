import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { createBoard, deal, findPath, removePair } from '../../games/tile-safari/rules.mjs'
import { useDemoClock } from './useDemoClock'

const COLS = 6
const ROWS = 6
const KINDS = [25, 4, 7, 133, 39, 1, 150, 6, 94]
// A seeded, always solvable deal; the demo plays the first pairs it can join, bent paths first.
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const plan = (tiles: number[]) => {
  let s = createBoard({ rows: ROWS, cols: COLS, tiles, removed: [] })
  const out: { a: number; b: number; path: number[][] }[] = []
  while (out.length < 8) {
    let best: { a: number; b: number; path: number[][] } | null = null
    for (let a = 0; a < tiles.length; a++)
      for (let b = a + 1; b < tiles.length; b++) {
        if (s.removed.includes(a) || s.removed.includes(b) || tiles[a] !== tiles[b]) continue
        const path = findPath(s, a, b)
        if (path && (!best || path.length > best.path.length)) best = { a, b, path }
      }
    if (!best) break
    s = removePair(s, best.a, best.b)
    out.push(best)
  }
  return out
}
const { TILES, PAIRS } = (() => {
  for (let seed = 1; ; seed++) {
    const tiles = deal(1, KINDS, rng(seed)).tiles
    const pairs = plan(tiles)
    if (pairs.length === 8 && pairs.some((p) => p.path.length > 2)) return { TILES: tiles, PAIRS: pairs }
  }
})()
const PHASES = 4

/** Attract demo of Chọn cặp: select, beam along a bent path, shatter, combo. Mirrors the real board. */
export default function TileScreen({ active }: { active: boolean }) {
  const step = useDemoClock(PAIRS.length * PHASES + 2, 420, active)
  const idx = Math.min(PAIRS.length - 1, Math.floor(step / PHASES))
  const phase = step >= PAIRS.length * PHASES ? -1 : step % PHASES
  const gone = new Set(PAIRS.slice(0, phase === -1 ? PAIRS.length : idx).flatMap((p) => [p.a, p.b]))
  const cur = phase === -1 ? null : PAIRS[idx]
  const d = cur ? `M${cur.path.map(([r, c]) => `${(c + 0.5) * 100},${(r + 0.5) * 100}`).join(' L')}` : ''
  const mid = cur ? cur.path[Math.floor(cur.path.length / 2)] : null
  return (
    <div className="ts" aria-hidden="true">
      <div className="ts-grid">
        {TILES.map((face, i) => {
          const isCur = cur && (i === cur.a || i === cur.b)
          const pop = phase === 3 && isCur
          return (
            <i
              key={`${i}-${idx}`}
              className="ts-tile"
              data-gone={gone.has(i) || undefined}
              data-sel={(phase === 0 && cur?.a === i) || (phase >= 1 && phase <= 2 && isCur) || undefined}
              data-echo={phase === 0 && cur && i !== cur.a && !gone.has(i) && TILES[i] === TILES[cur.a] ? true : undefined}
              data-pop={pop || undefined}
            >
              {!pop && <img src={getPokemonImage(face)} alt="" draggable={false} />}
              {pop && (
                <span className="ts-fx">
                  <u />
                  {Array.from({ length: 8 }, (_, k) => (
                    <b key={k} style={{ ['--a' as string]: `${k * 45 + (i % 5) * 9}deg`, ['--h' as string]: `${(k * 53 + 40) % 360}` }} />
                  ))}
                </span>
              )}
            </i>
          )
        })}
        {cur && (phase === 2 || phase === 3) && (
          <svg className="ts-line" data-out={phase === 3 || undefined} viewBox={`0 0 ${COLS * 100} ${ROWS * 100}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="ts-beam" x1="0" x2="1">
                <stop offset="0" stopColor="#7dffea" />
                <stop offset=".5" stopColor="#fff08a" />
                <stop offset="1" stopColor="#ff9be0" />
              </linearGradient>
            </defs>
            <path className="g" d={d} pathLength={1} />
            <path className="b" d={d} pathLength={1} />
            {phase === 2 && (
              <circle r="15" className="o">
                <animateMotion dur="0.3s" fill="freeze" path={d} />
              </circle>
            )}
          </svg>
        )}
        {phase === 3 && idx > 0 && mid && (
          <span className="ts-combo" style={{ left: `${((mid[1] + 0.5) / COLS) * 100}%`, top: `${((mid[0] + 0.5) / ROWS) * 100}%` }}>
            Combo ×{idx + 1}
          </span>
        )}
      </div>
    </div>
  )
}
