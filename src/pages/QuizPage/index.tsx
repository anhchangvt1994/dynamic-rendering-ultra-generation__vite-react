import { useGetPokemonListQuery } from 'app/apis/pokemon'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { functionGenerator } from 'utils/EnvHelper'
import { isCaught, toggleCaught } from 'utils/caught.mjs'
import {
  makeRound,
  quizLabel,
  readBest,
  saveBest,
  speciesFromList,
} from './quiz.mjs'
import { QuizStyle } from './styles'

type Species = { id: number; name: string }
type Round = { answer: Species; options: Species[] }

const toPath = functionGenerator(
  import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
)
const cryOf = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`

/**
 * "Ai đây?" — the anime's Who's that Pokémon?: a silhouette on a sunburst,
 * four names, a cry as a hint. A right answer reveals the Pokémon and adds
 * it to the collection; streaks are counted, the best one remembered.
 */
export default function QuizPage() {
  setSeoTag({
    title: 'Ai đây? – Đoán Pokémon qua bóng đen | Pokédex',
    description:
      'Trò chơi Who’s that Pokémon?: nhìn bóng đen, nghe tiếng kêu, đoán tên và bắt Pokémon vào bộ sưu tập.',
    robots: 'index, follow',
  })

  const { data, isError, refetch } = useGetPokemonListQuery({
    limit: 1500,
    offset: 0,
  })
  const species = useMemo(() => speciesFromList(data?.results), [data])

  const [round, setRound] = useState<Round | null>(null)
  const [chosen, setChosen] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(() => readBest())
  const [newlyCaught, setNewlyCaught] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const recent = useRef<number[]>([])
  const nextRef = useRef<HTMLButtonElement>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  const next = useCallback(() => {
    const fresh = makeRound(species, Math.random, recent.current)
    if (!fresh) return
    recent.current = [fresh.answer.id, ...recent.current].slice(0, 30)
    audio.current?.pause()
    setRound(fresh)
    setChosen(null)
    setNewlyCaught(false)
    setLoaded(false)
  }, [species])

  useEffect(() => {
    if (species.length && !round) next()
  }, [species, round, next])

  const revealed = chosen !== null
  const correct = revealed && chosen === round?.answer.id

  const choose = useCallback(
    (id: number) => {
      if (!round || chosen !== null) return
      setChosen(id)
      if (id === round.answer.id) {
        const streakNow = streak + 1
        setStreak(streakNow)
        if (streakNow > best) {
          setBest(streakNow)
          saveBest(streakNow)
        }
        if (!isCaught(round.answer.id)) {
          toggleCaught(round.answer.id)
          setNewlyCaught(true)
        }
      } else setStreak(0)
      // the result line takes over; Enter / the button moves on
      requestAnimationFrame(() => nextRef.current?.focus())
    },
    [round, chosen, streak, best]
  )

  const playCry = () => {
    if (!round) return
    audio.current?.pause()
    const sound = new Audio(cryOf(round.answer.id))
    sound.volume = 0.6
    audio.current = sound
    sound.play().catch(() => {})
  }

  // 1–4 answer, Enter / Space continue
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!round || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, [role="dialog"]')) return
      const n = Number(event.key)
      if (!revealed && n >= 1 && n <= round.options.length) {
        event.preventDefault()
        choose(round.options[n - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [round, revealed, choose])

  useEffect(() => () => audio.current?.pause(), [])

  if (isError) {
    return (
      <QuizStyle>
        <div className="stage stage--empty">
          <p>Không tải được danh sách Pokémon.</p>
          <button type="button" className="next" onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      </QuizStyle>
    )
  }

  const answerName = round ? quizLabel(round.answer.name) : ''

  return (
    <QuizStyle data-state={!revealed ? 'guess' : correct ? 'right' : 'wrong'}>
      <header className="intro">
        <h1>
          <span>Ai</span> đây?
        </h1>
        <dl className="score">
          <div>
            <dt>Chuỗi</dt>
            <dd key={streak} className="streak">
              {streak}
            </dd>
          </div>
          <div>
            <dt>Kỷ lục</dt>
            <dd>{best}</dd>
          </div>
        </dl>
      </header>

      <div className="stage" aria-busy={!round || !loaded}>
        <span className="burst" aria-hidden="true" />
        {round && (
          <img
            key={round.answer.id}
            className="mon"
            src={getPokemonImage(round.answer.id)}
            alt={revealed ? answerName : 'Bóng đen của một Pokémon bí ẩn'}
            width={280}
            height={280}
            decoding="async"
            data-loaded={loaded || undefined}
            onLoad={() => setLoaded(true)}
            draggable={false}
          />
        )}
        {revealed && (
          <p
            key={`reveal-${round?.answer.id}`}
            className="reveal"
            aria-hidden="true"
          >
            {answerName}!
          </p>
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
          Nghe tiếng kêu
        </button>
      </div>

      <ol className="options" aria-label="Chọn tên Pokémon">
        {(round?.options ?? Array.from({ length: 4 }, () => null)).map(
          (option, index) => {
            const state =
              !revealed || !option
                ? undefined
                : option.id === round?.answer.id
                  ? 'answer'
                  : option.id === chosen
                    ? 'miss'
                    : 'dim'
            return (
              <li key={option?.id ?? index}>
                <button
                  type="button"
                  disabled={!option || revealed}
                  data-state={state}
                  onClick={() => option && choose(option.id)}
                  style={{ '--i': index } as CSSProperties}
                >
                  <kbd aria-hidden="true">{index + 1}</kbd>
                  {option ? quizLabel(option.name) : '…'}
                </button>
              </li>
            )
          }
        )}
      </ol>

      <div className="result" role="status" aria-live="polite">
        {revealed && round && (
          <>
            <p>
              {correct ? (
                <>
                  <strong>Chính xác!</strong> Đó là {answerName}.
                  {newlyCaught && ' Đã thêm vào bộ sưu tập của bạn.'}
                </>
              ) : (
                <>
                  <strong>Chưa đúng.</strong> Đó là {answerName}
                  {streak === 0 && ' — chuỗi về 0.'}
                </>
              )}
            </p>
            <div className="actions">
              <LinkCustom className="profile" to={toPath(round.answer.name)}>
                Xem hồ sơ {answerName}
              </LinkCustom>
              <button
                ref={nextRef}
                type="button"
                className="next"
                onClick={next}
              >
                Pokémon tiếp theo
              </button>
            </div>
          </>
        )}
      </div>
    </QuizStyle>
  )
}
