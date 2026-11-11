import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { typesOf } from 'components/pokemon-page/type-index.mjs'
import type { Individual } from 'pages/BagPage/individuals/client'
import { sizeOf, starLabel } from 'pages/BagPage/individuals/display.mjs'
import { useDishes } from 'pages/KitchenPage/useDishes'
import {
  CARE,
  blockedReason,
  levelOf,
  needsNow,
  nextLevelAt,
  unlocksAt,
} from '../care/care.mjs'
import { tasteOf } from '../care/likes.mjs'
import { MOODS, mood as moodOf } from '../care/mood.mjs'
import { moodLine } from '../care/moodLines.mjs'
import {
  useCare,
  type CareAction,
  type CareReceipt,
  type CareState,
} from '../care/useCare'
import { individualNavigationState, myPokemonPath } from '../paths.mjs'
import CareBar from './CareBar'
import CareFx, { NEED_OF, type Fx } from './CareFx'
import FeedSheet from './FeedSheet'
import NeedRings, { LOW_NEED } from './NeedRings'
import ProfileSheet from './ProfileSheet'
import RoomSprite from './RoomSprite'
import { contrast, themeFor } from './roomTheme.mjs'
import { spriteFor } from './sprite.mjs'
import EvolveSatellite from '../evolution/EvolveSatellite'
import { useEvolution } from '../evolution/useEvolution'
import { dockGesture, sheetDragClose } from './dockGesture.mjs'
import { RoomStyle } from './styles'
import { useReducedMotion } from './useMedia'

const WALL_LINES = 7

// fine dust in the light, placed once: wider down the cone, each with its own pace
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
const DUST = Array.from({ length: 26 }, (_, i) => {
  const f = 0.3 + 0.7 * rnd(i * 5 + 1)
  return {
    '--x': `${(50 + (rnd(i * 5 + 2) - 0.5) * (12 + 88 * f)).toFixed(1)}%`,
    '--y': `${(f * 100).toFixed(1)}%`,
    '--s': `${(1.4 + rnd(i * 5 + 3) * 2.6).toFixed(1)}px`,
    '--d': `${(-rnd(i * 5 + 4) * 12).toFixed(1)}s`,
    '--t': `${(6 + rnd(i * 5 + 5) * 8).toFixed(1)}s`,
    '--k': `${(2.2 + rnd(i * 5 + 6) * 3.4).toFixed(1)}s`,
    '--dx': `${((rnd(i * 5 + 7) - 0.5) * 36).toFixed(0)}px`,
    '--dy': `${(-14 - rnd(i * 5 + 8) * 46).toFixed(0)}px`,
  } as CSSProperties
})
const FX_MS = 2200

// the sprite's answer to each care, played on its own wrapper
const REACTION: Record<Fx['kind'], [Keyframe[], number]> = {
  feed: [
    [
      { transform: 'none' },
      { transform: 'translateY(4%) scale(1.08, .9)', offset: 0.18 },
      { transform: 'translateY(-3%) scale(.95, 1.06)', offset: 0.34 },
      { transform: 'translateY(3%) scale(1.06, .93)', offset: 0.5 },
      { transform: 'translateY(-2%) scale(.98, 1.03)', offset: 0.68 },
      { transform: 'none' },
    ],
    760,
  ],
  bathe: [
    [
      { transform: 'none' },
      { transform: 'rotate(-7deg) scale(1.03)', offset: 0.2 },
      { transform: 'rotate(6deg) scale(1.03)', offset: 0.4 },
      { transform: 'rotate(-4deg)', offset: 0.6 },
      { transform: 'rotate(2deg)', offset: 0.8 },
      { transform: 'none' },
    ],
    820,
  ],
  pet: [
    [
      { transform: 'none' },
      { transform: 'translateY(2%) scale(1.08, .92)', offset: 0.15 },
      { transform: 'translateY(-14%) scale(.94, 1.07)', offset: 0.45 },
      { transform: 'translateY(1%) scale(1.06, .94)', offset: 0.75 },
      { transform: 'none' },
    ],
    680,
  ],
  angry: [
    [
      { transform: 'none' },
      { transform: 'translateX(-5%) rotate(-3deg)', offset: 0.2 },
      { transform: 'translateX(5%) rotate(3deg)', offset: 0.4 },
      { transform: 'translateX(-4%)', offset: 0.6 },
      { transform: 'translateX(3%)', offset: 0.8 },
      { transform: 'none' },
    ],
    460,
  ],
}

