import { getSupabase } from 'app/supabase/client'
import IndividualArt from 'pages/BagPage/individuals/IndividualArt'
import { useIndividualList } from 'pages/BagPage/individuals/individualStore'
import GameSheet from 'pages/MiniGamePage/GameSheet'
import {
  tiltFromOrientation,
  tiltFromPointer,
} from 'pages/MiniGamePage/hub/tilt.mjs'
import { slotsFor } from 'pages/MiniGamePage/minigame.mjs'
import AvatarArt from 'pages/MiniGamePage/trainer/AvatarArt'
import AvatarPicker from 'pages/MiniGamePage/trainer/AvatarPicker'
import TeamManager, {
  TeamSkeleton,
  teamHue,
  warmLevels,
  type Team,
} from 'pages/MiniGamePage/trainer/TeamManager'
import { countOf, normalizeTeams } from 'pages/MiniGamePage/trainer/teams.mjs'
import { trainerProgress } from 'pages/MiniGamePage/trainer/trainerView.mjs'
import { useMiniGame } from 'pages/MiniGamePage/useMiniGame'
import { fetchBuild } from 'pages/MyPokemonPage/build/client.mjs'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import styled from 'styled-components'

const BOX = 238

/** The trainer's glass card on the account page; one fixed box for loading, error and ready. */
export default function TrainerCard() {
  const mg = useMiniGame()
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const apply = useCallback(
    (t: { rx: number; ry: number; sx: number; sy: number }) => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        el.style.setProperty('--rx', `${t.rx}deg`)
        el.style.setProperty('--ry', `${t.ry}deg`)
        el.style.setProperty('--sx', String(t.sx))
        el.style.setProperty('--sy', String(t.sy))
      })
    },
    []
  )
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const onOri = (e: DeviceOrientationEvent) =>
      apply(
        tiltFromOrientation({ beta: e.beta ?? NaN, gamma: e.gamma ?? NaN }, 8)
      )
    window.addEventListener('deviceorientation', onOri)
    return () => {
      window.removeEventListener('deviceorientation', onOri)
      cancelAnimationFrame(raf.current)
    }
  }, [apply])
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (
      e.pointerType === 'touch' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
      return
    const r = e.currentTarget.getBoundingClientRect()
    apply(
      tiltFromPointer(
        {
          x: e.clientX - r.left,
          y: e.clientY - r.top,
          width: r.width,
          height: r.height,
        },
        8
      )
    )
  }
  const onLeave = () => apply({ rx: 0, ry: 0, sx: 50, sy: 50 })

  const trainer = mg.status?.trainer
  const [sheet, setSheet] = useState<'avatar' | 'team' | null>(null)
  const [cares, setCares] = useState<Record<string, { affection: number }>>({})
  const {
    items,
    error: listError,
    retry: retryList,
  } = useIndividualList(mg.mode === 'server', null)
  const { cares: readCares, avatarImage: loadAvatarImage } = mg
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const customAvatar = trainer?.avatar === 'custom'
  useEffect(() => {
    if (customAvatar) loadAvatarImage().then(setAvatarImage, () => {})
  }, [customAvatar, loadAvatarImage, sheet])
  const [caresReady, setCaresReady] = useState(false)
  const hasTrainer = !!trainer
  // read what the team sheet needs as soon as the card is up, so the sheet opens complete
  useEffect(() => {
    if (!hasTrainer) return
    readCares().then(
      (c) => {
        setCares(c)
        setCaresReady(true)
      },
      () => setCaresReady(true)
    )
  }, [hasTrainer, sheet, readCares])
  const loadBuild = useCallback(
    async (id: string) =>
      fetchBuild(
        { mode: 'server', supabase: await getSupabase() },
        id
      ) as Promise<{ level: number }>,
    []
  )
  useEffect(() => {
    if (items && hasTrainer)
      warmLevels(
        items.map((i) => i.id),
        loadBuild
      )
  }, [items, hasTrainer, loadBuild])
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [activeSlot, setActiveSlot] = useState(1)
  const [flip, setFlip] = useState(0)
  const { readTeams: loadTeams, switchTeam } = mg
  const teamKey = trainer ? trainer.team.join(',') : ''
  useEffect(() => {
    if (!trainer) return
    let live = true
    loadTeams().then(
      ({ rows, active }) => {
        if (!live) return
        const list = normalizeTeams(rows, trainer.team)
        setTeams(list)
        setActiveSlot(
          list.some((t) => t.slot === active) ? active : list[0].slot
        )
      },
      () => live && setTeams(normalizeTeams([], trainer.team))
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!trainer, sheet, teamKey, loadTeams])
  const hop = async (dir: 1 | -1) => {
    if (!teams || teams.length < 2) return
    const i = teams.findIndex((t) => t.slot === activeSlot)
    const next = teams[(i + dir + teams.length) % teams.length]
    setActiveSlot(next.slot)
    setFlip((n) => n + 1)
    try {
      await switchTeam(next.slot)
    } catch {
      loadTeams().then(
        ({ active }) => setActiveSlot(active),
        () => {}
      )
    }
  }
  const close = () => setSheet(null)

  if (!trainer) {
    const failed = !!mg.error && !mg.loading
    return (
      <TrainerCardStyle aria-label="Hồ sơ huấn luyện viên">
        <div className="hc" ref={ref}>
          <span className="hc-face" data-ghost>
            <AvatarArt id="rookie" size={72} locked />
          </span>
          <div className="hc-info">
            <b className="hc-level">Huấn luyện viên</b>
            <span className="hc-line" role={failed ? 'alert' : undefined}>
              {failed
                ? 'Chưa mở được hồ sơ huấn luyện viên.'
                : 'Đang mở thẻ huấn luyện viên…'}
            </span>
          </div>
          <div className="hc-actions">
            {failed && (
              <button
                type="button"
                className="hc-btn"
                onClick={() => mg.refresh()}
              >
                Thử lại
              </button>
            )}
          </div>
        </div>
      </TrainerCardStyle>
    )
  }

  const { pct, lit, max, to } = trainerProgress(trainer)
  const slots = slotsFor(trainer.level)

  return (
    <TrainerCardStyle aria-label="Hồ sơ huấn luyện viên">
      <div
        className="hc"
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <button
          type="button"
          className="hc-face"
          onClick={() => setSheet('avatar')}
          aria-label="Đổi avatar"
        >
          <AvatarArt id={trainer.avatar} image={avatarImage} size={72} />
          <span className="hc-edit" aria-hidden="true">
            Đổi
          </span>
        </button>
        <div className="hc-info">
          <b className="hc-level">Trainer level {trainer.level}</b>
          <span
            className="hc-xp"
            role="img"
            aria-label={`${pct}% đến level tiếp theo`}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} data-on={i < lit || undefined} />
            ))}
          </span>
          <span className="hc-line">
            {max ? 'Level tối đa' : `${trainer.xp}/${to} điểm`}, {trainer.owned}{' '}
            Pokémon
          </span>
        </div>
        <div className="hc-actions">
          {(() => {
            const cur = teams?.find((t) => t.slot === activeSlot)
            const byId = new Map((items ?? []).map((i) => [i.id, i]))
            const many = (teams?.length ?? 0) > 1
            return (
              <div
                className="hc-squad"
                style={{ ['--th' as string]: teamHue(activeSlot) }}
              >
                {many && (
                  <button
                    type="button"
                    className="hc-hop"
                    aria-label="Đội trước"
                    onClick={() => hop(-1)}
                  >
                    ‹
                  </button>
                )}
                <button
                  type="button"
                  className="hc-squad-main"
                  onClick={() => setSheet('team')}
                  aria-label="Quản lý đội hình"
                >
                  <span className="hc-squad-head">
                    <b>{cur?.name ?? 'Đội hình'}</b>
                    <small>
                      {cur ? countOf(cur) : trainer.team.length}/{slots}
                      {teams && teams.length > 1
                        ? ` · ${teams.length} đội`
                        : ''}
                    </small>
                  </span>
                  <span className="hc-roster" key={flip} aria-hidden="true">
                    {Array.from({ length: slots }, (_, i) => {
                      const id = cur?.members[i]
                      const it = id ? byId.get(id) : undefined
                      return (
                        <i
                          key={i}
                          data-on={it ? '' : undefined}
                          style={{ ['--k' as string]: i }}
                        >
                          {it && (
                            <IndividualArt
                              speciesId={it.speciesId}
                              name=""
                              size={46}
                            />
                          )}
                        </i>
                      )
                    })}
                  </span>
                </button>
                {many && (
                  <button
                    type="button"
                    className="hc-hop"
                    aria-label="Đội sau"
                    onClick={() => hop(1)}
                  >
                    ›
                  </button>
                )}
              </div>
            )
          })()}
        </div>
      </div>
      <GameSheet open={sheet === 'avatar'} onClose={close} title="Chọn avatar">
        <AvatarPicker
          trainer={trainer}
          wins={Object.values(mg.status?.games ?? {}).reduce(
            (n, g) => n + g.wins,
            0
          )}
          onPick={mg.setAvatar}
          onUpload={mg.uploadAvatar}
          loadImage={mg.avatarImage}
          onDone={close}
        />
      </GameSheet>
      <GameSheet open={sheet === 'team'} onClose={close} title="Đội hình">
        {sheet === 'team' && !items && !listError && <TeamSkeleton />}
        {sheet === 'team' && !items && listError && (
          <>
            <p className="mg-sub" role="alert">
              Chưa tải được danh sách Pokémon.
            </p>
            <button type="button" className="hc-btn" onClick={retryList}>
              Thử lại
            </button>
          </>
        )}
        {sheet === 'team' && items && (
          <TeamManager
            initial={teams ? { teams, active: activeSlot } : undefined}
            caresReady={caresReady}
            individuals={items}
            trainer={trainer}
            cares={cares}
            loadBuild={loadBuild}
            readTeams={loadTeams}
            onSave={async (list, act) => {
              await mg.saveTeams(list, act)
              setTeams(normalizeTeams(list, []))
              setActiveSlot(act)
            }}
            onDone={close}
          />
        )}
      </GameSheet>
    </TrainerCardStyle>
  )
}

