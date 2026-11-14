import IndividualArt from 'pages/BagPage/individuals/IndividualArt'
import type { Individual } from 'pages/BagPage/individuals/client'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { bondOf, slotsFor } from '../minigame.mjs'
import { useSpeciesNames } from '../useSpeciesNames'
import { teamCandidates } from './teamView.mjs'
import {
  NAME_MAX,
  TEAMS_MAX,
  activeOf,
  addTeam,
  membership,
  countOf,
  moveToTeam,
  putAt,
  normalizeTeams,
  removeTeam,
  renameTeam,
  reorderMember,
  toggleMember,
} from './teams.mjs'

export type Team = { slot: number; name: string; members: (string | null)[] }
/** The same layout as the manager, drawn blank, while the Pokémon list is still coming. */
export function TeamSkeleton() {
  return (
    <div
      className="tm"
      data-skel
      aria-busy="true"
      aria-label="Đang mở đội hình"
    >
      <ul className="tm-deck">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <span className="tm-tab" />
          </li>
        ))}
      </ul>
      <div className="tm-head">
        <span className="tm-name" />
        <span className="tm-act" />
        <span className="tm-act" />
      </div>
      <ol className="tm-slots">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <span className="tm-slot" />
          </li>
        ))}
      </ol>
      <p className="tm-hint">&nbsp;</p>
      <ul className="tm-roster">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i}>
            <span className="tm-card" />
          </li>
        ))}
      </ul>
      <span className="mg-cta" />
    </div>
  )
}

export const teamHue = (slot: number) => (slot * 47 + 8) % 360

// levels already read, so a second open is instant
const levelCache = new Map<string, number>()
/** Read the Pokémon's levels ahead of the sheet opening. */
export const warmLevels = (
  ids: string[],
  loadBuild: (id: string) => Promise<{ level: number }>
) =>
  Promise.all(
    ids
      .filter((id) => !levelCache.has(id))
      .map((id) =>
        loadBuild(id).then(
          (b) => void levelCache.set(id, b.level),
          () => {}
        )
      )
  )

type Props = {
  /** teams already known by the caller: nothing to wait for */
  initial?: { teams: Team[]; active: number }
  caresReady?: boolean
  individuals: Individual[]
  trainer: { level: number; team: string[] }
  cares: Record<string, { affection: number }>
  loadBuild: (id: string) => Promise<{ level: number }>
  readTeams: () => Promise<{ rows: Team[]; active: number }>
  onSave: (teams: Team[], active: number) => Promise<void>
  onDone: () => void
}

