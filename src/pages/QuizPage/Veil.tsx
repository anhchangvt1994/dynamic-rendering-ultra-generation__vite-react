import { useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties, MutableRefObject, RefObject } from 'react'
import { seeded } from './quiz.mjs'
import { slotFor } from './items.mjs'

export type VeilKind = 'warp' | 'shards' | 'torch'

export const VEIL_LABEL: Record<VeilKind, string> = {
  warp: 'Sóng nhiễu',
  shards: 'Vỡ mảnh',
  torch: 'Đèn pin',
}

const GRID = 4
// slow at first, so the veil holds for a while, then lifts
const smoothstep = (t: number) => t * t * (3 - 2 * t)

type Props = {
  id: number
  src: string
  alt: string
  kind: VeilKind
  loaded: boolean
  revealed: boolean
  /** seconds for the veil to wear off */
  duration: number
  onLoad: () => void
  /** the artwork did not load: the round can not be played */
  onError: () => void
  stageRef: RefObject<HTMLDivElement | null>
  /** how much of the veil is left (1 → 0), read when the player answers */
  remainingRef: MutableRefObject<number>
  /** ms the veil has worn so far: where a round left off resumes there */
  elapsedRef: MutableRefObject<number>
  /** the veil is gone: time is up */
  onDone: () => void
  /**
   * The round's clock runs on the wall clock (the game's rounds are timed by
   * the server or by their start time): away from the tab, time still goes
   */
  wallClock?: boolean
}

/**
 * The silhouette, hidden one more way each round, and the veil wears off
 * on its own: rippling as if seen through water (warp), shattered into
 * pieces that fly back together (shards), or caught in a torch beam that
 * roams a dark stage and widens (torch; the player can steer it).
 *
 * One clock drives all three: --k on the stage, from 1 (fully veiled) to 0,
 * written every frame without re-rendering. The CSS of each veil reads it.
 */
export default function Veil({
  id,
  src,
  alt,
  kind,
  loaded,
  revealed,
  duration,
  onLoad,
  onError,
  stageRef,
  remainingRef,
  elapsedRef,
  onDone,
  wallClock = false,
}: Props) {
  const veilRef = useRef<HTMLDivElement>(null)
  const warpRef = useRef<SVGFEDisplacementMapElement>(null)
  const noiseRef = useRef<SVGFETurbulenceElement>(null)
  const steer = useRef<{ x: number; y: number; until: number } | null>(null)
  const active = loaded && !revealed
  const filterId = `quiz-warp-${id}`
  const done = useRef(onDone)
  done.current = onDone

  // where each piece flies from: the same for a given Pokémon
  const shards = useMemo(() => {
    const random = seeded(id * 7919)
    return Array.from({ length: GRID * GRID }, (_, index) => ({
      '--col': index % GRID,
      '--row': Math.floor(index / GRID),
      '--dx': `${(random() - 0.5) * 160}%`,
      '--dy': `${(random() - 0.5) * 160}%`,
      '--rot': `${(random() - 0.5) * 240}deg`,
      '--s': (0.45 + random() * 0.8).toFixed(2),
    }))
  }, [id])

  // NOTE - A layout effect: the first frame of a round must already be
  // veiled, or the previous round's "revealed" values flash for a frame
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !active) return
    delete stage.dataset.veilDone
    let lastNoise = -Infinity
    const paint = (k: number, now: number) => {
      remainingRef.current = k
      stage.style.setProperty('--k', k.toFixed(3))
      // the gift the fuse is burning (the stage's CSS lights it)
      const slot = String(slotFor(k))
      if (stage.dataset.slot !== slot) stage.dataset.slot = slot
      if (kind === 'warp') {
        warpRef.current?.setAttribute('scale', (110 * k).toFixed(1))
        // the water keeps moving while it calms down (the noise is redrawn
        // on the CPU: 15 times a second is plenty)
        if (now - lastNoise < 66) return
        lastNoise = now
        noiseRef.current?.setAttribute(
          'baseFrequency',
          `${(0.012 + 0.004 * Math.sin(now / 650)).toFixed(4)} ${(0.03 + 0.008 * Math.cos(now / 800)).toFixed(4)}`
        )
      } else if (kind === 'torch') {
        const steered = steer.current && now < steer.current.until
        const x = steered ? steer.current!.x : 50 + 34 * Math.sin(now / 950)
        const y = steered
          ? steer.current!.y
          : 50 + 30 * Math.sin(now / 1370 + 1)
        stage.style.setProperty('--x', `${x.toFixed(1)}%`)
        stage.style.setProperty('--y', `${y.toFixed(1)}%`)
      }
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // no motion: a veil that stays put, light enough to play, on the
      // second gift, and no clock to run out; the torch shines on the middle
      steer.current = { x: 50, y: 50, until: Infinity }
      paint(0.6, 0)
      return
    }
    // NOTE - The clock adds up frame times. Capped, a hidden tab (no frames)
    // makes the veil wait for the player; on the wall clock (a timed round)
    // the time away counts, as it does for the server
    let elapsed = elapsedRef.current
    let last = performance.now()
    paint(1 - smoothstep(Math.min(1, elapsed / (duration * 1000))), last)
    let frame = requestAnimationFrame(function tick(now) {
      elapsed += wallClock ? now - last : Math.min(now - last, 100)
      elapsedRef.current = elapsed
      last = now
      const progress = Math.min(1, elapsed / (duration * 1000))
      paint(1 - smoothstep(progress), now)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else {
        stage.dataset.veilDone = ''
        done.current()
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [active, kind, duration, stageRef, remainingRef, elapsedRef, wallClock])

  // the torch follows a finger or the pointer for a moment, then roams again
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || !active || kind !== 'torch') return
    const onMove = (event: PointerEvent) => {
      const box = veilRef.current?.getBoundingClientRect()
      if (!box) return
      steer.current = {
        x: ((event.clientX - box.left) / box.width) * 100,
        y: ((event.clientY - box.top) / box.height) * 100,
        until: performance.now() + 1200,
      }
    }
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerdown', onMove)
    return () => {
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerdown', onMove)
      steer.current = null
    }
  }, [active, kind, stageRef])

  return (
    <div ref={veilRef} className="veil">
      {kind === 'warp' && (
        <svg className="warp" aria-hidden="true" focusable="false">
          <filter
            id={filterId}
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={noiseRef}
              type="fractalNoise"
              baseFrequency="0.012 0.03"
              numOctaves={2}
              seed={id % 97}
              result="noise"
            />
            <feDisplacementMap
              ref={warpRef}
              in="SourceGraphic"
              in2="noise"
              scale="110"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}
      <img
        className="mon"
        src={src}
        alt={alt}
        width={280}
        height={280}
        decoding="async"
        data-loaded={loaded || undefined}
        onLoad={onLoad}
        onError={onError}
        draggable={false}
        style={
          kind === 'warp'
            ? ({ '--warp': `url(#${filterId})` } as CSSProperties)
            : undefined
        }
      />
      {kind === 'shards' && active && (
        <span className="shards" aria-hidden="true">
          {shards.map((style, index) => (
            <span
              key={index}
              style={
                { ...style, backgroundImage: `url(${src})` } as CSSProperties
              }
            />
          ))}
        </span>
      )}
      {kind === 'torch' && active && (
        <span className="beam" aria-hidden="true" />
      )}
    </div>
  )
}