// the circle's width, live: the Pokémon is fitted to it
function useWidth(ref: RefObject<HTMLElement | null>, fallback: number) {
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => el.offsetWidth && setWidth(el.offsetWidth)
    read()
    const observer = new ResizeObserver(read)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

// never under the site's 11px floor
const NAME_MIN = 11

/**
 * Sizes the name to fill the header's row on one line (never past its design
 * size, --name-max): the CSS size is a first paint, this measures the real
 * text and scales to the exact room, like the Pokémon page's name.
 */
function fitName(title: HTMLElement) {
  const hud = title.closest<HTMLElement>('.rm-hud')
  if (!hud) return
  const style = getComputedStyle(hud)
  const room =
    hud.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight)
  const width = title.scrollWidth
  if (!room || !width) return
  const own = getComputedStyle(title)
  const size = parseFloat(own.fontSize)
  const max = parseFloat(own.getPropertyValue('--name-max')) || 40
  const fitted = Math.floor(((size * room) / width) * 0.98 * 10) / 10
  title.style.fontSize = `${Math.min(max, Math.max(NAME_MIN, fitted))}px`
}

type Props = {
  individual: Individual
  species: string
  siblings: Individual[]
  returnTo: string
  returnIndex: unknown
  /** the way back, at the head of the room */
  back?: ReactNode
}

/**
 * The Pokémon's room: its types' poster wall, the Pokémon in the middle of
 * its circle, its needs, its mood in a speech bubble, the care bar and the
 * profile sheet.
 */
