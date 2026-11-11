import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIndividualList } from 'pages/BagPage/individuals/individualStore'
import IndividualArt from 'pages/BagPage/individuals/IndividualArt'
import type { Individual } from 'pages/BagPage/individuals/client'
import { itemById, itemSprite } from 'pages/QuizPage/items.mjs'
import RoomSprite from 'pages/MyPokemonPage/room/RoomSprite'
import { initialCare, needsNow } from 'pages/MyPokemonPage/care/care.mjs'
import { MY_POKEMON_PATH } from 'pages/MyPokemonPage/paths.mjs'
import GameSheet from './GameSheet'
import { GAMES } from './games/index.mjs'
import { BADGES } from './badges.mjs'
import { remainingMs, ringProgress } from './countdown.mjs'
import {
  MINIGAME,
  bondOf,
  canPlay,
  careCost,
  winExp,
  xpFor,
} from './minigame.mjs'
import { toneOf } from './tone.mjs'
import {
  type FlipResult,
  type Receipt,
  type RoundView,
  useMiniGame,
} from './useMiniGame'
import { useSpeciesNames } from './useSpeciesNames'

type Phase = 'pick' | 'level' | 'count' | 'play' | 'result'
type Care = { hunger: number; needsAt: string; affection: number }
type Round = {
  id: string | null
  deadline: string | number
  view: RoundView
  difficulty: 1 | 2 | 3
  practice: { flip: (i: number) => Promise<FlipResult> } | null
}
type Outcome = Receipt | { practice: true; status: 'won' | 'lost'; flips: number }

