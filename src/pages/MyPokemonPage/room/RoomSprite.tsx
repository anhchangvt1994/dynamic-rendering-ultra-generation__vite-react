import { lazy, Suspense, useEffect, useState } from 'react'
import type { Appearance } from 'pages/BagPage/individuals/client'
import type { CanvasState } from './canvas/RoomCanvas'
import { preloadRig } from './canvas/rig'
import { alphaBox, bodyCenter, placeSprite, spriteFor } from './sprite.mjs'
import bodies_ from './spriteBodies.json'

// the pose each gif holds most of the time, measured offline over every frame
const measured = bodies_ as unknown as Record<string, number[]>
function animationBody(
  id: number,
  natural: { width: number; height: number }
): Box | null {
  const row = measured[id]
  if (!row || row[3] === undefined) return null
  const [fx, fy, fw, fh] = row
  const cx = fx * natural.width
  const cy = fy * natural.height
  const width = fw * natural.width
  const height = fh * natural.height
  return { x: cx - width / 2, y: cy - height / 2, width, height, cx, cy }
}

const MOOD_FILTER: Record<string, string> = {
  sad: 'saturate(.35)',
  angry: 'sepia(.4) hue-rotate(-30deg) saturate(2)',
}

type Box = {
  x: number
  y: number
  width: number
  height: number
  cx?: number
  cy?: number
}

const loadCanvas = () => import('./canvas/RoomCanvas')
const RoomCanvas = lazy(loadCanvas)

// how often, and how long, to ask the server whether the animation is built
const RETRY_MS = 3000
const RETRIES = 100

// the visible body of each picture, measured once per address
const bodies = new Map<string, Box | null>()

function measure(img: HTMLImageElement): Box | null {
  if (bodies.has(img.src)) return bodies.get(img.src) ?? null
  let body: Box | null = null
  try {
    const { naturalWidth: w, naturalHeight: h } = img
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, w, h)
      body = alphaBox(data, w, h)
      const centre = body && bodyCenter(data, w, h)
      if (body && centre) body = { ...body, cx: centre.x, cy: centre.y }
    }
  } catch {
    body = null // a tainted canvas: centre the frame instead
  }
  bodies.set(img.src, body)
  return body
}

type Props = {
  speciesId: number
  name: string
  mood?: string
  box: number
  /** the individual's size against its species, 1 for the usual */
  size?: number
  /** palette and marks, drawn over the animation when WebGL can */
  appearance?: Appearance
  className?: string
}

type Phase = 'primary' | 'fallback' | 'none'

type Seen = {
  src: string
  phase: Phase
  natural: { width: number; height: number } | null
  body: Box | null
  /** the fallback stands in while the server builds the animation */
  waiting?: boolean
  /** the animation was tried again once already */
  retried?: boolean
}

/**
 * The room's Pokémon: our smoothed animated WebP (mirrored while it ignores
 * you), the PokéAPI pixel gif / artwork if that is missing, its first letter after. Sized by
 * the individual, and centred on its visible body rather than its frame
 * (sprites sit off-centre in their pictures). A fixed box throughout: the
 * picture moves inside it, the layout never does.
 */
