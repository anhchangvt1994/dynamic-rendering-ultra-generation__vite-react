import { useGetPokemonListQuery } from 'app/apis/pokemon'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { functionGenerator } from 'utils/EnvHelper'
import { isCaught, toggleCaught } from 'utils/caught.mjs'
import AppSelect from 'components/common/Select'
import { Pokeball } from 'components/common/FieldIcon'
import { GENERATIONS } from 'pages/HomePage/catalog.mjs'
import { refreshBag, useBagStore } from 'pages/BagPage/bagStore'
import { useAccount } from 'app/supabase/account'
import {
  findGuess,
  milestoneOf,
  quizLabel,
  readFlag,
  saveFlag,
  speciesFromList,
  tierOf,
} from './quiz.mjs'
import { TIERS, itemById, itemSprite } from './items.mjs'
import {
  COMBO_AT,
  SPECIAL_AT,
  TURNS,
  badgeCount,
  bagSize,
  fullCount,
} from './progress.mjs'
import {
  FREEZE_MS,
  TIME_UP,
  veilElapsed as elapsedAtLoad,
  veilSeed,
} from './engine/rules.mjs'
import { useQuizEngine } from './engine/useQuizEngine'
import type { PlayRound, Status, Verdict } from './engine'
import { QuizStyle } from './styles'
import { fitText } from './fitText'
import { flyTo } from './flight'
import Fx from './Fx'
import type { FxHandle } from './Fx'
import Veil, { VEIL_LABEL } from './Veil'
import type { TimeStop } from './Veil'
import TimePower, { TimeStopFx } from './TimePower'
import WildGrass, { Encounter } from './WildGrass'
import PalkiaRift, { PalkiaLetter, palkiaSays } from './PalkiaRift'
import Prize, { PrizeSlot } from './Prize'
import Loot from './Loot'
import ItemDialog from './ItemDialog'
import ChestDialog from './ChestDialog'
import type { Chest } from './ChestDialog'
import Recharge, { Recap, clock } from './Recharge'
import QuickLinks from './QuickLinks'

type Won = { slot: number; id: string; bonus: boolean }

// artworks that fail in a row before the page gives up
const MAX_IMAGE_ERRORS = 3
// NOTE - The beats (ms), matching styles.tsx: the answer shows after a short
// hold (--burst), a catch clicks shut at --click
const REVEAL_AT = 120
const CLICK_AT = 1250
// Palkia's rift after a stop: once Dialga's clock face (1.2 s) is gone
const PALKIA_AFTER = 1100
// after the last turn's answer, how long its result holds the stage
const REST_AFTER = 2600
const PARTY = ['#ffda55', '#ffffff', '#ff6a4a', '#4fd18b', '#4aa8ff', '#b77cff']
const COACHED_KEY = 'pokedex:quiz-coached'
// the whole National Pokédex when no generation is chosen
const ALL = { start: 1, end: 1025 }
// where a thrown ball lands: just below the stage's middle (6cqw in styles)
const landY = (stage: HTMLElement) =>
  0.5 + (0.06 * stage.clientWidth) / stage.clientHeight
const reducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches
// a particle burst in a tier's colours
const tierColors = (tier: number) => [
  TIERS[tier].color,
  '#ffffff',
  `color-mix(in srgb, ${TIERS[tier].color} 50%, #fff)`,
]

const toPath = functionGenerator(
  import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
)

/**
 * "Who's That Pokémon?" — the anime's own eyecatch, as a game: a
 * silhouette on a sunburst, veiled one more way each round (Veil.tsx).
 * One gift at a time hangs in an orb under the stage (Prize.tsx) and drops
 * to a lesser one each time its ring runs out as the veil wears off: the
 * earlier the guess, the better the gift. Five turns every three hours, a
 * chest every streak of 10, a special one every 10 of those. Catching the
 * Pokémon is the player's call, with the turn's own ball.
 *
 * The game itself is an engine (engine/): the account's, run and judged by
 * the database (signed in), this browser's (yarn dev) or a guest's, who
 * plays without turns, gifts, streak or bag.
 */
