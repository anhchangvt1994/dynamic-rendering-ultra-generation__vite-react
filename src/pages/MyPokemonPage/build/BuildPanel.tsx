import { type CSSProperties, useState } from 'react'
import { TYPE_DATA } from 'components/pokemon-page/type-data.mjs'
import { useBagStore } from 'pages/BagPage/bagStore'
import type { Individual } from 'pages/BagPage/individuals/client'
import { ITEMS } from 'pages/QuizPage/items.mjs'
import MovePicker from './MovePicker'
import {
  abilityLabel,
  natureEffect,
  NATURE_VI,
  statLabel,
  titleCase,
} from './format.mjs'
import { useBuild } from './useBuild'
import { useLearnset } from './useLearnset'

const ITEM_MAX = 3
const AWAKEN_AT = 450
const GENDER = { male: '♂ Đực', female: '♀ Cái', none: 'Vô tính' }
const USABLE = ['bottle-cap', 'gold-bottle-cap', 'rare-candy'] as const
const itemName = (id: string) =>
  (ITEMS as { id: string; name: string }[]).find((item) => item.id === id)
    ?.name ?? titleCase(id)

type Props = {
  item: Individual
  affection: number
  api: ReturnType<typeof useBuild>
}

/** Server-computed stats, ability, 4 moves, and the rare items that grow them. */
export default function BuildPanel({ item, affection, api }: Props) {
  const {
    build,
    status,
    error,
    retry,
    busy,
    actionError,
    setMove,
    applyItem,
    awaken,
  } = api

  const { bag } = useBagStore()
  const learnset = useLearnset(build?.species ?? null, status === 'ready')
  const [slot, setSlot] = useState<number | null>(null)
  const [choosing, setChoosing] = useState(false)

  if (status === 'unavailable')
    return (
      <section className="rm-card" aria-labelledby="rm-h-build">
        <h2 id="rm-h-build">Chỉ số chiến đấu</h2>
        <p className="rm-muted">Đăng nhập để xem chỉ số và chiêu thức.</p>
      </section>
    )
  if (!build)
    return (
      <section
        className="rm-card bp-skeleton"
        aria-labelledby="rm-h-build"
        aria-busy={status === 'loading'}
      >
        <h2 id="rm-h-build">Chỉ số chiến đấu</h2>
        {status === 'error' ? (
          <p className="rm-muted" role="alert">
            {error}{' '}
            <button type="button" className="rm-btn" onClick={retry}>
              Thử lại
            </button>
          </p>
        ) : (
          <p className="rm-muted" role="status">
            Đang tính chỉ số…
          </p>
        )}
      </section>
    )

  const effect = natureEffect(build.nature)
  const owned = bag ?? {}
  const toNext =
    build.expNext === null
      ? 1
      : (build.exp - build.expFloor) / (build.expNext - build.expFloor)
  const itemReason = (id: (typeof USABLE)[number]) => {
    if (build.itemUses >= ITEM_MAX) return `Đã dùng đủ ${ITEM_MAX} lần`
    if (!(owned[id] > 0)) return 'Không có trong túi'
    if (id === 'rare-candy' && build.capped) return 'Đã chạm trần cấp'
    if (id === 'gold-bottle-cap' && build.iv.every((v) => v >= 31))
      return 'IV đã tối đa'
    if (id === 'bottle-cap' && build.iv.every((v) => v >= 31))
      return 'IV đã tối đa'
    return null
  }
  const awakenReason = build.awakened
    ? 'Đã thức tỉnh'
    : build.stars >= 5
      ? 'Đã đủ 5 sao'
      : affection < AWAKEN_AT
        ? `Cần thân thiết cấp 10 (${affection}/${AWAKEN_AT})`
        : null

  return (
    <>
      <section className="rm-card bp" aria-labelledby="rm-h-build">
        <h2 id="rm-h-build">Chỉ số chiến đấu</h2>
        <p className="bp-head">
          <b>Lv {build.level}</b>
          <span className="rm-stars" aria-label={`${build.stars} sao`}>
            {'★'.repeat(build.stars)}
            {'☆'.repeat(5 - build.stars)}
          </span>
          <small>Trần cấp {build.cap}</small>
        </p>
        <div
          className="rm-track bp-exp"
          role="progressbar"
          aria-label="Kinh nghiệm đến cấp kế"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(toNext * 100)}
          style={{ '--reach': `${toNext * 100}%` } as CSSProperties}
        >
          <i />
        </div>

        <table className="bp-stats">
          <thead>
            <tr>
              <th scope="col">Chỉ số</th>
              <th scope="col">Giá trị</th>
              <th scope="col">IV</th>
              <th scope="col">EV</th>
            </tr>
          </thead>
          <tbody>
            {build.stats.map((value, i) => (
              <tr key={i}>
                <th scope="row">
                  {statLabel(i)}
                  {effect?.up === i && (
                    <span className="bp-up" aria-label="tăng">
                      ▲
                    </span>
                  )}
                  {effect?.down === i && (
                    <span className="bp-down" aria-label="giảm">
                      ▼
                    </span>
                  )}
                </th>
                <td>{value}</td>
                <td>
                  <span
                    className="bp-bar"
                    style={
                      { '--v': `${(build.iv[i] / 31) * 100}%` } as CSSProperties
                    }
                  >
                    <i />
                  </span>
                  <small>{build.iv[i]}</small>
                </td>
                <td>
                  <span
                    className="bp-bar"
                    data-ev
                    style={
                      {
                        '--v': `${(build.ev[i] / 252) * 100}%`,
                      } as CSSProperties
                    }
                  >
                    <i />
                  </span>
                  <small>{build.ev[i]}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="bp-chips" aria-label="Đặc điểm">
          <li>
            Đặc tính: <b>{abilityLabel(build.ability)}</b>
          </li>
          <li>
            Tính cách: <b>{NATURE_VI[build.nature]}</b>
          </li>
          <li>{GENDER[build.gender]}</li>
          {build.shiny && <li data-shiny>✦ Shiny</li>}
          <li>Cỡ {build.size}%</li>
        </ul>

        <h3 className="bp-h">Chiêu thức</h3>
        <ul className="bp-slots">
          {[0, 1, 2, 3].map((i) => {
            const move = build.moves[i]
            const info = move ? learnset?.moves[move] : undefined
            const color = info
              ? (TYPE_DATA[info.type as keyof typeof TYPE_DATA]?.color ??
                '#888')
              : undefined
            return (
              <li key={i}>
                <button
                  type="button"
                  className="bp-slot"
                  data-empty={!move || undefined}
                  style={{ '--tc': color } as CSSProperties}
                  onClick={() => {
                    setSlot(i)
                    setChoosing(true)
                  }}
                >
                  <b>{move ? titleCase(move) : 'Ô trống'}</b>
                  <small>
                    {move
                      ? info
                        ? `${info.power ? `${info.power} sức` : '—'} · PP ${info.pp}`
                        : ' '
                      : 'Chạm để chọn'}
                  </small>
                </button>
              </li>
            )
          })}
        </ul>

        <h3 className="bp-h">
          Vật phẩm hiếm{' '}
          <small>
            {build.itemUses}/{ITEM_MAX} lần
          </small>
        </h3>
        <ul className="bp-items">
          {USABLE.map((id) => {
            const reason = itemReason(id)
            return (
              <li key={id}>
                <span>
                  <b>{itemName(id)}</b> <small>×{owned[id] ?? 0}</small>
                </span>
                {id === 'bottle-cap' ? (
                  <span
                    className="bp-pick"
                    role="group"
                    aria-label="Chọn chỉ số nâng IV"
                  >
                    {build.stats.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className="rm-btn"
                        aria-disabled={
                          busy || !!reason || build.iv[i] >= 31 || undefined
                        }
                        title={reason ?? undefined}
                        onClick={() =>
                          !busy &&
                          !reason &&
                          build.iv[i] < 31 &&
                          applyItem(id, i)
                        }
                      >
                        {statLabel(i)}
                      </button>
                    ))}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rm-btn rm-primary"
                    aria-disabled={busy || !!reason || undefined}
                    onClick={() => !busy && !reason && applyItem(id)}
                  >
                    Dùng
                  </button>
                )}
                {reason && <small className="bp-why">{reason}</small>}
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          className="rm-btn rm-primary bp-awaken"
          aria-disabled={busy || !!awakenReason || undefined}
          onClick={() => !busy && !awakenReason && awaken()}
        >
          ✦ Thức tỉnh (+1 sao)
        </button>
        <small className="bp-why">
          {awakenReason ?? 'Miễn phí, một lần cho mỗi Pokémon'}
        </small>
        <p className="rm-alert" role="alert">
          {slot === null || !choosing ? actionError : ''}
        </p>
      </section>
      {slot !== null && (
        <MovePicker
          open={choosing}
          slot={slot}
          data={learnset}
          build={build}
          bag={owned}
          affection={affection}
          busy={busy}
          error={actionError}
          onClose={() => setChoosing(false)}
          onPick={async (move) => !!(await setMove(slot, move))}
        />
      )}
    </>
  )
}
