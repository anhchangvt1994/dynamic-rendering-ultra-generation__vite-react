import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { getSupabase } from 'app/supabase/client'
import { useIndividualList } from 'pages/BagPage/individuals/individualStore'
import { fetchBuild } from 'pages/MyPokemonPage/build/client.mjs'
import GameSheet from '../GameSheet'
import { MINIGAME, slotsFor, xpFor } from '../minigame.mjs'
import type { useMiniGame } from '../useMiniGame'
import AvatarArt from '../trainer/AvatarArt'
import AvatarPicker from '../trainer/AvatarPicker'
import TeamPicker from '../trainer/TeamPicker'
import { tiltFromOrientation, tiltFromPointer } from './tilt.mjs'

type Mg = ReturnType<typeof useMiniGame>

/** Trainer region: holographic card (signed in) or the same-size guest/loading card. */
export default function HoloCard({ mg, guest, ready }: { mg: Mg; guest: boolean; ready: boolean }) {
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

  if (guest || !trainer) {
    const text = guest
      ? 'Bạn chưa đăng nhập: chỉ chơi thử, không mất lượt và không nhận thưởng.'
      : mg.error && ready
        ? String(mg.error)
        : 'Đang mở thẻ huấn luyện viên…'
    return (
      <section data-region="trainer" style={{ ['--n' as string]: 1 }} aria-label="Hồ sơ huấn luyện viên">
        <div className="hc" ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}>
          <span className="hc-face" data-ghost>
            <AvatarArt id="rookie" size={72} locked />
          </span>
          <div className="hc-info">
            <b className="hc-level">{guest ? 'Khách' : 'Huấn luyện viên'}</b>
            <span className="hc-line" role={guest || !mg.error ? undefined : 'alert'}>{text}</span>
          </div>
          <div className="hc-actions">
            {guest ? (
              <LinkCustom to="/dang-nhap" className="hc-btn" data-primary>
                Đăng nhập
              </LinkCustom>
            ) : mg.error && ready ? (
              <button type="button" className="hc-btn" onClick={() => mg.refresh()}>
                Thử lại
              </button>
            ) : null}
          </div>
        </div>
      </section>
    )
  }

  const from = xpFor(trainer.level)
  const max = trainer.level >= MINIGAME.LEVEL_MAX
  const to = max ? from : xpFor(trainer.level + 1)
  const pct = to > from ? Math.round(((trainer.xp - from) / (to - from)) * 100) : 100
  const lit = Math.round(pct / 10)

  return (
    <section data-region="trainer" style={{ ['--n' as string]: 1 }} aria-label="Hồ sơ huấn luyện viên">
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
            {Array.from({ length: slotsFor(trainer.level) }, (_, i) => (
              <i key={i} data-on={i < trainer.team.length || undefined} />
            ))}
          </span>
          <span className="hc-line">
            {max ? 'Level tối đa' : `${trainer.xp}/${to} điểm`}, {trainer.owned} Pokémon
          </span>
        </div>
        <div className="hc-actions">
          <button type="button" className="hc-btn" onClick={() => setSheet('team')}>
            Đội hình {trainer.team.length}/{slotsFor(trainer.level)}
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
        {sheet === 'team' && (
          <TeamPicker
            individuals={items ?? []}
            trainer={trainer}
            cares={cares}
            loadBuild={loadBuild}
            onSave={mg.setTeam}
            onDone={close}
          />
        )}
      </GameSheet>
    </section>
  )
}