/** Up to ten named teams: tabs to switch, a roster to fill them, and a one-tap move between teams. */
export default function TeamManager({
  initial,
  caresReady = true,
  individuals,
  trainer,
  cares,
  loadBuild,
  readTeams,
  onSave,
  onDone,
}: Props) {
  const nameOf = useSpeciesNames()
  const slots = slotsFor(trainer.level)
  const [teams, setTeams] = useState<Team[]>(
    () => initial?.teams ?? normalizeTeams([], trainer.team)
  )
  const [teamsReady, setTeamsReady] = useState(!!initial)
  const [active, setActive] = useState(() => initial?.active ?? 1)
  const [edit, setEdit] = useState(() => initial?.active ?? 1)
  const [moving, setMoving] = useState<string | null>(null)
  const [levels, setLevels] = useState<Record<string, number>>(() =>
    Object.fromEntries(levelCache)
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial) return
    let live = true
    readTeams().then(
      ({ rows, active: a }) => {
        if (!live) return
        const list = normalizeTeams(rows, trainer.team)
        const act = activeOf(list, a)
        setTeams(list)
        setActive(act)
        setEdit(act)
        setTeamsReady(true)
      },
      () => {
        if (!live) return
        setTeamsReady(true)
      }
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    let live = true
    const missing = individuals.filter((i) => !(i.id in levels))
    if (missing.length)
      Promise.all(
        missing.map((i) =>
          loadBuild(i.id).then(
            (b) => {
              levelCache.set(i.id, b.level)
              return [i.id, b.level] as const
            },
            () => [i.id, 1] as const
          )
        )
      ).then(
        (got) =>
          live && setLevels((prev) => ({ ...prev, ...Object.fromEntries(got) }))
      )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [individuals, loadBuild])

  const rows = useMemo(
    () =>
      teamCandidates({
        individuals,
        trainerLevel: trainer.level,
        builds: Object.fromEntries(
          individuals.map((i) => [
            i.id,
            {
              level: levels[i.id] ?? 1,
              bond: bondOf(cares[i.id]?.affection ?? 0),
            },
          ])
        ),
      }),
    [individuals, levels, cares, trainer.level]
  )
  // drag & drop (mouse, pen, and touch after a short hold): a slot reorders or moves to a tab,
  // a roster card drops on a slot or a tab to join that team
  const [ghost, setGhost] = useState<{
    id: string
    x: number
    y: number
  } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const dragRef = useRef<{
    id: string
    from: number | null
    x: number
    y: number
    on: boolean
    touch: boolean
    timer?: number
  } | null>(null)
  const stale = useRef({
    teams,
    current: 0,
    slots,
    ok: new Map<string, { ok: boolean; reason: string | null }>(),
  })
  const suppress = useRef(false)
  // closing the sheet any other way than "Lưu" still keeps the edits
  const snap = useRef({ teams, active, ready: teamsReady, base: '', saved: false })
  snap.current.teams = teams
  snap.current.active = active
  snap.current.ready = teamsReady
  const key = JSON.stringify([teams, active])
  if (teamsReady && !snap.current.base) snap.current.base = key
  useEffect(
    () => () => {
      const s = snap.current
      if (!s.ready || s.saved || JSON.stringify([s.teams, s.active]) === s.base) return
      onSave(s.teams, s.active).catch(() => {})
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  if (individuals.length === 0)
    return (
      <>
        <p className="mg-sub">
          Bạn chưa có Pokémon nào. Hãy đổi thẻ trong Túi đồ để có Pokémon của
          riêng mình.
        </p>
        <a
          className="mg-cta"
          data-quiet
          href="/tui-do"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          Mở Túi đồ
        </a>
      </>
    )

  const ready =
    teamsReady && caresReady && individuals.every((i) => i.id in levels)
  const current = teams.find((t) => t.slot === edit) ?? teams[0]
  const byId = new Map(individuals.map((i) => [i.id, i]))
  const label = (id: string) =>
    byId.get(id)?.nickname ?? nameOf(byId.get(id)?.speciesId ?? 0)
  const hue = teamHue(current.slot)
  stale.current = {
    teams,
    current: current.slot,
    slots,
    ok: new Map(
      rows.map((r) => [r.individual.id, { ok: r.ok, reason: r.reason }])
    ),
  }

  const targetAt = (x: number, y: number) =>
    (
      document.elementFromPoint(x, y) as HTMLElement | null
    )?.closest<HTMLElement>('[data-drop]')?.dataset.drop ?? null
  const finish = (target: string | null) => {
    const d = dragRef.current
    if (!d) return
    const { teams: ts, current: cur, slots: lim, ok } = stale.current
    const [kind, raw] = target?.split(':') ?? []
    const n = Number(raw)
    const team = ts.find((t) => t.slot === (kind === 'tab' ? n : cur))
    let next = ts
    let msg: string | null = null
    if (kind === 'slot' && d.from !== null)
      next = reorderMember(ts, cur, d.from, n)
    else if (kind === 'tab' && d.from !== null && n !== cur) {
      next = moveToTeam(ts, cur, n, d.id, lim)
      if (next === ts)
        msg = team?.members.includes(d.id)
          ? `${team.name} đã có Pokémon này.`
          : `${team?.name ?? 'Đội'} đã đủ ${lim} Pokémon.`
    } else if ((kind === 'slot' || kind === 'tab') && d.from === null && team) {
      const info = ok.get(d.id)
      if (team.members.includes(d.id))
        next =
          kind === 'slot'
            ? reorderMember(ts, team.slot, team.members.indexOf(d.id), n)
            : ts
      else if (info && !info.ok) msg = `${info.reason}`
      else if (kind === 'slot' && team.members[n] == null && countOf(team) >= lim) msg = `${team.name} đã đủ ${lim} Pokémon.`
      else if (kind === 'slot') next = putAt(ts, team.slot, d.id, n, lim)
      else if (countOf(team) >= lim) msg = `${team.name} đã đủ ${lim} Pokémon.`
      else next = toggleMember(ts, team.slot, d.id, lim)
    }
    if (next !== ts) setTeams(next)
    setError(msg)
  }
  const startDrag = (id: string, from: number | null) => (e: RPointerEvent) => {
    if (e.button > 0) return
    const touch = e.pointerType === 'touch'
    const d = {
      id,
      from,
      x: e.clientX,
      y: e.clientY,
      on: false,
      touch,
      timer: undefined as number | undefined,
    }
    dragRef.current = d
    const begin = () => {
      d.on = true
      setMoving(null)
      setGhost({ id, x: d.x, y: d.y })
    }
    if (touch) d.timer = window.setTimeout(begin, from === null ? 260 : 160)
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return
      if (!d.on) {
        const far =
          Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > (touch ? 10 : 5)
        if (touch && far) return end(false) // moved before the hold: it is a scroll
        if (!touch && far) begin()
        else return
      }
      ev.preventDefault()
      d.x = ev.clientX
      d.y = ev.clientY
      setGhost({ id, x: ev.clientX, y: ev.clientY })
      setOver(targetAt(ev.clientX, ev.clientY))
    }
    const end = (drop: boolean, ev?: PointerEvent) => {
      window.clearTimeout(d.timer)
      window.removeEventListener('touchmove', noScroll)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      if (d.on) {
        suppress.current = true
        setTimeout(() => (suppress.current = false), 0)
        if (drop && ev) finish(targetAt(ev.clientX, ev.clientY))
      }
      dragRef.current = null
      setGhost(null)
      setOver(null)
    }
    const up = (ev: PointerEvent) =>
      ev.pointerId === e.pointerId && end(true, ev)
    const cancel = (ev: PointerEvent) =>
      ev.pointerId === e.pointerId && end(false)
    // once the hold starts a drag, the finger must not scroll the sheet
    const noScroll = (ev: TouchEvent) => {
      if (d.on) ev.preventDefault()
    }
    window.addEventListener('touchmove', noScroll, { passive: false })
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }

  const pick = (id: string, ok: boolean, reason: string | null) => {
    setError(null)
    if (!ok && !current.members.includes(id))
      return setError(`${label(id)}: ${reason}`)
    if (!current.members.includes(id) && countOf(current) >= slots)
      return setError(`Mỗi đội chỉ có ${slots} ô. Bỏ một Pokémon ra trước.`)
    setTeams(toggleMember(teams, current.slot, id, slots))
  }
  // a Pokémon in the strip is picked up; tapping another team tab drops it there
  const drop = (slot: number) => {
    if (!moving) return setEdit(slot)
    const to = teams.find((t) => t.slot === slot)!
    if (slot === current.slot) return setMoving(null)
    if (to.members.includes(moving)) {
      setError(`${label(moving)} đã có trong ${to.name}.`)
      return setMoving(null)
    }
    if (countOf(to) >= slots) {
      setError(`${to.name} đã đủ ${slots} Pokémon.`)
      return setMoving(null)
    }
    setError(null)
    setTeams(
      toggleMember(
        toggleMember(teams, current.slot, moving, slots),
        slot,
        moving,
        slots
      )
    )
    setMoving(null)
  }
  const add = () => {
    const next = addTeam(teams)
    if (!next) return
    setTeams(next)
    setEdit(next.find((t) => !teams.some((o) => o.slot === t.slot))!.slot)
  }
  const del = () => {
    const next = removeTeam(teams, current.slot)
    setTeams(next)
    if (active === current.slot) setActive(next[0].slot)
    setEdit(next[0].slot)
  }
  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      snap.current.saved = true
      await onSave(teams, active)
      onDone()
    } catch (e: any) {
      snap.current.saved = false
      setError(e?.message ?? 'Không lưu được đội hình.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="tm"
      data-skel={!ready || undefined}
      aria-busy={!ready}
      style={{ ['--th' as string]: hue }}
    >
      <ul className="tm-deck" aria-label="Các đội hình">
        {teams.map((t) => (
          <li key={t.slot}>
            <button
              type="button"
              className="tm-tab"
              style={{ ['--th' as string]: teamHue(t.slot) }}
              aria-pressed={t.slot === current.slot}
              data-active={t.slot === active || undefined}
              data-drop={`tab:${t.slot}`}
              data-target={
                (moving && t.slot !== current.slot) ||
                over === `tab:${t.slot}` ||
                undefined
              }
              onClick={() => drop(t.slot)}
            >
              <span className="tm-fan" aria-hidden="true">
                {t.members
                  .filter((m): m is string => m != null)
                  .slice(0, 4)
                  .map((id, k, arr) => (
                    <i
                      key={id}
                      style={{
                        ['--k' as string]: k,
                        ['--n' as string]: arr.length,
                      }}
                    >
                      <IndividualArt
                        speciesId={byId.get(id)?.speciesId ?? 0}
                        name=""
                        size={38}
                      />
                    </i>
                  ))}
                {countOf(t) > 4 && (
                  <em className="tm-more">+{countOf(t) - 4}</em>
                )}
                {countOf(t) === 0 && <em>Trống</em>}
              </span>
              <b>{t.name}</b>
              {t.slot === active && <span className="tm-flag">Đang dùng</span>}
            </button>
          </li>
        ))}
        {teams.length < TEAMS_MAX && (
          <li>
            <button
              type="button"
              className="tm-tab tm-new"
              onClick={add}
              aria-label="Thêm đội hình mới"
            >
              <span aria-hidden="true">+</span>
              <small>
                {teams.length}/{TEAMS_MAX}
              </small>
            </button>
          </li>
        )}
      </ul>

      <div className="tm-head">
        <input
          className="tm-name"
          value={current.name}
          maxLength={NAME_MAX}
          aria-label="Tên đội hình"
          onChange={(e) =>
            setTeams(
              teams.map((t) =>
                t.slot === current.slot ? { ...t, name: e.target.value } : t
              )
            )
          }
          onBlur={() => setTeams(renameTeam(teams, current.slot, current.name))}
        />
        <button
          type="button"
          className="tm-act"
          disabled={active === current.slot}
          onClick={() => setActive(current.slot)}
        >
          {active === current.slot ? 'Đội đang dùng' : 'Dùng đội này'}
        </button>
        <button
          type="button"
          className="tm-act"
          data-danger
          disabled={teams.length <= 1}
          onClick={del}
          aria-label="Xóa đội này"
        >
          Xóa
        </button>
      </div>

      <ol className="tm-slots" aria-label={`Ô trong ${current.name}`}>
        {Array.from({ length: slots }, (_, i) => {
          const id = current.members[i]
          return (
            <li key={i} className="tm-cell">
              {id && (
                <button
                  type="button"
                  className="tm-remove"
                  aria-label={`Bỏ ${label(id)} khỏi ${current.name}`}
                  onClick={() => {
                    setMoving(null)
                    setError(null)
                    setTeams(toggleMember(teams, current.slot, id, slots))
                  }}
                >
                  ✕
                </button>
              )}
              {id ? (
                <button
                  type="button"
                  className="tm-slot"
                  data-drop={`slot:${i}`}
                  data-over={over === `slot:${i}` || undefined}
                  data-dragging={ghost?.id === id || undefined}
                  onPointerDown={startDrag(id, i)}
                  data-lifted={moving === id || undefined}
                  aria-pressed={moving === id}
                  aria-label={`${label(id)}: chạm để chuyển sang đội khác`}
                  onClick={() =>
                    suppress.current
                      ? undefined
                      : setMoving(moving === id ? null : id)
                  }
                >
                  <IndividualArt
                    speciesId={byId.get(id)?.speciesId ?? 0}
                    name={label(id)}
                    size={52}
                  />
                  <small>{label(id)}</small>
                </button>
              ) : (
                <span
                  className="tm-slot"
                  data-empty
                  data-drop={`slot:${i}`}
                  data-over={over === `slot:${i}` || undefined}
                >
                  <b aria-hidden="true">{i + 1}</b>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <p className="tm-hint" data-on={moving ? '' : undefined}>
        {moving
          ? `Chạm một đội phía trên để chuyển ${label(moving)} sang đó.`
          : 'Kéo thả để đổi vị trí hoặc sang đội khác. Kéo ra ngoài hoặc bấm ✕ để bỏ khỏi đội.'}
      </p>

      <ul className="tm-roster">
        {rows.map(({ individual, ok, reason }) => {
          const on = current.members.includes(individual.id)
          const blocked = !ok && !on
          const inTeams = membership(teams, individual.id)
          return (
            <li key={individual.id}>
              <button
                type="button"
                className="tm-card"
                aria-pressed={on}
                aria-disabled={blocked || undefined}
                data-blocked={blocked || undefined}
                data-dragging={ghost?.id === individual.id || undefined}
                onPointerDown={
                  blocked ? undefined : startDrag(individual.id, null)
                }
                onClick={() =>
                  suppress.current ? undefined : pick(individual.id, ok, reason)
                }
              >
                <IndividualArt
                  speciesId={individual.speciesId}
                  name={nameOf(individual.speciesId)}
                  size={52}
                />
                <b>{individual.nickname ?? nameOf(individual.speciesId)}</b>
                {blocked ? (
                  <small className="tm-lock">{reason}</small>
                ) : (
                  <small>{`Lv ${levels[individual.id] ?? '…'}`}</small>
                )}
                <span
                  className="tm-in"
                  aria-label={
                    inTeams.length
                      ? `Trong ${inTeams.length} đội`
                      : 'Chưa vào đội nào'
                  }
                >
                  {inTeams.map((s) => (
                    <i key={s} style={{ ['--th' as string]: teamHue(s) }} />
                  ))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {error && (
        <p className="mg-error" role="alert">
          {error}
        </p>
      )}
      {ghost &&
        createPortal(
          <img
            className="tm-ghost"
            src={getPokemonImage(byId.get(ghost.id)?.speciesId ?? 0)}
            alt=""
            style={{ left: ghost.x, top: ghost.y }}
          />,
          document.body
        )}
      <button type="button" className="mg-cta" disabled={busy} onClick={save}>
        {busy ? 'Đang lưu…' : 'Lưu các đội hình'}
      </button>
    </div>
  )
}