export default function QuizPage() {
  setSeoTag({
    title: 'Who’s That Pokémon? – Đoán Pokémon qua bóng đen | Pokédex',
    description:
      'Trò chơi Who’s that Pokémon?: nhìn bóng đen, đoán tên thật sớm để nhận Rare Candy, đá tiến hoá, TM… và bắt Pokémon vào bộ sưu tập.',
    robots: 'index, follow',
  })

  const { data, isError, refetch } = useGetPokemonListQuery({
    limit: 1500,
    offset: 0,
  })
  // settings live in the URL so a challenge can be shared: ?gen=1&mode=hard
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const generation = GENERATIONS.find((gen) => gen.id === params.get('gen'))
  const hard = params.get('mode') === 'hard'
  const setSetting = (key: string, value: string) => {
    const next = new URLSearchParams(location.search)
    if (value) next.set(key, value)
    else next.delete(key)
    const query = next.toString()
    navigate(query ? `?${query}` : '.', { replace: true })
  }
  // every species by its number: the rounds come as numbers
  const species = useMemo(() => speciesFromList(data?.results), [data])
  const speciesById = useMemo(
    () => new Map(species.map((entry) => [entry.id, entry])),
    [species]
  )
  const nameOf = (id?: number) => {
    const entry = id ? speciesById.get(id) : undefined
    return entry ? quizLabel(entry.name) : '…'
  }

  const { engine, mode } = useQuizEngine()
  // accounts off (no Supabase): nobody can sign in, so nothing invites to
  const accounts = useAccount().status !== 'off'
  const { bag } = useBagStore()
  const rewards = engine?.rewards ?? mode !== 'guest'

  const [status, setStatus] = useState<Status | null>(null)
  const [round, setRound] = useState<PlayRound | null>(null)
  const [chosen, setChosen] = useState<number | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [answering, setAnswering] = useState(false)
  const [outOfTurns, setOutOfTurns] = useState(false)
  const [lostStreak, setLostStreak] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [chests, setChests] = useState<Chest[]>([])
  const [chestOpen, setChestOpen] = useState(false)
  const [itemOpen, setItemOpen] = useState<string | null>(null)
  const [catchPhase, setCatchPhase] = useState<'' | 'throw' | 'done'>('')
  const [loaded, setLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  // an answer whose verdict never came (another tab answered, the network)
  const [lost, setLost] = useState(false)
  const [guess, setGuess] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  // which ring's explanation is open
  const [hint, setHint] = useState<'' | 'turns' | 'streak' | 'records'>('')
  const [coached, setCoached] = useState(() => readFlag(COACHED_KEY))
  const imageErrors = useRef(0)
  const focusFirstOption = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const veilLeft = useRef(1)
  const veilElapsed = useRef(0)
  // NOTE - The Roar of Time: the stop the veil reads every frame, and what
  // the page draws of it (the round it was used on, the 15 s on screen)
  const stopRef = useRef<TimeStop | null>(null)
  const [stoppedId, setStoppedId] = useState<string | null>(null)
  const [freeze, setFreeze] = useState<{
    until: number
    fresh: boolean
    phase: 'hold' | 'late' | 'thaw'
  } | null>(null)
  const [timeNote, setTimeNote] = useState('')
  // NOTE - Palkia's help with a stop: the options it took away, the letter
  // it told; fresh while its rift plays (after Dialga's clock face)
  const [palkia, setPalkia] = useState<{
    removed: number[]
    letter: string | null
    fresh: boolean
  } | null>(null)
  const [palkiaNote, setPalkiaNote] = useState('')
  const palkiaTimer = useRef(0)
  const roundId = useRef<string | null>(null)
  // the round whose artwork just landed: the battle transition plays over it
  const [encounter, setEncounter] = useState<string | null>(null)
  // when the round reached the page: its clock runs while the artwork loads
  const roundAt = useRef(0)
  const guessRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const optionsRef = useRef<HTMLOListElement>(null)
  const fxRef = useRef<FxHandle>(null)
  const revealRef = useRef<HTMLParagraphElement>(null)
  const lootRef = useRef<HTMLImageElement>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  const revealed = verdict !== null
  const correct = verdict?.outcome === 'right'
  const timeUp = verdict?.outcome === 'time'
  const answerId = round?.answerId ?? verdict?.answerId
  const won: Won | null =
    verdict?.gift && verdict.slot !== null
      ? { slot: verdict.slot, id: verdict.gift, bonus: verdict.lucky }
      : null
  const missed = verdict?.missed ?? null
  // a chest just paid: the full 10 stay up until the next round
  const streak = verdict?.chests.some((chest) => chest.kind === 'combo')
    ? COMBO_AT
    : (status?.streak ?? 0)
  const records = verdict?.chests.some((chest) => chest.kind === 'special')
    ? SPECIAL_AT
    : (status?.records ?? 0)
  const recordsTotal = status?.recordsTotal ?? 0
  const left = rewards ? (status?.left ?? TURNS) : TURNS
  const refill = rewards ? (status?.refillAt ?? 0) : 0

  const showRound = useCallback((playing: PlayRound) => {
    audio.current?.pause()
    veilLeft.current = 1
    veilElapsed.current = playing.elapsedMs
    roundAt.current = performance.now()
    // a round stopped before (another visit): the rest of its 30 s, its veil
    // already thinned, and whatever Palkia did for it
    if (playing.frozenAtMs === null) stopRef.current = null
    else {
      const until = roundAt.current + playing.freezeLeftMs
      stopRef.current = { at: until - FREEZE_MS, until }
    }
    setStoppedId(playing.frozenAtMs === null ? null : playing.id)
    // the particles hold still only while this round's time is stopped
    fxRef.current?.hold(
      playing.freezeLeftMs > 0 ? roundAt.current + playing.freezeLeftMs : 0
    )
    setFreeze(
      playing.freezeLeftMs > 0
        ? {
            until: roundAt.current + playing.freezeLeftMs,
            fresh: false,
            phase: 'hold',
          }
        : null
    )
    setTimeNote('')
    roundId.current = playing.id
    clearTimeout(palkiaTimer.current)
    setPalkia(
      playing.removed.length || playing.letter
        ? { removed: playing.removed, letter: playing.letter, fresh: false }
        : null
    )
    setPalkiaNote('')
    // moving on from the result with the keyboard: keep the player in the
    // game instead of dropping focus back to the top of the page
    focusFirstOption.current = document.activeElement === nextRef.current
    setRound(playing)
    setChosen(null)
    setVerdict(null)
    setCatchPhase('')
    setLoaded(false)
    setGuess('')
    setChests([])
    setOutOfTurns(false)
    fxRef.current?.clear()
  }, [])

  // NOTE - A round costs its turn when it starts and is kept until answered
  // (by the engine): reloading brings the same Pokémon back, its clock still
  // running, so re-rolling a hard one costs a turn's worth of time
  const next = useCallback(async () => {
    if (!engine) return
    const range = generation ?? ALL
    try {
      const playing = await engine.start({
        from: range.start,
        to: range.end,
        hard,
      })
      showRound(playing)
      if (engine.rewards) setStatus(await engine.status())
    } catch (error) {
      if ((error as Error).message === 'no_turns') {
        setRound(null)
        setVerdict(null)
        setOutOfTurns(true)
        setStatus(await engine.status())
      } else setImageFailed(true)
    }
  }, [engine, generation, hard, showRound])

  // the game's state: its waiting round, else a new one if a turn is left
  const resume = useCallback(
    (live: () => boolean = () => true) =>
      engine
        ?.status()
        .then((value) => {
          if (!live()) return
          setStatus(value)
          if (value.pending) showRound(value.pending)
          else if (value.left > 0) next()
          else setOutOfTurns(true)
        })
        .catch(() => live() && setImageFailed(true)),
    [engine, showRound, next]
  )

  // a new engine (signed in or out): its state, its waiting round or a new one
  useEffect(() => {
    if (!engine) return
    let live = true
    setRound(null)
    setVerdict(null)
    setStatus(null)
    setOutOfTurns(false)
    setLost(false)
    resume(() => live)
    return () => {
      live = false
    }
    // the first round only: later ones come from the player
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine])

  const timeLeft = rewards ? (status?.timeLeft ?? 0) : 0
  const timeRefillAt = rewards ? (status?.timeRefillAt ?? 0) : 0
  // the clock of the turns: once a second while a window is running
  const ticking = refill > 0 || round === null || timeRefillAt > 0
  useEffect(() => {
    if (!ticking) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [ticking])

  const playHard = round ? round.hard : hard

  // hard mode: the typing field is the place to be on every new round
  useEffect(() => {
    if (playHard && round && loaded && chosen === null)
      guessRef.current?.focus()
  }, [playHard, round, loaded, chosen])

  useEffect(() => {
    if (!round || chosen !== null || playHard || !focusFirstOption.current)
      return
    focusFirstOption.current = false
    optionsRef.current?.querySelector('button')?.focus()
  }, [round, chosen, playHard])

  // NOTE - An artwork that does not load leaves a round nobody can play:
  // swap in another Pokémon at no cost (3 per window), stop after 3 in a row
  const onImageLoad = useCallback(() => {
    imageErrors.current = 0
    // the veil starts where the server's clock is now, not where it was
    // when the round came
    if (round)
      veilElapsed.current = elapsedAtLoad(
        round,
        roundAt.current,
        performance.now(),
        stopRef.current
      )
    setEncounter(round?.id ?? null)
    setLoaded(true)
  }, [round])
  const onImageError = useCallback(() => {
    imageErrors.current += 1
    if (!engine || !round || imageErrors.current >= MAX_IMAGE_ERRORS) {
      setImageFailed(true)
      return
    }
    engine
      .reroll(round)
      .then(showRound)
      .catch(() => setImageFailed(true))
  }, [engine, round, showRound])

  // NOTE - Out of turns, the healing machine stays up when the time is over
  // too, so the balls coming back is seen; the player starts the next round
  const [restUntil, setRestUntil] = useState(0)
  useEffect(() => {
    if (outOfTurns && refill) setRestUntil(refill)
  }, [outOfTurns, refill])
  // NOTE - The last turn answered: its result is seen for a moment (and the
  // Pokémon caught, if the player throws), then the stage turns into the
  // healing machine on its own; the verdict stays below it
  useEffect(() => {
    if (!rewards || !revealed || left > 0 || !refill || restUntil) return
    if (catchPhase === 'throw' || chestOpen) return
    const timer = window.setTimeout(() => setRestUntil(refill), REST_AFTER)
    return () => clearTimeout(timer)
  }, [rewards, revealed, left, refill, restUntil, catchPhase, chestOpen])
  const locked = rewards && (restUntil > 0 || (!round && outOfTurns))

  const choose = useCallback(
    (id: number) => {
      // the veil has to be on screen: no blind guesses for the best gift
      if (!engine || !round || chosen !== null || answering || !loaded) return
      // taken away by Palkia: not there to pick (a key press included)
      if (palkia?.removed.includes(id)) return
      setChosen(id)
      setAnswering(true)
      if (!coached) {
        setCoached(true)
        saveFlag(COACHED_KEY)
      }
      const streakBefore = status?.streak ?? 0
      engine
        .answer(round, id)
        .then((result) => {
          setVerdict(result)
          if (engine.rewards) setStatus(result.status)
          setLostStreak(result.outcome === 'right' ? 0 : streakBefore)
          setChests(result.chests)
          if (result.gift || result.chests.length) refreshBag()
          // the result takes over; Enter / the button moves on
          requestAnimationFrame(() => nextRef.current?.focus())
        })
        .catch(() => {
          // NOTE - Answered elsewhere (another tab) or the verdict lost on
          // the way: the round still waiting is played on; one that is over
          // is said so, and the player starts the next round (a turn)
          setChosen(null)
          engine
            .status()
            .then((value) => {
              setStatus(value)
              if (value.pending) showRound(value.pending)
              else {
                refreshBag()
                setLost(true)
              }
            })
            .catch(() => setLost(true))
        })
        .finally(() => setAnswering(false))
    },
    [
      engine,
      round,
      chosen,
      answering,
      loaded,
      coached,
      status,
      showRound,
      palkia,
    ]
  )
  const onVeilDone = useCallback(() => choose(TIME_UP), [choose])

  // NOTE - The Roar of Time stops the round at once, then asks the engine:
  // refused (no charge left on another device), the stop is taken back and
  // the veil catches up with the time that went by
  const stopTime = useCallback(() => {
    if (!engine?.rewards || !round || !loaded || revealed || answering) return
    if (stoppedId === round.id || timeLeft <= 0) return
    const at = performance.now()
    stopRef.current = { at, until: at + FREEZE_MS }
    setStoppedId(round.id)
    setFreeze({ until: at + FREEZE_MS, fresh: true, phase: 'hold' })
    setTimeNote('')
    fxRef.current?.hold(at + FREEZE_MS)
    engine
      .timeStop(round)
      .then((stopped) => {
        // Palkia's turn comes once Dialga's clock face is gone
        if (stopped.removed.length || stopped.letter)
          palkiaTimer.current = window.setTimeout(
            () => {
              if (roundId.current !== stopped.id) return
              setPalkia({
                removed: stopped.removed,
                letter: stopped.letter,
                fresh: true,
              })
              setPalkiaNote(palkiaSays(stopped.removed.length, stopped.letter))
            },
            Math.max(0, at + PALKIA_AFTER - performance.now())
          )
        return engine.status()
      })
      .then(setStatus)
      .catch((error: Error) => {
        stopRef.current = null
        fxRef.current?.hold(0)
        setStoppedId(error.message === 'time_used' ? round.id : null)
        setFreeze(null)
        setTimeNote(
          error.message === 'time_used'
            ? 'Vòng này đã dừng rồi'
            : 'Hết lượt Gầm Thời Gian'
        )
        engine
          .status()
          .then(setStatus)
          .catch(() => {})
      })
  }, [engine, round, loaded, revealed, answering, stoppedId, timeLeft])

  // answered while time is stopped: the result's bursts fly at once
  useEffect(() => {
    if (revealed) fxRef.current?.hold(0)
  }, [revealed])

  useEffect(() => {
    if (!palkiaNote) return
    const timer = window.setTimeout(() => setPalkiaNote(''), 3000)
    return () => clearTimeout(timer)
  }, [palkiaNote])
  useEffect(() => () => clearTimeout(palkiaTimer.current), [])

  useEffect(() => {
    if (!timeNote) return
    const timer = window.setTimeout(() => setTimeNote(''), 3500)
    return () => clearTimeout(timer)
  }, [timeNote])

  // the charges' 2 hours are over: the engine has them back
  const timeBack = timeRefillAt > 0 && now >= timeRefillAt
  useEffect(() => {
    if (timeBack)
      engine
        ?.status()
        .then(setStatus)
        .catch(() => {})
  }, [timeBack, engine])

  // the prize drops a notch: its gift breaks out of the orb's top edge
  const onDrop = useCallback((tier: number) => {
    if (reducedMotion()) return
    fxRef.current?.burst({
      x: 0.5,
      y: 0.98,
      count: 26,
      colors: [TIERS[tier].color, '#9aa3b2', '#ffffff'],
      speed: 6,
      angle: -Math.PI / 2,
      spread: 1.6,
      gravity: 0.22,
      shapes: ['rect', 'dot'],
      life: 900,
    })
  }, [])

  const playCry = () => {
    if (!round || !engine) return
    audio.current?.pause()
    const sound = new Audio(engine.cry(round))
    sound.volume = 0.6
    audio.current = sound
    sound.play().catch(() => {})
  }

  // 1–4 answer (not while a field or a menu has the keyboard)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!round || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement
      if (
        target.closest(
          'input, textarea, select, dialog, [role="dialog"], [role="listbox"], [role="combobox"]'
        )
      )
        return
      if (event.key === 't' || event.key === 'T') {
        event.preventDefault()
        stopTime()
        return
      }
      const n = Number(event.key)
      if (!playHard && !revealed && n >= 1 && n <= round.options.length) {
        event.preventDefault()
        choose(round.options[n - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [round, revealed, choose, playHard, stopTime])

  useEffect(() => () => audio.current?.pause(), [])

  // every name on one line, whatever its length: the banner within the
  // stage's frame (rotated, with its shadow), the answers within their slab
  useLayoutEffect(() => {
    const fit = () => {
      const stage = stageRef.current
      if (revealRef.current && stage)
        fitText(revealRef.current, stage.clientWidth * 0.7)
      optionsRef.current
        ?.querySelectorAll<HTMLElement>('button > span')
        .forEach((name) => fitText(name, name.clientWidth))
    }
    fit()
    // the display font may arrive after the first measure
    document.fonts?.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [round, revealed, playHard, speciesById])

  // the gift leaves the fuse in a burst of its colour and flies to its card;
  // a milestone fires the cannons
  useEffect(() => {
    if (!won || !round || reducedMotion()) return
    const tier = itemById(won.id).tier
    const timers = [
      window.setTimeout(() => {
        const fx = fxRef.current
        const stage = stageRef.current
        if (!fx || !stage) return
        // up from the orb hanging under the stage
        fx.burst({
          x: 0.5,
          y: 0.97,
          angle: -Math.PI / 2,
          spread: Math.PI * 1.2,
          count: 30 + tier * 18,
          colors: tierColors(tier),
          speed: 6 + tier * 1.5,
          gravity: 0.18,
          shapes: ['star', 'dot'],
          life: 1300,
        })
        if (milestoneOf(streak))
          for (const [x, angle] of [
            [0.02, -Math.PI / 3],
            [0.98, (-2 * Math.PI) / 3],
          ])
            fx.burst({
              x,
              y: 1,
              count: 70,
              colors: PARTY,
              speed: 16,
              angle,
              spread: 0.6,
              gravity: 0.3,
              shapes: ['rect', 'star'],
              life: 2200,
            })
      }, REVEAL_AT + 150),
      window.setTimeout(
        () =>
          flyTo(
            document.querySelector('.prize .prize-gem'),
            lootRef.current,
            itemSprite(won.id),
            TIERS[tier].color
          ),
        REVEAL_AT + 260
      ),
    ]
    return () => timers.forEach((timer) => clearTimeout(timer))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won])

  // time is up: the spark fizzles out at the end of the fuse
  useEffect(() => {
    if (!timeUp || reducedMotion()) return
    fxRef.current?.burst({
      x: 0.96,
      y: 0.9,
      count: 26,
      colors: ['#5b6270', '#9aa3b2', '#ff9d3c'],
      speed: 3,
      angle: -Math.PI / 2,
      spread: 1.2,
      gravity: -0.02,
      shapes: ['dot'],
      life: 1200,
    })
  }, [timeUp])

  // catching is the player's call, and only after a right answer: the
  // turn's ball is thrown, swallows the Pokémon, shakes three times, clicks
  const catchIt = () => {
    if (!round || !correct || catchPhase) return
    if (answerId && !isCaught(answerId)) toggleCaught(answerId)
    if (reducedMotion()) {
      setCatchPhase('done')
      return
    }
    setCatchPhase('throw')
  }
  useEffect(() => {
    if (catchPhase !== 'throw') return
    const timer = window.setTimeout(() => {
      setCatchPhase('done')
      const stage = stageRef.current
      if (!stage) return
      fxRef.current?.burst({
        x: 0.5,
        y: landY(stage),
        count: 90,
        colors: PARTY,
        speed: 10,
        gravity: 0.24,
        life: 1500,
      })
    }, CLICK_AT)
    return () => clearTimeout(timer)
  }, [catchPhase])

  // a holographic card under a mouse: the stage tilts toward the pointer, a
  // glare follows it and the silhouette floats a little in front of the rays
  useEffect(() => {
    const stage = stageRef.current
    if (
      !stage ||
      reducedMotion() ||
      !matchMedia('(hover: hover) and (pointer: fine)').matches
    )
      return
    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = stage.getBoundingClientRect()
        const px = (event.clientX - box.left) / box.width - 0.5
        const py = (event.clientY - box.top) / box.height - 0.5
        stage.style.setProperty('--rx', `${(-py * 9).toFixed(2)}deg`)
        stage.style.setProperty('--ry', `${(px * 11).toFixed(2)}deg`)
        stage.style.setProperty('--tx', (px * 18).toFixed(1))
        stage.style.setProperty('--ty', (py * 14).toFixed(1))
        stage.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`)
        stage.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`)
        stage.dataset.tilt = ''
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(frame)
      for (const name of ['--rx', '--ry', '--tx', '--ty'])
        stage.style.removeProperty(name)
      delete stage.dataset.tilt
    }
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
    }
    // the stage is swapped for the healing machine while out of turns
  }, [locked])

  const submitGuess = (event: FormEvent) => {
    event.preventDefault()
    if (!round || chosen !== null || !guess.trim()) return
    // the typed name, as the Pokémon it names (or none): the engine judges
    choose(findGuess(guess, species))
  }
  const skip = () => {
    // a skip is not a guess: the result must not quote the half-typed text
    setGuess('')
    choose(-1)
  }

  const [shared, setShared] = useState('')
  const shareStreak = async () => {
    const text = `Mình đã đạt chuỗi ${COMBO_AT} Pokémon đoán đúng ${recordsTotal} lần trong “Who’s That Pokémon?”. Thử xem bạn được mấy?`
    const url = location.pathname + location.search
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Who’s That Pokémon? – Pokédex',
          text,
          url,
        })
        return
      }
      await navigator.clipboard.writeText(
        `${text} ${window.location.origin}${url}`
      )
      setShared('Đã sao chép lời thách đấu')
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError')
        setShared('Không chia sẻ được')
    }
  }

  if (isError || imageFailed || lost) {
    return (
      <QuizStyle className="quiz-page">
        <div className="arena">
          <div className="stage stage--empty">
            {!isError && !lost && <WildGrass fled />}
            <p>
              {isError
                ? 'Không tải được danh sách Pokémon.'
                : lost
                  ? 'Không nhận được kết quả lượt này. Quà nếu có đã vào túi đồ.'
                  : 'Nó chạy mất rồi! Không tải được hình Pokémon.'}
            </p>
            <button
              type="button"
              className="next"
              onClick={() => {
                imageErrors.current = 0
                setImageFailed(false)
                setLost(false)
                if (isError) refetch()
                else if (lost) {
                  setRound(null)
                  resume()
                } else if (round && engine)
                  engine
                    .reroll(round)
                    .then(showRound)
                    // the artwork came through the server: load it again
                    .catch((error: Error) =>
                      setImageFailed(error.message !== 'art_ok')
                    )
                else next()
              }}
            >
              {lost ? 'Lượt tiếp' : 'Thử lại'}
            </button>
          </div>
        </div>
      </QuizStyle>
    )
  }

  const answerName = answerId ? nameOf(answerId) : ''
  const milestone = correct ? milestoneOf(streak) : ''
  const alreadyCaught =
    correct && !!answerId && !catchPhase && isCaught(answerId)
  const settingsLabel = `${generation ? generation.name : 'Mọi thế hệ'} · ${hard ? 'Khó' : 'Dễ'}`
  const bagCount = bagSize(bag ?? {})
  // the ball in play: the turn this round was paid with
  const live = Boolean(round) && !revealed

  return (
    <QuizStyle
      className="quiz-page"
      data-state={!revealed ? 'guess' : correct ? 'right' : 'wrong'}
      data-tier={tierOf(streak)}
    >
      <div className="arena">
        <header className="hud">
          {/* the anime's own words, as on its eyecatch card */}
          <h1 className="title">
            <span>Who’s that</span> <span>Pokémon?</span>
          </h1>
          {rewards && (
            <LinkCustom className="bag-toggle" to="/tui-do">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6V5a3 3 0 0 1 6 0v1h2.5A2.5 2.5 0 0 1 20 8.5v10A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-10A2.5 2.5 0 0 1 6.5 6zm2 0h2V5a1 1 0 0 0-2 0zm-3 6v2h8v-2z" />
              </svg>
              <span className="sr-only">Túi đồ, </span>
              {bagCount > 0 && (
                <b key={bagCount} className="bag-count" aria-hidden="true">
                  {badgeCount(bagCount)}
                </b>
              )}
              <span className="sr-only">{fullCount(bagCount)} món</span>
            </LinkCustom>
          )}
          <button
            type="button"
            className="settings-toggle"
            aria-expanded={settingsOpen}
            aria-controls="quiz-settings"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.7a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.7a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
            </svg>
            <span className="sr-only">Cài đặt: </span>
            <span className="settings-label">{settingsLabel}</span>
          </button>
        </header>

        {/* three rings alike, each around the ball it leads to; a tap tells
            the exact count and what it is for */}
        {rewards ? (
          <div className="trainer">
            {(
              [
                {
                  kind: 'turns',
                  label: 'Lượt',
                  count: left,
                  goal: TURNS,
                },
                {
                  kind: 'streak',
                  label: 'Chuỗi',
                  count: streak,
                  goal: COMBO_AT,
                },
                {
                  kind: 'records',
                  label: 'Kỷ lục',
                  count: records,
                  goal: SPECIAL_AT,
                },
              ] as const
            ).map(({ kind, label, count, goal }) => (
              <button
                key={kind}
                type="button"
                className="meter"
                data-kind={kind}
                data-live={(kind === 'turns' && live) || undefined}
                data-near={
                  (kind !== 'turns' && count >= goal - 2 && count < goal) ||
                  undefined
                }
                data-full={count >= goal || undefined}
                data-broken={
                  (kind === 'streak' &&
                    revealed &&
                    !correct &&
                    lostStreak > 0) ||
                  undefined
                }
                aria-pressed={hint === kind}
                onClick={() => setHint((open) => (open === kind ? '' : kind))}
                style={
                  {
                    '--p': Math.min(1, count / goal),
                    '--n': goal,
                  } as CSSProperties
                }
              >
                <span
                  key={`${kind}-${count}`}
                  className="meter-ring"
                  aria-hidden="true"
                >
                  <span className="meter-ball" />
                </span>
                {kind === 'turns' && refill > 0 && left < TURNS ? (
                  <span className="meter-label" data-clock>
                    <span className="sr-only">{label}: </span>⟳{' '}
                    {clock(refill - now)}
                  </span>
                ) : (
                  <span className="meter-label">{label}</span>
                )}
                <span className="sr-only">
                  {' '}
                  {count}/{goal}
                </span>
              </button>
            ))}
            {hint && (
              <p className="trainer-hint" role="status">
                {
                  {
                    turns: (
                      <>
                        Còn{' '}
                        <b>
                          {left}/{TURNS}
                        </b>{' '}
                        lượt.{' '}
                        {refill > 0 && left < TURNS
                          ? `Đầy lại sau ${clock(refill - now)}.`
                          : `${TURNS} lượt mỗi 3 giờ, tính từ câu đầu tiên.`}
                      </>
                    ),
                    streak: (
                      <>
                        Chuỗi{' '}
                        <b>
                          {streak}/{COMBO_AT}
                        </b>
                        . Đúng {COMBO_AT} câu liền nhận Premier Ball quà tặng
                        (3–5 món); sai là đứt chuỗi.
                      </>
                    ),
                    records: (
                      <>
                        Kỷ lục{' '}
                        <b>
                          {records}/{SPECIAL_AT}
                        </b>
                        . Mỗi chuỗi {COMBO_AT} là một kỷ lục; đủ {SPECIAL_AT}{' '}
                        nhận Master Ball đặc biệt (10 món).
                      </>
                    ),
                  }[hint]
                }
              </p>
            )}
          </div>
        ) : accounts ? (
          // a guest: what signing in brings, where the rings would be
          <LinkCustom
            className="guest-call"
            to="/dang-nhap"
            state={{ from: location.pathname + location.search }}
          >
            <span className="guest-balls" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="guest-text">
              <b>Đăng nhập để nhận quà, lượt chơi và chuỗi</b>
              <small>Quà quý, Premier Ball, Master Ball… cất vào túi đồ.</small>
            </span>
            <span className="guest-arrow" aria-hidden="true">
              ►
            </span>
          </LinkCustom>
        ) : null}

        <div
          id="quiz-settings"
          className="settings"
          data-open={settingsOpen || undefined}
        >
          <AppSelect
            label="Thế hệ"
            value={generation?.id ?? 'all'}
            options={[
              // Radix Select reads '' as "nothing chosen" and shows a blank box
              { value: 'all', label: 'Mọi thế hệ' },
              ...GENERATIONS.map((gen) => ({
                value: gen.id,
                label: `${gen.name} (#${gen.start}–${gen.end})`,
              })),
            ]}
            onValueChange={(value) =>
              setSetting('gen', value === 'all' ? '' : value)
            }
          />
          <div className="mode" role="group" aria-label="Độ khó">
            <button
              type="button"
              aria-pressed={!hard}
              onClick={() => setSetting('mode', '')}
            >
              Dễ · 4 lựa chọn
            </button>
            <button
              type="button"
              aria-pressed={hard}
              onClick={() => setSetting('mode', 'hard')}
            >
              Khó · tự gõ tên · có TM/HM
            </button>
          </div>
          <p className="settings-note">Thay đổi áp dụng từ lượt sau.</p>
        </div>

        <div
          className="stage-wrap"
          data-frozen={
            (freeze && !revealed && freeze.phase !== 'thaw' && freeze.phase) ||
            undefined
          }
        >
          {locked ? (
            <Recharge
              refill={restUntil || refill}
              now={now}
              timeLeft={timeLeft}
              timeRefillAt={timeRefillAt}
              onTimeRefill={
                engine?.rewards
                  ? async () => setStatus(await engine.timeRefill())
                  : undefined
              }
              onPlay={() => {
                setRestUntil(0)
                next()
              }}
            />
          ) : (
            <div
              ref={stageRef}
              className="stage"
              aria-busy={!round || !loaded}
              data-veil={round?.veil}
              data-veiled={(loaded && !revealed) || undefined}
              data-catch={catchPhase || undefined}
              data-frozen={
                (freeze && !revealed && freeze.phase !== 'thaw') || undefined
              }
            >
              <span className="burst" aria-hidden="true" />
              <span className="ring" aria-hidden="true" />
              <span className="glare" aria-hidden="true" />
              {(!round || !loaded) && <WildGrass />}
              {round && loaded && encounter === round.id && (
                <Encounter onEnd={() => setEncounter(null)} />
              )}
              {catchPhase && (
                // the turn's ball: thrown, swallows the Pokémon, shakes, clicks
                <span className="capture" aria-hidden="true">
                  <span className="speedlines" />
                  <span className="shock" />
                  <span className="ball">
                    <span className="ball-body">
                      <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" fill="#f4f4f4" />
                        <path d="M4 50a46 46 0 0 1 92 0z" fill="#e3350d" />
                        <path
                          d="M8 38a44 44 0 0 1 30-28"
                          stroke="rgba(255,255,255,.55)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="#14161a"
                          strokeWidth="6"
                        />
                        <path d="M4 50h92" stroke="#14161a" strokeWidth="7" />
                        <circle
                          cx="50"
                          cy="50"
                          r="14"
                          fill="#f4f4f4"
                          stroke="#14161a"
                          strokeWidth="6"
                        />
                        <circle className="ball-button" cx="50" cy="50" r="6" />
                      </svg>
                    </span>
                    <span className="ball-stars">
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                </span>
              )}
              {round && (
                <Veil
                  key={round.id}
                  id={veilSeed(round)}
                  src={engine?.art(round) ?? ''}
                  alt={revealed ? answerName : 'Bóng đen của một Pokémon bí ẩn'}
                  kind={round.veil}
                  loaded={loaded}
                  revealed={revealed}
                  duration={round.durationMs / 1000}
                  wallClock
                  onLoad={onImageLoad}
                  onError={onImageError}
                  onDone={onVeilDone}
                  stageRef={stageRef}
                  remainingRef={veilLeft}
                  elapsedRef={veilElapsed}
                  stopRef={stopRef}
                />
              )}
              {revealed && (
                <>
                  <span
                    key={`flash-${round?.id}`}
                    className="flash"
                    aria-hidden="true"
                  />
                  <p
                    key={`reveal-${round?.id}`}
                    ref={revealRef}
                    className="reveal"
                    data-caught={catchPhase === 'done' || undefined}
                    aria-hidden="true"
                  >
                    {answerName}!
                  </p>
                </>
              )}
              <Fx ref={fxRef} />
              {round && loaded && !revealed && (
                // the veil's name, as an eyecatch title card that clears away
                <span
                  key={`title-${round.id}`}
                  className="title-card"
                  aria-hidden="true"
                >
                  {VEIL_LABEL[round.veil]}
                </span>
              )}
              <button
                type="button"
                className="cry"
                onClick={playCry}
                disabled={!round}
                aria-label="Gợi ý: nghe tiếng kêu"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
                </svg>
                <span className="cry-label">Nghe tiếng kêu</span>
              </button>
              {freeze && !revealed && (
                <TimeStopFx
                  key={freeze.until}
                  until={freeze.until}
                  fresh={freeze.fresh}
                  onPhase={(phase) =>
                    setFreeze((value) => value && { ...value, phase })
                  }
                  onEnd={() => setFreeze(null)}
                />
              )}
              {rewards && round && (
                <TimePower
                  left={timeLeft}
                  refillAt={timeRefillAt}
                  now={now}
                  disabled={
                    !loaded || revealed || answering || stoppedId === round.id
                  }
                  onUse={stopTime}
                />
              )}
              {timeNote && (
                <p className="time-note" role="status">
                  {timeNote}
                </p>
              )}
              {palkia?.fresh && !revealed && (
                <PalkiaRift
                  key={`rift-${round?.id}`}
                  onEnd={() =>
                    setPalkia((value) => value && { ...value, fresh: false })
                  }
                />
              )}
              {palkia?.letter && !revealed && (
                <PalkiaLetter letter={palkia.letter} />
              )}
              {palkiaNote && !revealed && (
                <p className="palkia-note" role="status">
                  {palkiaNote}
                </p>
              )}
              {round && loaded && !revealed && round.gifts.length > 0 && (
                <p className="sr-only">
                  Quà nếu đoán đúng ngay: {itemById(round.gifts[0]).name}. Quà
                  giảm dần theo thời gian:{' '}
                  {round.gifts.map((id) => itemById(id).name).join(', ')}.
                </p>
              )}
            </div>
          )}
          {rewards && !locked && !(round && loaded) && <PrizeSlot />}
          {rewards && !locked && round && loaded && (
            <Prize
              key={`prize-${round.id}`}
              gifts={round.gifts}
              bonus={round.bonus}
              result={!revealed ? 'live' : won ? 'won' : 'lost'}
              won={won?.slot ?? -1}
              remainingRef={veilLeft}
              onDrop={onDrop}
            />
          )}
        </div>

        {revealed && round ? (
          // NOTE - The verdict takes the answers' place, under the thumb:
          // what happened, what it paid (or what it cost), what's next
          <section
            className="verdict"
            data-tone={correct ? 'right' : timeUp ? 'time' : 'wrong'}
            aria-labelledby="quiz-verdict"
          >
            <div className="verdict-head">
              <p
                id="quiz-verdict"
                className="verdict-title"
                role="status"
                aria-live="polite"
              >
                {correct ? 'Chính xác!' : timeUp ? 'Hết giờ!' : 'Trượt rồi!'}
                <span className="sr-only"> Đó là {answerName}.</span>
              </p>
              <p className="verdict-sub">
                {!rewards ? (
                  `Đó là ${answerName}.`
                ) : correct ? (
                  chests.length ? (
                    <b>Chuỗi {COMBO_AT}! Mở quà ngay.</b>
                  ) : (
                    <>
                      Chuỗi <b>{streak}</b>/{COMBO_AT}
                      {milestone
                        ? ` · ${milestone}`
                        : ` · còn ${COMBO_AT - streak} câu nữa là mở quà`}
                    </>
                  )
                ) : (
                  <>
                    {timeUp
                      ? 'Quả cầu đã rơi hết quà.'
                      : playHard
                        ? guess.trim()
                          ? `Bạn đoán “${guess.trim()}”.`
                          : 'Bạn đã bỏ qua.'
                        : `Bạn chọn ${nameOf(chosen ?? undefined)}.`}
                    {lostStreak > 0 && <b> Mất chuỗi {lostStreak}.</b>}
                  </>
                )}
              </p>
            </div>
            {won ? (
              <Loot
                ref={lootRef}
                key={`loot-${round.id}`}
                id={won.id}
                bonus={won.bonus}
                onOpen={setItemOpen}
              />
            ) : missed ? (
              <Loot
                key={`missed-${round.id}`}
                id={missed}
                bonus={false}
                missed
                onOpen={setItemOpen}
              />
            ) : null}
            <div className="actions">
              {correct && (
                <button
                  type="button"
                  className="catch"
                  disabled={Boolean(catchPhase) || alreadyCaught}
                  data-done={
                    catchPhase === 'done' || alreadyCaught || undefined
                  }
                  onClick={catchIt}
                >
                  <Pokeball />
                  {catchPhase === 'throw'
                    ? 'Đang bắt…'
                    : catchPhase === 'done'
                      ? 'Đã bắt'
                      : alreadyCaught
                        ? 'Đã có'
                        : 'Bắt'}
                  <span className="sr-only">
                    {' '}
                    {answerName}
                    {catchPhase || alreadyCaught
                      ? ', có trong bộ sưu tập'
                      : ' vào bộ sưu tập'}
                  </span>
                </button>
              )}
              {/* a chest won is opened before moving on; resting, the bag
                  and the collection are what is left to do */}
              {restUntil && !chests.length ? (
                <QuickLinks bagCount={bagCount} />
              ) : (
                <button
                  ref={nextRef}
                  type="button"
                  className="next"
                  data-chest={chests[chests.length - 1]?.kind}
                  onClick={() =>
                    chests.length
                      ? setChestOpen(true)
                      : left > 0
                        ? next()
                        : setRestUntil(refill)
                  }
                >
                  {chests.length
                    ? chests.length > 1
                      ? 'Mở 2 quà ►'
                      : 'Mở quà ►'
                    : left > 0
                      ? 'Tiếp theo ►'
                      : 'Xem giờ hồi ►'}
                </button>
              )}
            </div>
            {left === 0 && refill > 0 && !restUntil && (
              <p className="last-turn">
                Đó là lượt cuối. Bóng mới hồi đầy sau {clock(refill - now)}.
              </p>
            )}
            <div className="links">
              <LinkCustom
                to={toPath(speciesById.get(answerId ?? 0)?.name ?? '')}
              >
                Xem hồ sơ {answerName}
              </LinkCustom>
              {recordsTotal > 0 && (
                <button type="button" onClick={shareStreak}>
                  Thách bạn bè · {recordsTotal} lần chuỗi {COMBO_AT}
                </button>
              )}
            </div>
            {shared && <p className="shared">{shared}</p>}
          </section>
        ) : locked ? (
          <Recap
            wins={status?.wins ?? 0}
            played={status?.used ?? 0}
            bonus={status?.bonus ?? 0}
            gifts={status?.windowGifts ?? []}
            bagCount={bagCount}
            onPick={setItemOpen}
          />
        ) : (
          <>
            {playHard ? (
              <form className="guess" onSubmit={submitGuess}>
                <label htmlFor="quiz-guess">Tên Pokémon này là…</label>
                <div className="guess-row">
                  <input
                    id="quiz-guess"
                    ref={guessRef}
                    value={guess}
                    onChange={(event) => setGuess(event.target.value)}
                    disabled={!round || !loaded}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    placeholder="Ví dụ: Pikachu"
                  />
                  <button
                    type="submit"
                    disabled={!round || !loaded || !guess.trim()}
                  >
                    Đoán
                  </button>
                </div>
                <button
                  type="button"
                  className="skip"
                  disabled={!round || !loaded}
                  onClick={skip}
                >
                  Bỏ qua lượt này
                </button>
              </form>
            ) : (
              <ol
                ref={optionsRef}
                className="options"
                aria-label="Chọn tên Pokémon"
              >
                {(round?.options ?? Array.from({ length: 4 }, () => null)).map(
                  (option, index) => {
                    // NOTE - Taken by Palkia: the button twists away inside
                    // its own place, a scar of torn space stays; the grid
                    // keeps its 4 cells, nothing moves
                    const gone = !!option && !!palkia?.removed.includes(option)
                    return (
                      <li
                        key={option ?? index}
                        data-removed={
                          gone ? (palkia?.fresh ? 'fresh' : 'gone') : undefined
                        }
                      >
                        <button
                          type="button"
                          disabled={!option || !loaded || answering || gone}
                          aria-label={
                            gone
                              ? `${nameOf(option)}: Palkia đã loại`
                              : undefined
                          }
                          aria-keyshortcuts={String(index + 1)}
                          onClick={() => option && choose(option)}
                          style={{ '--i': index } as CSSProperties}
                        >
                          <kbd aria-hidden="true">{index + 1}</kbd>
                          <span>{option ? nameOf(option) : '…'}</span>
                        </button>
                      </li>
                    )
                  }
                )}
              </ol>
            )}
            {!coached && rewards && (
              <p className="coach">
                Quả cầu dưới khung giữ một món quà: hết vòng sáng là quà tụt
                hạng. <b>Đoán càng sớm, quà càng quý</b>, hết giờ là mất quà!
                Đúng {COMBO_AT} câu liền nối đủ sợi xích để nhận Premier Ball;
                gom {SPECIAL_AT} Premier Ball đổi lấy Master Ball.
              </p>
            )}
          </>
        )}
      </div>

      <ChestDialog
        chests={chests}
        open={chestOpen}
        onPick={setItemOpen}
        onClose={() => {
          setChestOpen(false)
          setChests([])
        }}
      />
      <ItemDialog
        id={itemOpen}
        count={itemOpen ? (bag[itemOpen] ?? 0) : 0}
        onClose={() => setItemOpen(null)}
      />
    </QuizStyle>
  )
}
