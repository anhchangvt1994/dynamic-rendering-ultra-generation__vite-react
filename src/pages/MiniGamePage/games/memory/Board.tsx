import { useEffect, useRef, useState } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import type { FlipResult, RoundView } from '../../useMiniGame'

type Props = {
  difficulty: 1 | 2 | 3
  view: RoundView
  flip: (index: number) => Promise<FlipResult>
  disabled: boolean
  tone?: unknown
  onResult?: (result: FlipResult, index: number) => void
  onError?: (error: Error) => void
}

const MISS_MS = 750

/**
 * The card flip board. A tap starts the card turning at once; its face shows
 * when the reply arrives. A missed pair stays up for a moment, and taps wait
 * until it has turned back. The server decides every match.
 */
export default function Board({ view, flip, disabled, onResult, onError }: Props) {
  const [faces, setFaces] = useState<Record<string, number>>(view.faces)
  const [matched, setMatched] = useState<number[]>(view.matched)
  const [open, setOpen] = useState<number | null>(view.open)
  const [pending, setPending] = useState<number | null>(null)
  const [miss, setMiss] = useState<number[]>([])
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const tap = async (index: number) => {
    if (disabled || pending !== null || miss.length || matched.includes(index) || open === index)
      return
    setPending(index)
    try {
      const result = await flip(index)
      setFaces((all) => ({ ...all, [index]: result.face }))
      setPending(null)
      if (result.match === null) {
        setOpen(index)
      } else if (result.match) {
        setMatched(result.matched)
        setOpen(null)
      } else {
        const pair = [result.with as number, index]
        setMiss(pair)
        timer.current = window.setTimeout(() => {
          setMiss([])
          setOpen(null)
        }, MISS_MS)
      }
      onResult?.(result, index)
    } catch (error) {
      setPending(null)
      onError?.(error as Error)
    }
  }

  const busy = pending !== null || miss.length > 0
  return (
    <ul
      className="mg-board"
      style={{ gridTemplateColumns: `repeat(${view.cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: view.cards }, (_, i) => {
        const isMatched = matched.includes(i)
        const up = isMatched || open === i || miss.includes(i)
        const face = faces[i]
        return (
          <li key={i}>
            <button
              type="button"
              className="mg-card"
              data-i={i}
              data-up={up || undefined}
              data-spin={pending === i || undefined}
              data-matched={isMatched || undefined}
              data-miss={miss.includes(i) || undefined}
              disabled={disabled || busy || isMatched}
              aria-label={
                isMatched
                  ? `Thẻ ${i + 1}, đã ghép`
                  : up
                    ? `Thẻ ${i + 1}, đang mở`
                    : `Thẻ ${i + 1}, úp`
              }
              onClick={() => tap(i)}
            >
              <span className="mg-flip">
                <span className="mg-back" />
                <span className="mg-face">
                  {face !== undefined && (
                    <img src={getPokemonImage(face)} alt="" draggable={false} />
                  )}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