const TrainerCardStyle = styled.section`
  --ink: #2b1a3d;
  --gold: #ffcf5a;
  --mint: #5fe3b4;
  --coral: #ff6b8a;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  height: ${BOX}px;
  color: #fff;

  .hc {
    --rx: 0deg;
    --ry: 0deg;
    --sx: 50;
    --sy: 50;
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 8px 14px;
    height: 100%;
    padding: 16px;
    border-radius: 20px;
    background: linear-gradient(
      150deg,
      rgba(34, 40, 120, 0.96),
      rgba(14, 20, 70, 0.98)
    );
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.22),
      0 14px 30px rgba(4, 8, 30, 0.28);
    transform: perspective(700px) rotateX(var(--rx)) rotateY(var(--ry));
    transition: transform 140ms var(--ease);
    overflow: hidden;
  }
  .hc::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(
        circle at calc(var(--sx) * 1%) calc(var(--sy) * 1%),
        rgba(255, 255, 255, 0.2),
        transparent 48%
      ),
      linear-gradient(
        115deg,
        rgba(95, 227, 180, 0.16),
        rgba(255, 207, 90, 0.14) 40%,
        rgba(255, 107, 138, 0.16) 70%,
        rgba(122, 168, 255, 0.16)
      );
    mix-blend-mode: screen;
  }
  .hc::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.045) 0 1px,
      transparent 1px 4px
    );
  }
  .hc > * {
    position: relative;
    z-index: 1;
    min-width: 0;
  }
  .hc-face {
    align-self: start;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    line-height: 0;
    cursor: pointer;
    box-shadow: 0 0 0 3px var(--gold);
  }
  .hc-face[data-ghost] {
    cursor: default;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  }
  .hc-info {
    display: grid;
    align-content: start;
    gap: 6px;
  }
  .hc-level {
    font-size: 22px;
    line-height: 26px;
    font-weight: 800;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hc-xp {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 3px;
    height: 10px;
  }
  .hc-xp i {
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.18);
  }
  .hc-xp i[data-on] {
    background: var(--mint);
    box-shadow: 0 0 8px rgba(95, 227, 180, 0.7);
  }
  .hc-line {
    font-size: 13px;
    line-height: 18px;
    color: #fff;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .hc-actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 8px;
  }
  .hc-btn {
    flex: 1;
    display: inline-grid;
    place-items: center;
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 14px;
    font: inherit;
    font-weight: 800;
    color: #fff;
    background: rgba(255, 255, 255, 0.16);
    cursor: pointer;
  }
  .hc-edit {
    position: absolute;
    left: 50%;
    bottom: -7px;
    transform: translateX(-50%);
    padding: 1px 9px;
    border-radius: 999px;
    font-size: 11px;
    line-height: 16px;
    font-weight: 800;
    color: #2b1a3d;
    background: linear-gradient(180deg, #ffe08a, #ffb23f);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  .hc-face {
    position: relative;
  }
  .hc-actions > .hc-squad {
    flex: 1 1 100%;
  }
  /* the party on its stage: each Pokémon stands on a glowing disc under a spotlight */
  .hc-squad {
    --th: 200;
    position: relative;
    display: flex;
    align-items: stretch;
    min-width: 0;
    height: 114px;
    border-radius: 18px;
    background:
      radial-gradient(
        60% 100% at 50% 0,
        hsl(var(--th) 100% 70% / 0.45),
        transparent 75%
      ),
      linear-gradient(180deg, hsl(var(--th) 60% 24%), hsl(var(--th) 70% 11%));
    box-shadow:
      inset 0 0 0 1.5px hsl(var(--th) 95% 72% / 0.55),
      0 0 22px hsl(var(--th) 95% 55% / 0.45);
    overflow: hidden;
    transition: background 300ms;
  }
  .hc-squad::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
        105deg,
        transparent 35%,
        hsl(var(--th) 100% 90% / 0.35) 50%,
        transparent 65%
      ) -120%
      0 / 60% 100% no-repeat;
    animation: hc-glint 4.5s ease-in-out infinite;
  }
  .hc-squad-main,
  .hc-hop {
    border: 0;
    font: inherit;
    color: #fff;
    background: none;
    cursor: pointer;
  }
  .hc-squad-main {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-rows: auto 1fr;
    padding: 5px 0 0;
    text-align: left;
  }
  .hc-hop {
    flex: 0 0 26px;
    font-size: 24px;
    font-weight: 900;
    line-height: 1;
    background: rgba(0, 0, 0, 0.22);
    z-index: 1;
  }
  .hc-hop:active {
    background: rgba(255, 255, 255, 0.25);
  }
  .hc-squad-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 16px;
    min-width: 0;
  }
  .hc-squad-head b {
    font-size: 13px;
    line-height: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hc-squad-head small {
    flex: none;
    font-size: 11px;
    font-weight: 800;
    color: hsl(var(--th) 100% 86%);
  }
  .hc-roster {
    display: flex;
    align-items: flex-end;
    justify-content: space-evenly;
    padding: 8px 4px;
    min-height: 0;
  }
  .hc-roster i {
    position: relative;
    flex: 1 1 0;
    max-width: 52px;
    height: 100%;
    display: grid;
    place-items: end center;
  }
  /* the disc under each one */
  .hc-roster i::before {
    content: '';
    position: absolute;
    left: 6%;
    right: 6%;
    bottom: 3px;
    height: 10px;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      hsl(var(--th) 100% 75% / 0.7),
      hsl(var(--th) 100% 60% / 0.12) 70%,
      transparent
    );
    border: 1px dashed hsl(var(--th) 100% 85% / 0.35);
  }
  .hc-roster i[data-on]::before {
    border: 0;
    box-shadow: 0 0 12px hsl(var(--th) 100% 70% / 0.9);
    background: radial-gradient(
      closest-side,
      #fff,
      hsl(var(--th) 100% 70% / 0.55) 60%,
      transparent
    );
  }
  .hc-roster i .ind-art {
    position: relative;
    margin-bottom: 4px;
    filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.5));
    animation:
      hc-deal 420ms cubic-bezier(0.3, 1.6, 0.4, 1) backwards,
      hc-bob 2.6s ease-in-out infinite;
    animation-delay: calc(var(--k) * 70ms), calc(var(--k) * -0.45s);
  }
  @keyframes hc-bob {
    50% {
      transform: translateY(-3px);
    }
  }
  @keyframes hc-glint {
    0%,
    55% {
      background-position:
        -120% 0,
        0 0;
    }
    100% {
      background-position:
        220% 0,
        0 0;
    }
  }
  @keyframes hc-deal {
    from {
      transform: translateY(10px) scale(0.5);
      opacity: 0;
    }
  }
  .hc-squad-main:focus-visible,
  .hc-hop:focus-visible,
  .hc-btn:focus-visible,
  .hc-face:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .hc {
      transition: none;
      transform: none;
    }
    .hc-squad::before,
    .hc-roster i .ind-art {
      animation: none;
    }
  }
`
