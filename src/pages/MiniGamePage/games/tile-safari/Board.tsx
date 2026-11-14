import { useEffect, useRef, useState } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { createBoard, findPath, hasMove } from './rules.mjs'
import type { TileSafariView } from '../../useMiniGame'

type Props = {
  view: TileSafariView
  disabled: boolean
  remove: (a: number, b: number) => Promise<any>
  shuffle: (tiles: number[], removed: number[]) => Promise<{ tiles: number[]; shuffles: number }>
  onDone: (moves: number) => void
  onError: (error: Error) => void
}

/** Chọn cặp: pick two equal Pokémon that a line of at most two turns can join. */
export default function Board({ view, disabled, remove, shuffle, onDone, onError }: Props) {
  const [tiles, setTiles] = useState(view.tiles)
  const [removed, setRemoved] = useState(view.removed)
  const [shuffles, setShuffles] = useState(view.shuffles)
  const [selected, setSelected] = useState<number | null>(null)
  const [line, setLine] = useState<number[][] | null>(null)
  const [hint, setHint] = useState<number[] | null>(null)
  const [wrong, setWrong] = useState<number[]>([])
  const [vanishing, setVanishing] = useState<number[]>([])
  const [combo, setCombo] = useState<{ n: number; at: number[]; key: number } | null>(null)
  const lastMatch = useRef(0)
  const comboN = useRef(0)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const state = createBoard({ rows: view.rows, cols: view.cols, tiles, removed })
  const stuck = removed.length < tiles.length && !hasMove(state)
  useEffect(() => () => clearTimeout(timer.current), [])

  const flash = (cells: number[]) => {
    setWrong(cells)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setWrong([]), 420)
  }
  const tap = async (i: number) => {
    if (disabled || busy || removed.includes(i)) return
    setHint(null)
    if (selected === null) return setSelected(i)
    if (selected === i) return setSelected(null)
    const a = selected
    if (tiles[a] !== tiles[i]) {
      flash([a, i])
      return setSelected(i)
    }
    const path = findPath(state, a, i)
    if (!path) {
      flash([a, i])
      return setSelected(i)
    }
    setBusy(true)
    setLine(path)
    try {
      const [result] = await Promise.all([remove(a, i), new Promise((r) => setTimeout(r, 300))])
      const now = Date.now()
      comboN.current = now - lastMatch.current < 4500 ? comboN.current + 1 : 1
      lastMatch.current = now
      setVanishing([a, i])
      setRemoved(result.removed)
      setSelected(null)
      if (comboN.current > 1) setCombo({ n: comboN.current, at: path[Math.floor(path.length / 2)], key: now })
      timer.current = setTimeout(() => {
        setLine(null)
        setVanishing([])
      }, 720)
      if (result.done) onDone(result.moves)
    } catch (error) {
      setLine(null)
      setSelected(null)
      onError(error as Error)
    } finally {
      setBusy(false)
    }
  }
  const doShuffle = async () => {
    if (busy || disabled || shuffles <= 0) return
    setBusy(true)
    try {
      const result = await shuffle(tiles, removed)
      setTiles(result.tiles)
      setShuffles(result.shuffles)
      setSelected(null)
      setHint(null)
    } catch (error) {
      onError(error as Error)
    } finally {
      setBusy(false)
    }
  }
  const pt = (r: number, c: number) => `${(c + 0.5) * 100},${(r + 0.5) * 100}`
  const d = line ? `M${line.map(([r, c]) => pt(r, c)).join(' L')}` : ''
  const sameAsSelected = (i: number) => selected !== null && i !== selected && !removed.includes(i) && tiles[i] === tiles[selected]
  const left = tiles.length - removed.length

  return (
    <section className="tile-safari" data-stuck={stuck || undefined}>
      <div className="tile-safari-bar">
        <span>Còn <b>{left / 2}</b> cặp</span>
        <span className="tile-safari-tools">
          <button type="button" disabled={disabled || busy} onClick={() => setHint(hasMove(state))} aria-label="Gợi ý một cặp">💡 Gợi ý</button>
          <button type="button" disabled={disabled || busy || shuffles <= 0} onClick={() => void doShuffle()} aria-label={`Xáo bàn, còn ${shuffles} lần`}>🔀 Xáo ×{shuffles}</button>
        </span>
      </div>
      {stuck && <p className="tile-safari-stuck" role="status">Hết nước nối. Hãy xáo bàn!</p>}
      <div className="tile-safari-board" role="grid" aria-label="Bàn chọn cặp Pokémon" style={{ gridTemplateColumns: `repeat(${view.cols}, minmax(0, 1fr))` }}>
        {tiles.map((species, i) => {
          const gone = removed.includes(i) && !vanishing.includes(i)
          const pop = vanishing.includes(i)
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              data-gone={gone || undefined}
              data-pop={pop || undefined}
              data-echo={sameAsSelected(i) || undefined}
              data-hint={hint?.includes(i) || undefined}
              data-wrong={wrong.includes(i) || undefined}
              style={{ ['--i' as string]: i % 7 }}
              disabled={disabled || gone || pop}
              aria-hidden={gone || undefined}
              aria-label={`Ô ${Math.floor(i / view.cols) + 1}, ${(i % view.cols) + 1}`}
              aria-pressed={selected === i}
              onClick={() => void tap(i)}
            >
              {gone ? null : <img src={getPokemonImage(species)} alt="Pokémon" draggable={false} />}
              {pop && (
                <span className="tile-fx" aria-hidden="true">
                  <i className="tile-ring" />
                  {Array.from({ length: 10 }, (_, k) => (
                    <b key={k} style={{ ['--a' as string]: `${k * 36 + (i % 5) * 7}deg`, ['--r' as string]: `${34 + ((k * 13) % 22)}px`, ['--h' as string]: `${(k * 47 + 40) % 360}` }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
        {line && (
          <svg className="tile-safari-line" viewBox={`0 0 ${view.cols * 100} ${view.rows * 100}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="tile-beam" x1="0" x2="1">
                <stop offset="0" stopColor="#7dffea" />
                <stop offset="0.5" stopColor="#fff08a" />
                <stop offset="1" stopColor="#ff9be0" />
              </linearGradient>
            </defs>
            <path className="beam-glow" d={d} pathLength={1} />
            <path className="beam" d={d} pathLength={1} />
            <circle r="16" className="beam-orb">
              <animateMotion dur="0.3s" fill="freeze" path={d} />
            </circle>
          </svg>
        )}
        {combo && (
          <span
            key={combo.key}
            className="tile-combo"
            style={{ left: `${((Math.min(Math.max(combo.at[1], 0), view.cols - 1) + 0.5) / view.cols) * 100}%`, top: `${((Math.min(Math.max(combo.at[0], 0), view.rows - 1) + 0.5) / view.rows) * 100}%` }}
          >
            Combo ×{combo.n}
          </span>
        )}
      </div>
    </section>
  )
}