const LOW_MS = 60_000
const LABELS = ['Dễ', 'Thường', 'Khó']
const NEEDS_NAME: Record<string, string> = { hunger: 'No', clean: 'Sạch', fun: 'Vui' }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const until = (iso: string | null, now: number) => {
  if (!iso) return ''
  const m = Math.max(1, Math.ceil((new Date(iso).getTime() - now) / 60_000))
  return m >= 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m} phút`
}
const pct = (xp: number, level: number) => {
  const from = xpFor(level)
  const to = level >= MINIGAME.LEVEL_MAX ? from + 1 : xpFor(level + 1)
  return level >= MINIGAME.LEVEL_MAX ? 100 : Math.round(((xp - from) / (to - from)) * 100)
}

export default function MiniGameHost({
  game,
  individualId,
  onClose,
}: {
  game: string
  individualId?: string
  onClose: () => void
}) {
  const def = GAMES.find((g) => g.id === game)
  const mg = useMiniGame()
  const nameOf = useSpeciesNames()
  const listed = mg.mode === 'server' || mg.mode === 'local'
  const { items } = useIndividualList(listed, null)
  const [cares, setCares] = useState<Record<string, Care>>({})
  const [picked, setPicked] = useState<string | null>(individualId ?? null)
  const [phase, setPhase] = useState<Phase>(individualId ? 'level' : 'pick')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2)
  const [count, setCount] = useState(3)
  const [round, setRound] = useState<Round | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [before, setBefore] = useState<{ xp: number; level: number } | null>(null)
  const [barPct, setBarPct] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [mood, setMood] = useState<'cheer' | 'miss' | 'doze' | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [retry, setRetry] = useState(false)
  const settling = useRef(false)
  const flips = useRef(0)
  const resumed = useRef(false)

  const individual: Individual | null =
    items?.find((item: Individual) => item.id === picked) ?? null
  const tone = useMemo(() => toneOf(individual), [individual])
  const server = mg.mode === 'server'
  const gameStatus = mg.status?.games?.[game]

  useEffect(() => {
    if (server)
      mg.cares().then(setCares, () => {})
    // load once per account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server])

  // a round already open on the account is the one to play
  useEffect(() => {
    const open = mg.status?.open
    if (resumed.current || !open || open.game !== game) return
    resumed.current = true
    setPicked(open.individualId)
    setDifficulty(open.difficulty as 1 | 2 | 3)
    setRound({
      id: open.round,
      deadline: open.deadline,
      view: open.view,
      difficulty: open.difficulty as 1 | 2 | 3,
      practice: null,
    })
    setPhase('play')
  }, [mg.status, game])

  useEffect(() => {
    if (phase !== 'play') return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'count') return
    if (count <= 0) return
    const timer = window.setTimeout(() => setCount((n) => n - 1), 800)
    return () => window.clearTimeout(timer)
  }, [phase, count])

  const careOf = useCallback(
    (item: Individual): Care => {
      const row = cares[item.id]
      if (row) return row
      const fresh = initialCare(item.createdAt)
      return { hunger: fresh.needs.hunger, needsAt: fresh.needsAt, affection: 0 }
    },
    [cares]
  )
  const hungerOf = (item: Individual) => {
    const care = careOf(item)
    return needsNow(
      { needs: { hunger: care.hunger, clean: 0, fun: 0 }, needsAt: care.needsAt },
      new Date()
    ).hunger
  }

  const left = gameStatus ? gameStatus.left : MINIGAME.TURNS
  const noTurns = server && left <= 0

  const begin = useCallback(async () => {
    setError(null)
    try {
      if (server) {
        if (!picked) return
        const started = await mg.start({ game, individualId: picked, difficulty })
        setBefore(mg.status ? { xp: mg.status.trainer.xp, level: mg.status.trainer.level } : null)
        setRound({
          id: started.round,
          deadline: started.deadline,
          view: started.view,
          difficulty,
          practice: null,
        })
        mg.refresh()
      } else {
        const practice = mg.practice(difficulty)
        setRound({
          id: null,
          deadline: practice.deadline,
          view: practice.view as RoundView,
          difficulty,
          practice,
        })
      }
      settling.current = false
      flips.current = 0
      setMood(null)
      setRetry(false)
      setNow(Date.now())
      setPhase('play')
    } catch (e: any) {
      setError(e?.message ?? mg.errors.network)
      setPhase('level')
    }
  }, [server, picked, mg, game, difficulty])

  useEffect(() => {
    if (phase === 'count' && count <= 0) begin()
    // begin changes with mg; the countdown ending is the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count])

  const settle = useCallback(
    async (won: boolean) => {
      if (!round || settling.current) return
      settling.current = true
      setRetry(false)
      if (!round.id) {
        setOutcome({ practice: true, status: won ? 'won' : 'lost', flips: flips.current })
        setPhase('result')
        return
      }
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          const receipt = await mg.finish({ round: round.id })
          setOutcome(receipt)
          setBarPct(before ? pct(before.xp, before.level) : 0)
          setPhase('result')
          return
        } catch (e: any) {
          // the server allows a little after the deadline: wait it out
          if (e?.code === 'not_finished' && !won) {
            await sleep(1000)
            continue
          }
          setError(e?.message ?? mg.errors.network)
          settling.current = false
          setRetry(true)
          return
        }
      }
      settling.current = false
      setRetry(true)
    },
    [round, mg, before]
  )

  const remaining = round
    ? remainingMs({
        deadline: round.deadline,
        now,
        offsetMs: round.id ? mg.serverOffsetMs : 0,
      })
    : 0
  useEffect(() => {
    if (phase === 'play' && round && remaining <= 0) settle(false)
  }, [phase, round, remaining, settle])
  useEffect(() => {
    if (phase === 'play' && remaining > 0 && remaining < LOW_MS) setMood('doze')
  }, [phase, remaining])

  useEffect(() => {
    if (phase !== 'result' || !mg.status || !outcome || 'practice' in outcome) return
    const timer = window.setTimeout(
      () => setBarPct(pct(mg.status!.trainer.xp, mg.status!.trainer.level)),
      80
    )
    return () => window.clearTimeout(timer)
  }, [phase, mg.status, outcome])

  const requestClose = () => {
    if (phase === 'play' || phase === 'count') setConfirming(true)
    else onClose()
  }

  const again = () => {
    setOutcome(null)
    setRound(null)
    setError(null)
    setPhase(individualId ? 'level' : 'pick')
    resumed.current = true
  }

  if (!def) return null
  const Board = def.Board
  const picks = items ?? []
  const trainer = mg.status?.trainer
  const bond = individual ? bondOf(careOf(individual).affection) : 1

  return (
    <GameSheet open onClose={requestClose} title={def.title} tone={tone}>
      {!server && mg.mode !== 'checking' && (
        <p className="mg-sub">
          Chơi thử: không mất lượt, không nhận thưởng. Đăng nhập để tính điểm và nhận quà.
        </p>
      )}
      {mg.loading && <p className="mg-sub">Đang tải…</p>}

      {phase === 'pick' && !mg.loading && (
        <>
          <p className="mg-sub">
            Chọn Pokémon cùng chơi.
            {server && ` Còn ${left}/${MINIGAME.TURNS} lượt.`}
          </p>
          {noTurns && (
            <p className="mg-why" role="status">
              Hết lượt. Lượt mới sau {until(gameStatus?.resetAt ?? null, now)}.
            </p>
          )}
          {picks.length === 0 && listed ? (
            <p className="mg-sub">
              Bạn chưa có Pokémon nào. Hãy đổi thẻ trong Túi đồ để có Pokémon của riêng mình.
            </p>
          ) : (
            <ul className="mg-list">
              {picks.map((item: Individual) => {
                const hunger = hungerOf(item)
                const ok = canPlay(hunger)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="mg-pick"
                      disabled={!ok || noTurns}
                      onClick={() => {
                        setPicked(item.id)
                        setPhase('level')
                      }}
                    >
                      <IndividualArt
                        speciesId={item.speciesId}
                        name={nameOf(item.speciesId)}
                        size={64}
                      />
                      <span>
                        <b>{item.nickname ?? nameOf(item.speciesId)}</b>
                        <span className="mg-meta">
                          <span>Thân thiết Lv {bondOf(careOf(item).affection)}</span>
                          <span>No {Math.round(hunger)}%</span>
                        </span>
                        <span className="mg-hunger" aria-hidden="true">
                          <i style={{ width: `${Math.round(hunger)}%` }} />
                        </span>
                        {!ok && (
                          <span className="mg-why" style={{ display: 'block' }}>
                            Đang đói (cần từ {MINIGAME.MIN_HUNGER}%).{' '}
                            <a href={`${MY_POKEMON_PATH}/${encodeURIComponent(item.id)}`}>
                              Cho ăn trong phòng
                            </a>
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {!listed && (
            <button type="button" className="mg-cta" onClick={() => setPhase('level')}>
              Chơi thử
            </button>
          )}
        </>
      )}

      {phase === 'level' && (
        <>
          <p className="mg-sub">
            {individual
              ? `${individual.nickname ?? nameOf(individual.speciesId)} · Thân thiết Lv ${bond}`
              : 'Chọn độ khó'}
          </p>
          <ul className="mg-list">
            {([1, 2, 3] as const).map((d) => {
              const low = winExp({ d, bond, remainingS: 0 })
              const high = winExp({ d, bond, remainingS: MINIGAME.DURATION_S })
              const grid = MINIGAME.GRID[d - 1]
              const cost = careCost(false, d)
              return (
                <li key={d}>
                  <button
                    type="button"
                    className="mg-pick"
                    style={{ gridTemplateColumns: '1fr' }}
                    disabled={noTurns}
                    onClick={() => {
                      setDifficulty(d)
                      setError(null)
                      setCount(3)
                      setPhase('count')
                    }}
                  >
                    <span>
                      <b>
                        {LABELS[d - 1]} · {grid.pairs} cặp
                      </b>
                      <span className="mg-meta">
                        <span>Exp {low}–{high}</span>
                        <span>Quà {MINIGAME.CHEST[d - 1].size} món</span>
                        <span>
                          Thua tốn {cost.hunger} no · {cost.clean} sạch · {cost.fun} vui
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {error && <p className="mg-error" role="alert">{error}</p>}
          {!individualId && (
            <button type="button" className="mg-cta" data-quiet onClick={() => setPhase('pick')}>
              Đổi Pokémon
            </button>
          )}
        </>
      )}

      {phase === 'count' && (
        <div className="mg-count" role="status" aria-live="assertive">
          {count > 0 ? count : '…'}
        </div>
      )}

      {phase === 'play' && round && (
        <div>
          <div className="mg-time" data-low={remaining < LOW_MS || undefined}>
            <span>{LABELS[round.difficulty - 1]}</span>
            <strong aria-label="Thời gian còn lại">{clock(remaining)}</strong>
          </div>
          <div className="mg-stage">
            <svg className="mg-ring" data-low={remaining < LOW_MS || undefined} aria-hidden="true">
              <rect x="2" y="2" rx="22" data-track style={{ width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }} />
              <rect
                x="2"
                y="2"
                rx="22"
                pathLength={1}
                strokeDasharray={`${ringProgress(remaining, MINIGAME.DURATION_S * 1000)} 1`}
                style={{ width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }}
              />
            </svg>
            <Board
              key={round.id ?? 'practice'}
              difficulty={round.difficulty}
              view={round.view}
              tone={tone}
              disabled={remaining <= 0 || settling.current}
              flip={(index: number) =>
                round.practice
                  ? round.practice.flip(index)
                  : mg.flip({ round: round.id as string, index })
              }
              onResult={(result: FlipResult) => {
                flips.current = result.flips
                if (result.match === true) {
                  setMood('cheer')
                  navigator.vibrate?.(12)
                } else if (result.match === false) {
                  setMood('miss')
                  navigator.vibrate?.(24)
                }
                if (result.done) settle(true)
              }}
              onError={(e: Error & { code?: string }) => {
                if (e.code === 'round_closed') settle(false)
                else setError(e.message)
              }}
            />
            {individual && (
              <span className="mg-mate" data-mood={mood ?? undefined} aria-hidden="true">
                <RoomSprite
                  speciesId={individual.speciesId}
                  name={nameOf(individual.speciesId)}
                  box={80}
                  appearance={individual.appearance}
                />
                {mood === 'doze' && <span className="mg-mate-bubble">💤</span>}
              </span>
            )}
          </div>
          {error && <p className="mg-error" role="alert">{error}</p>}
          {retry && (
            <button type="button" className="mg-cta" onClick={() => settle(remaining <= 0 ? false : true)}>
              Thử gửi kết quả lại
            </button>
          )}
        </div>
      )}

      {phase === 'result' && outcome && (
        <div className="mg-result" role="status">
          <h3>{outcome.status === 'won' ? 'Chiến thắng!' : 'Hết giờ rồi'}</h3>
          {'practice' in outcome ? (
            <>
              <p className="mg-sub">
                {outcome.status === 'won'
                  ? `Bạn ghép đủ cặp sau ${outcome.flips} lần lật. Đăng nhập để nhận thưởng thật.`
                  : 'Chơi thử không mất gì. Thử lại nhé!'}
              </p>
            </>
          ) : (
            <>
              <p className="mg-sub">
                +{outcome.exp} exp cho {individual?.nickname ?? (individual ? nameOf(individual.speciesId) : 'Pokémon')}
                {' · '}+{outcome.xp} điểm huấn luyện viên
              </p>
              <div className="mg-level" style={{ width: '100%' }}>
                <b>Cấp huấn luyện viên {outcome.level}</b>
                <span className="mg-bar" aria-hidden="true">
                  <i style={{ width: `${barPct}%` }} />
                </span>
              </div>
              {outcome.levelUp && <span className="mg-levelup">Lên cấp {outcome.level}!</span>}
              {outcome.gifts.length > 0 && (
                <ul className="mg-chips">
                  {outcome.gifts.map((id) => (
                    <li key={id} className="mg-chip mg-fly">
                      <img src={itemSprite(id)} alt="" />
                      {itemById(id)?.name ?? id}
                    </li>
                  ))}
                </ul>
              )}
              {outcome.badges.length > 0 && (
                <ul className="mg-chips">
                  {outcome.badges.map((id) => (
                    <li key={id} className="mg-chip mg-levelup">
                      Huy hiệu mới: {BADGES.find((b) => b.id === id)?.label ?? id}
                    </li>
                  ))}
                </ul>
              )}
              {outcome.needs && (
                <p className="mg-sub">
                  Pokémon mệt hơn:{' '}
                  {(['hunger', 'clean', 'fun'] as const)
                    .map((k) => `${NEEDS_NAME[k]} −${Math.round(outcome.cost[k])}`)
                    .join(' · ')}
                </p>
              )}
            </>
          )}
          {server && (
            <p className="mg-sub">
              {left > 0
                ? `Còn ${left}/${MINIGAME.TURNS} lượt.`
                : `Hết lượt. Lượt mới sau ${until(gameStatus?.resetAt ?? null, now)}.`}
            </p>
          )}
          {trainer && server && null}
          {left > 0 || !server ? (
            <button type="button" className="mg-cta" onClick={again}>
              Chơi tiếp
            </button>
          ) : null}
          <button type="button" className="mg-cta" data-quiet onClick={onClose}>
            Xong
          </button>
        </div>
      )}

      {confirming && (
        <div className="mg-confirm" role="alertdialog" aria-label="Thoát ván">
          <b>Thoát giữa ván?</b>
          <span className="mg-sub">Ván vẫn tính giờ. Hết giờ chưa xong thì thua và không hoàn lượt.</span>
          <button type="button" className="mg-cta" onClick={() => setConfirming(false)}>
            Chơi tiếp
          </button>
          <button
            type="button"
            className="mg-cta"
            data-quiet
            onClick={() => {
              setConfirming(false)
              onClose()
            }}
          >
            Thoát
          </button>
        </div>
      )}
    </GameSheet>
  )
}