export default function RoomSprite({
  speciesId,
  name,
  mood,
  box,
  size = 1,
  appearance,
  className,
}: Props) {
  const back = mood === 'ignoring'
  const { src, fallback } = spriteFor(speciesId)
  const [seen, setSeen] = useState<Seen>({
    src,
    phase: 'primary',
    natural: null,
    body: null,
  })
  if (seen.src !== src)
    setSeen({ src, phase: 'primary', natural: null, body: null })
  // everything the canvas needs starts now, beside the picture, not after it
  const painting = !!appearance
  useEffect(() => {
    if (!painting) return
    void preloadRig(speciesId)
    void loadCanvas()
    void import('./canvas/gl')
  }, [speciesId, painting])
  // the server answers 202 while it builds the animation: the fallback
  // stands in, and the animation takes over the moment it is on disk
  const waiting = seen.src === src && seen.phase === 'fallback' && seen.waiting
  useEffect(() => {
    if (!waiting) return
    let live = true
    let timer = 0
    let tries = 0
    const ask = async () => {
      let answer = 0
      try {
        const res = await fetch(src)
        answer = res.status
        void res.body?.cancel()
      } catch {
        // offline: ask again
        answer = 503
      }
      if (!live) return
      if (answer === 200)
        setSeen((now) =>
          now.src === src
            ? {
                ...now,
                phase: 'primary',
                waiting: false,
                retried: true,
                natural: null,
                body: null,
              }
            : now
        )
      else if ((answer === 202 || answer >= 500) && ++tries < RETRIES)
        timer = window.setTimeout(ask, RETRY_MS)
      else
        setSeen((now) => (now.src === src ? { ...now, waiting: false } : now))
    }
    timer = window.setTimeout(ask, RETRY_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [waiting, src])
  // one address, /api/image: the server answers the animation (cached) once
  // it is built, the still (not cached) while it builds it
  const phase = seen.src === src ? seen.phase : 'primary'
  const shown = (phase === 'fallback' && fallback) || src
  // fitted from the picture's own size, so a new box refits it
  const natural = seen.src === src ? seen.natural : null
  const pixel = shown.endsWith('.gif')
  // the animated pictures are measured offline over every frame; a canvas
  // only sees the first one
  // the still artwork is 475px, the built animation 512px
  const animated =
    pixel || (!!natural && Math.max(natural.width, natural.height) >= 500)
  const placed = natural
    ? placeSprite({
        natural,
        content: (animated && animationBody(speciesId, natural)) || seen.body,
        box,
        size,
        pixel,
        round: true,
        dpr: typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
      })
    : null
  // turned away the picture is mirrored, and so is its offset from the centre
  const place = placed && (back ? { ...placed, x: -placed.x } : placed)
  // the canvas draws the individual once the picture is fitted; the picture
  // stays, hidden, as its box (and comes back if the canvas gives up)
  const [canvas, setCanvas] = useState<{
    key: string
    state: CanvasState
  } | null>(null)
  // a new look gets a new <canvas>: a disposed one has lost its context
  const canvasKey = `${speciesId}:${JSON.stringify(appearance ?? null)}`
  const tryCanvas =
    !!appearance &&
    phase === 'primary' &&
    !!natural &&
    !(canvas?.key === canvasKey && canvas.state === 'off')
  const painted =
    tryCanvas && canvas?.key === canvasKey && canvas.state === 'on'
  const filter = painted ? '' : (MOOD_FILTER[mood ?? ''] ?? '')

  return (
    <span
      className={`rm-sprite ${className ?? ''}`}
      style={{ width: box, height: box }}
      data-phase={phase}
      aria-hidden="true"
    >
      {phase === 'none' ? (
        <span className="rm-letter">{name.charAt(0).toUpperCase()}</span>
      ) : (
        <span
          className="rm-body"
          data-shift={place ? `${place.x},${place.y}` : undefined}
          data-measured={(place && seen.body && 'body') || undefined}
          data-canvas={painted || undefined}
          style={
            place
              ? {
                  width: place.width,
                  height: place.height,
                  transform: `translate(${place.x}px, ${place.y}px)`,
                }
              : { width: box, height: box }
          }
        >
          <img
            key={shown}
            src={shown}
            alt=""
            draggable={false}
            // same-origin /api/image needs no CORS: the swatch shares its request
            crossOrigin={phase === 'fallback' ? 'anonymous' : undefined}
            data-pixel={pixel || undefined}
            data-back={back || undefined}
            decoding="async"
            data-ready={!!natural || undefined}
            style={{ filter: filter || undefined }}
            onLoad={(event) => {
              const img = event.currentTarget
              const { naturalWidth: width, naturalHeight: height } = img
              const body = measure(img)
              setSeen((now) =>
                now.src === src
                  ? { ...now, natural: { width, height }, body }
                  : now
              )
            }}
            onError={() =>
              setSeen((now) =>
                now.src === src
                  ? {
                      ...now,
                      natural: null,
                      body: null,
                      phase:
                        now.phase === 'primary' && fallback
                          ? 'fallback'
                          : 'none',
                      waiting:
                        now.phase === 'primary' && !!fallback && !now.retried,
                    }
                  : now
              )
            }
          />
          {tryCanvas && appearance && (
            <Suspense fallback={null}>
              <RoomCanvas
                key={canvasKey}
                speciesId={speciesId}
                appearance={appearance}
                mood={mood}
                back={back}
                animated={animated}
                onReady={(state) => setCanvas({ key: canvasKey, state })}
              />
            </Suspense>
          )}
        </span>
      )}
    </span>
  )
}