export default function Room({
  individual,
  species,
  siblings,
  returnTo,
  returnIndex,
  back,
}: Props) {
  const navigate = useNavigate()
  const care = useCare(individual)
  const { dishes, menu } = useDishes(true)
  const [spent, setSpent] = useState<Record<string, number>>({})
  const [feeding, setFeeding] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const dockTouch = useRef<{
    x: number
    y: number
    top: number
    startedInProfile: boolean
    wasOpen: boolean
  } | null>(null)
  const [fx, setFx] = useState<Fx | null>(null)
  const reduced = useReducedMotion()
  const disc = useRef<HTMLDivElement>(null)
  const actor = useRef<HTMLSpanElement>(null)
  const discWidth = useWidth(disc, 200)
  const title = useRef<HTMLHeadingElement>(null)

  // the name fills its row; refitted when the text, the font or the width changes
  useLayoutEffect(() => {
    const el = title.current
    const hud = el?.closest<HTMLElement>('.rm-hud')
    if (!el || !hud) return
    const fit = () => {
      el.style.fontSize = ''
      fitName(el)
    }
    fit()
    document.fonts?.ready.then(fit)
    const observer = new ResizeObserver(fit)
    observer.observe(hud)
    return () => observer.disconnect()
  }, [individual.nickname, individual.speciesId, species])

  const theme = themeFor(typesOf(individual.speciesId))
  const name = individual.nickname ?? species
  const state = care.state
  const now = care.now
  const feeling = state ? moodOf(state, individual.createdAt, now) : null
  const affection = state?.affection ?? 0
  const evolutionApi = useEvolution(individual.id, affection)
  const level = levelOf(affection)
  const unlocks = unlocksAt(level)
  const nextAt = nextLevelAt(affection)
  const fromAt = CARE.LEVELS[level - 1] ?? 0
  const toNext =
    nextAt === null
      ? 100
      : Math.round(((affection - fromAt) / (nextAt - fromAt)) * 100)
  const needs = state ? (needsNow(state, now) as CareState['needs']) : null
  const urgent = {
    feed: feeling === 'hungry',
    bathe: !!needs && needs.clean < LOW_NEED,
    pet: feeling === 'sad' || (!!needs && needs.fun < LOW_NEED),
  }
  const counts = dishes ? { ...dishes, ...spent } : null
  const dishCount = counts
    ? Object.values(counts).reduce((sum, n) => sum + Math.max(0, n), 0)
    : undefined
  const blocked = state
    ? {
        feed: blockedReason(state, 'feed', now, dishCount),
        bathe: blockedReason(state, 'bathe', now),
      }
    : null

  // a care that went through plays once over the circle
  const fxTimer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(fxTimer.current), [])
  const celebrate = (
    action: CareAction,
    receipt: CareReceipt,
    before: number,
    extra: Partial<Fx> = {}
  ) => {
    const gain = Math.max(0, receipt.care.affection - before)
    const kind =
      action === 'pet' && receipt.care.moodEvent === 'overpet' && gain <= 0
        ? 'angry'
        : action
    setFx((was) => ({ n: (was?.n ?? 0) + 1, kind, gain, ...extra }))
    window.clearTimeout(fxTimer.current)
    fxTimer.current = window.setTimeout(() => setFx(null), FX_MS)
    if (reduced) return
    const [frames, duration] = REACTION[kind]
    actor.current?.animate?.(frames, {
      duration,
      // a dish first lands in front of it, then the gulp
      delay: kind === 'feed' && extra.dish ? 440 : 0,
      easing: 'cubic-bezier(.3,.7,.4,1)',
    })
  }
  const run = async (action: CareAction, dishId?: string) => {
    const before = state?.affection ?? 0
    const receipt = await care.act(action, dishId)
    if (receipt) {
      setSheetOpen(false)
      const dish = dishId
        ? menu?.dishes.find((one) => one.id === dishId)
        : undefined
      celebrate(action, receipt, before, {
        dish,
        taste: dish ? tasteOf(individual.personality, dish) : undefined,
      })
    }
    return receipt
  }

  const lastDish = useRef<string | null>(null)
  const feed = async (dishId: string) => {
    lastDish.current = dishId
    const receipt = await run('feed', dishId)
    if (receipt && typeof receipt.dishCount === 'number') {
      setSpent((was) => ({ ...was, [dishId]: receipt.dishCount! }))
      setFeeding(false)
    }
  }
  // a dish eaten in another tab: the server says none is left
  useEffect(() => {
    const dishId = lastDish.current
    if (care.actionCode === 'no_dish' && dishId)
      setSpent((was) => ({ ...was, [dishId]: 0 }))
  }, [care.actionCode])

  // the others of its species, one step either way
  const at = siblings.findIndex((one) => one.id === individual.id)
  const step = (by: number) =>
    siblings[(at + by + siblings.length) % siblings.length]
  const stepName = (one: Individual) => one.nickname ?? species
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  // remember the page before the first room, so back skips the siblings
  const siblingState = individualNavigationState(
    returnTo,
    Number.isInteger(returnIndex)
      ? returnIndex
      : (window.history.state?.idx ?? 1) - 1
  )
  const moveTo = (by: number) => {
    const next = step(by)
    if (next)
      navigate(myPokemonPath(next.id), {
        state: siblingState,
      })
  }
  useEffect(() => {
    if (siblings.length < 2 || at < 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          /INPUT|TEXTAREA|SELECT|BUTTON/.test(target.tagName))
      )
        return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        moveTo(event.key === 'ArrowLeft' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [at, siblings])

  const words = theme.words.length ? theme.words : ['POKÉMON']
  const dark = contrast(theme.bg, '#ffffff') > contrast(theme.bg, '#111111')
  const style = {
    '--fg': dark ? '#ffffff' : '#111111',
    '--star': dark ? '#ffd447' : '#9a5b00',
    '--bg': theme.bg,
    '--a1': theme.a1,
    '--a2': theme.a2,
    '--ink': theme.ink,
  } as CSSProperties

  return (
    <RoomStyle
      className="rm-layout"
      style={style}
      data-tone={dark ? 'dark' : 'light'}
    >
      <section
        className="rm-room"
        aria-label={`Phòng của ${name}`}
        data-mood={feeling ?? undefined}
        data-unlock-sticker={unlocks.sticker || undefined}
        data-unlock-sparkles={unlocks.sparkles || undefined}
        data-unlock-gold={unlocks.gold || undefined}
      >
        <div className="rm-sky" aria-hidden="true" />
        <div className="rm-floor" aria-hidden="true" />

        <div className="rm-upper">
          <div className="rm-wall" aria-hidden="true">
            <div className="pat">
              {Array.from({ length: WALL_LINES }, (_, i) => (
                <div key={i}>
                  {Array(10)
                    .fill(words[i % words.length])
                    .join(' · ')}
                </div>
              ))}
            </div>
            {unlocks.sticker && <span className="rm-wall-sticker">★</span>}
          </div>
          <div className="rm-hud">
            {back}
            <header className="rm-name">
              <h1 ref={title}>{name}</h1>
              <p>
                <span className="rm-lv">Lv {level}</span>
                {individual.nickname && <span>{species}</span>}
                <span
                  className="rm-stars"
                  aria-label={starLabel(individual.potential.stars)}
                >
                  {'★'.repeat(individual.potential.stars)}
                  {'☆'.repeat(5 - individual.potential.stars)}
                </span>
                {siblings.length > 1 && at >= 0 && (
                  <span className="rm-count" aria-hidden="true">
                    {at + 1}/{siblings.length}
                  </span>
                )}
              </p>
            </header>
          </div>

          <div className="rm-bubble-wrap">
            <p className="rm-bubble" role="status">
              {care.error ? (
                ''
              ) : feeling ? (
                <>
                  <span className="rm-emoji">{MOODS[feeling].emoji}</span>{' '}
                  <b>{MOODS[feeling].label}:</b>{' '}
                  {moodLine(individual.personality, feeling)}
                </>
              ) : (
                <>
                  {/* the mood's emoji line height, so the bubble keeps it */}
                  <span className="rm-emoji" aria-hidden="true">
                    {'\u200b'}
                  </span>
                  Đang tải…
                </>
              )}
            </p>
          </div>
        </div>

        <div
          className="rm-stage"
          onTouchStart={(event) => {
            const touch = event.touches[0]
            touchStart.current = { x: touch.clientX, y: touch.clientY }
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current
            touchStart.current = null
            if (!start || siblings.length < 2 || at < 0) return
            const touch = event.changedTouches[0]
            const dx = touch.clientX - start.x
            const dy = touch.clientY - start.y
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3)
              moveTo(dx < 0 ? 1 : -1)
          }}
        >
          <div className="rm-light" aria-hidden="true">
            <span className="rm-light-cone" />
            <span className="rm-light-rays" />
            <span className="rm-light-rays" data-b />
            <span className="rm-light-src" />
            <span className="rm-light-dust">
              {DUST.map((style, i) => (
                <i key={i} style={style} />
              ))}
            </span>
          </div>
          {fx && (
            <span
              className="rm-glow"
              key={fx.n}
              data-fx={fx.kind}
              aria-hidden="true"
            />
          )}
          {siblings.length > 1 && at >= 0 && (
            <nav className="rm-step" aria-label="Cùng loài">
              {[-1, 1]
                .filter((by) => by === 1 || siblings.length > 2)
                .map((by) => {
                  const one = step(by)
                  return (
                    <LinkCustom
                      key={by}
                      className={`rm-door ${by < 0 ? 'rm-door-prev' : 'rm-door-next'}`}
                      to={myPokemonPath(one.id)}
                      state={siblingState}
                      aria-label={`${by < 0 ? 'Pokémon trước' : 'Pokémon tiếp'}: ${stepName(one)}`}
                    >
                      <img
                        src={spriteFor(one.speciesId).src}
                        alt=""
                        draggable={false}
                        loading="lazy"
                      />
                      <small aria-hidden="true">{stepName(one)}</small>
                    </LinkCustom>
                  )
                })}
            </nav>
          )}
          <span className="rm-mega" aria-hidden="true">
            {words[0]}
          </span>
          <div className="rm-disc" ref={disc}>
            {unlocks.sparkles && (
              <span className="rm-sparkles" aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
            )}
            <span className="rm-actor" ref={actor}>
              <RoomSprite
                speciesId={individual.speciesId}
                name={species}
                mood={feeling ?? undefined}
                box={Math.round(discWidth * 0.86)}
                size={sizeOf(individual.id).scale}
                appearance={individual.appearance}
              />
            </span>
            {fx && <CareFx key={fx.n} fx={fx} radius={discWidth / 2} />}
            <span
              className="rm-medal"
              style={{ '--lv': `${toNext}%` } as CSSProperties}
              aria-hidden="true"
            >
              <b>{level}</b>
              <small>
                {nextAt === null
                  ? '♥ Tối đa'
                  : `♥ ${affection - fromAt}/${nextAt - fromAt}`}
              </small>
            </span>
            {(needs || !care.error) && (
              <NeedRings
                needs={needs}
                bump={
                  fx && NEED_OF[fx.kind]
                    ? { need: NEED_OF[fx.kind]!, n: fx.n }
                    : undefined
                }
              />
            )}
            <EvolveSatellite individualId={individual.id} api={evolutionApi} />
            <span className="rm-sticker">{theme.sticker || 'Pokémon'}</span>
          </div>
        </div>

        {care.error && (
          <div className="rm-care-error" role="alert">
            <p>Không tải được việc chăm sóc.</p>
            <button type="button" className="rm-btn" onClick={care.retry}>
              Thử lại
            </button>
          </div>
        )}
      </section>

      <div
        className="rm-dock"
        data-open={sheetOpen || undefined}
        onTouchStart={(event) => {
          const profile = (event.target as HTMLElement).closest(
            '.rm-profile-body'
          )
          const touch = event.touches[0]
          dockTouch.current = {
            x: touch.clientX,
            y: touch.clientY,
            top: profile?.scrollTop ?? 0,
            startedInProfile: !!profile,
            wasOpen: sheetOpen,
          }
        }}
        onTouchEnd={(event) => {
          const start = dockTouch.current
          dockTouch.current = null
          if (!start) return
          const touch = event.changedTouches[0]
          const dx = touch.clientX - start.x
          const dy = touch.clientY - start.y
          if (
            start.wasOpen &&
            start.startedInProfile &&
            sheetDragClose(start.top, dx, dy)
          ) {
            setSheetOpen(false)
            return
          }
          if (!start.startedInProfile) {
            const next = dockGesture(start.wasOpen, dx, dy)
            if (next !== null) setSheetOpen(next)
          }
        }}
      >
        <button
          type="button"
          className="rm-sheet-toggle"
          aria-expanded={sheetOpen}
          aria-controls="rm-profile"
          onClick={() => setSheetOpen((open) => !open)}
        >
          <span className="rm-grab" aria-hidden="true" />
          <span className="rm-toggle-label">
            {sheetOpen ? 'Đóng chỉ số · hồ sơ' : 'Chỉ số · hồ sơ'}
            <span className="rm-chev" aria-hidden="true" />
          </span>
        </button>
        <ProfileSheet
          item={individual}
          care={state}
          pending={!state && !care.error}
          open={sheetOpen}
        />
        <CareBar
          individualId={individual.id}
          blocked={blocked}
          urgent={urgent}
          busy={care.busy}
          onFeed={() => setFeeding(true)}
          onBathe={() => run('bathe')}
          onPet={() => run('pet')}
        />
        <p className="rm-alert" role="alert">
          {feeding ? '' : care.actionError}
        </p>
      </div>

      <FeedSheet
        open={feeding}
        onClose={() => setFeeding(false)}
        individualId={individual.id}
        personality={individual.personality}
        name={name}
        counts={counts}
        menu={menu}
        busy={care.busy}
        error={care.actionError}
        onFeed={feed}
      />
    </RoomStyle>
  )
}
