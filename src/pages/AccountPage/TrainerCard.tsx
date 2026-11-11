import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import styled from 'styled-components'
import { getSupabase } from 'app/supabase/client'
import { useIndividualList } from 'pages/BagPage/individuals/individualStore'
import { fetchBuild } from 'pages/MyPokemonPage/build/client.mjs'
import GameSheet from 'pages/MiniGamePage/GameSheet'
import { slotsFor } from 'pages/MiniGamePage/minigame.mjs'
import { useMiniGame } from 'pages/MiniGamePage/useMiniGame'
import AvatarArt from 'pages/MiniGamePage/trainer/AvatarArt'
import AvatarPicker from 'pages/MiniGamePage/trainer/AvatarPicker'
import TeamPicker from 'pages/MiniGamePage/trainer/TeamPicker'
import { trainerProgress } from 'pages/MiniGamePage/trainer/trainerView.mjs'
import { tiltFromOrientation, tiltFromPointer } from 'pages/MiniGamePage/hub/tilt.mjs'

const BOX = 208

/** The trainer's glass card on the account page; one fixed box for loading, error and ready. */
export default function TrainerCard() {
  const mg = useMiniGame()
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const apply = useCallback((t: { rx: number; ry: number; sx: number; sy: number }) => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.style.setProperty('--rx', `${t.rx}deg`)
      el.style.setProperty('--ry', `${t.ry}deg`)
      el.style.setProperty('--sx', String(t.sx))
      el.style.setProperty('--sy', String(t.sy))
    })
  }, [])
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const onOri = (e: DeviceOrientationEvent) => apply(tiltFromOrientation({ beta: e.beta ?? NaN, gamma: e.gamma ?? NaN }, 8))
    window.addEventListener('deviceorientation', onOri)
    return () => {
      window.removeEventListener('deviceorientation', onOri)
      cancelAnimationFrame(raf.current)
    }
  }, [apply])
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const r = e.currentTarget.getBoundingClientRect()
    apply(tiltFromPointer({ x: e.clientX - r.left, y: e.clientY - r.top, width: r.width, height: r.height }, 8))
  }
  const onLeave = () => apply({ rx: 0, ry: 0, sx: 50, sy: 50 })

  const trainer = mg.status?.trainer
  const [sheet, setSheet] = useState<'avatar' | 'team' | null>(null)
  const [cares, setCares] = useState<Record<string, { affection: number }>>({})
  const { items } = useIndividualList(mg.mode === 'server', null)
  const { cares: readCares } = mg
  useEffect(() => {
    if (sheet === 'team') readCares().then(setCares, () => {})
  }, [sheet, readCares])
  const loadBuild = useCallback(
    async (id: string) => fetchBuild({ mode: 'server', supabase: await getSupabase() }, id) as Promise<{ level: number }>,
    []
  )
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
              {failed ? 'Chưa mở được hồ sơ huấn luyện viên.' : 'Đang mở thẻ huấn luyện viên…'}
            </span>
          </div>
          <div className="hc-actions">
            {failed && (
              <button type="button" className="hc-btn" onClick={() => mg.refresh()}>
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
      <div className="hc" ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}>
        <button type="button" className="hc-face" onClick={() => setSheet('avatar')} aria-label="Đổi avatar">
          <AvatarArt id={trainer.avatar} size={72} />
        </button>
        <div className="hc-info">
          <b className="hc-level">Trainer level {trainer.level}</b>
          <span className="hc-xp" role="img" aria-label={`${pct}% đến level tiếp theo`}>
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} data-on={i < lit || undefined} />
            ))}
          </span>
          <span className="hc-team" aria-hidden="true">
            {Array.from({ length: slots }, (_, i) => (
              <i key={i} data-on={i < trainer.team.length || undefined} />
            ))}
          </span>
          <span className="hc-line">
            {max ? 'Level tối đa' : `${trainer.xp}/${to} điểm`}, {trainer.owned} Pokémon
          </span>
        </div>
        <div className="hc-actions">
          <button type="button" className="hc-btn" onClick={() => setSheet('avatar')}>
            Đổi avatar
          </button>
          <button type="button" className="hc-btn" onClick={() => setSheet('team')}>
            Đội hình {trainer.team.length}/{slots}
          </button>
        </div>
      </div>
      <GameSheet open={sheet === 'avatar'} onClose={close} title="Chọn avatar">
        <AvatarPicker
          trainer={trainer}
          wins={Object.values(mg.status?.games ?? {}).reduce((n, g) => n + g.wins, 0)}
          onPick={mg.setAvatar}
          onDone={close}
        />
      </GameSheet>
      <GameSheet open={sheet === 'team'} onClose={close} title="Đội hình">
        {sheet === 'team' && !items && <p className="mg-sub">Đang tải Pokémon…</p>}
        {sheet === 'team' && items && (
          <TeamPicker
            individuals={items}
            trainer={trainer}
            cares={cares}
            loadBuild={loadBuild}
            onSave={mg.setTeam}
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
    background: linear-gradient(150deg, rgba(34, 40, 120, 0.96), rgba(14, 20, 70, 0.98));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22), 0 14px 30px rgba(4, 8, 30, 0.28);
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
      radial-gradient(circle at calc(var(--sx) * 1%) calc(var(--sy) * 1%), rgba(255, 255, 255, 0.2), transparent 48%),
      linear-gradient(115deg, rgba(95, 227, 180, 0.16), rgba(255, 207, 90, 0.14) 40%, rgba(255, 107, 138, 0.16) 70%, rgba(122, 168, 255, 0.16));
    mix-blend-mode: screen;
  }
  .hc::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 4px);
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
  .hc-team {
    display: flex;
    gap: 6px;
    margin-top: 4px;
  }
  .hc-team i {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
  }
  .hc-team i[data-on] {
    background: var(--gold);
    box-shadow: 0 0 10px rgba(255, 207, 90, 0.7);
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
  }
`
