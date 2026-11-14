import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { loadMemoryImage } from './preload.mjs'
import { newlyMatched, rowsForMemoryBoard } from './layout.mjs'
import type { FlipResult, MemoryView } from '../../useMiniGame'

type Props = {
  difficulty: 1 | 2 | 3
  view: MemoryView
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
  const [ready, setReady] = useState<number[]>([])
  const [celebrating, setCelebrating] = useState<number[]>([])
  const [decodedFaces, setDecodedFaces] = useState<number[]>([])
  const timer = useRef<number | undefined>(undefined)
  const celebrationTimer = useRef<number | undefined>(undefined)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      window.clearTimeout(timer.current)
      window.clearTimeout(celebrationTimer.current)
    }
  }, [])

  useEffect(() => {
    Object.values(faces).forEach((face) => {
      if (decodedFaces.includes(face)) return
      setDecodedFaces((current) => current.includes(face) ? current : [...current, face])
      void loadMemoryImage(face, { getSrc: getPokemonImage }).then((ok) => {
        if (alive.current && ok) setReady((current) => current.includes(face) ? current : [...current, face])
      })
    })
  }, [faces, decodedFaces])

  const tap = async (index: number) => {
    if (disabled || pending !== null || miss.length || matched.includes(index) || open === index)
      return
    setPending(index)
    try {
      const result = await flip(index)
      setFaces((all) => ({ ...all, [index]: result.face }))
      setDecodedFaces((current) => current.includes(result.face) ? current : [...current, result.face])
      setPending(null)
      const imageReady = await loadMemoryImage(result.face, { getSrc: getPokemonImage })
      if (!alive.current) return
      if (!imageReady) throw new Error('Không tải được ảnh Pokémon. Hãy thử lật lại thẻ.')
      setReady((current) => current.includes(result.face) ? current : [...current, result.face])
      if (result.match === null) {
        setOpen(index)
      } else if (result.match) {
        const fresh = newlyMatched(matched, result.matched)
        setMatched(result.matched)
        setCelebrating(fresh)
        window.clearTimeout(celebrationTimer.current)
        celebrationTimer.current = window.setTimeout(() => setCelebrating([]), 720)
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
      className="mg-board mg-memory-board"
      style={{ '--memory-rows': rowsForMemoryBoard(view.cards, view.cols), gridTemplateColumns: `repeat(${view.cols}, minmax(0, 1fr))` } as CSSProperties}
    >
      {Array.from({ length: view.cards }, (_, i) => {
        const isMatched = matched.includes(i)
        const face = faces[i]
        const faceReady = face !== undefined && ready.includes(face)
        const up = (isMatched && faceReady) || (open === i && faceReady) || (miss.includes(i) && faceReady)
        return (
          <li key={i}>
            <button
              type="button"
              className="mg-card"
              data-i={i}
              data-up={up || undefined}
              data-pending={pending === i || (face !== undefined && !faceReady) || undefined}
              data-spin={pending === i || undefined}
              data-matched={isMatched || undefined}
              data-celebrate={celebrating.includes(i) || undefined}
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
                <span className="mg-face" data-ready={faceReady || undefined}>
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
