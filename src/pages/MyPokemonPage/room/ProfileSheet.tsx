import type { Individual } from 'pages/BagPage/individuals/client'
import {
  marksLabel,
  paletteLabel,
  personalityLine,
  sizeLabel,
  sizeOf,
  starLabel,
} from 'pages/BagPage/individuals/display.mjs'
import { nameError } from 'pages/BagPage/individuals/messages.mjs'
import PaletteDots from 'pages/BagPage/individuals/PaletteDots'
import { useNaming } from 'pages/BagPage/individuals/useIndividuals'
import { FLAVOR_LABEL, STATS } from 'pages/KitchenPage/kitchen.mjs'
import { type CSSProperties, useState } from 'react'
import {
  CARE,
  levelOf,
  nextLevelAt,
  statCap,
  unlocksAt,
} from '../care/care.mjs'
import { LIKES } from '../care/likes.mjs'
import type { CareState } from '../care/useCare'
import BuildPanel from '../build/BuildPanel'
import { starsFor } from '../build/format.mjs'
import type { useBuild } from '../build/useBuild'
import StatRadar from './StatRadar'

const date = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN')
}

// what the room shows at each level, at the first level unlocksAt opens it
export const UNLOCKS = (
  [
    ['sticker', '★', 'Hình dán'],
    ['sparkles', '✦', 'Lấp lánh'],
    ['gold', '◎', 'Vòng vàng'],
  ] as const
).map(([key, icon, label]) => ({
  icon,
  label,
  level: CARE.LEVELS.findIndex((_, i) => unlocksAt(i + 1)[key]) + 1,
}))

const flavorOf = (stat: string) => {
  const flavor = STATS[stat as keyof typeof STATS]?.flavor
  return flavor ? FLAVOR_LABEL[flavor].toLocaleLowerCase('vi') : ''
}

function Nickname({ item }: { item: Individual }) {
  const rename = useNaming()
  const [value, setValue] = useState(item.nickname ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const save = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await rename(item.id, value)
      setSaved(true)
    } catch (e: any) {
      setError(nameError(e?.code ?? e?.message))
    }
    setBusy(false)
  }
  return (
    <form
      className="rm-field"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <label htmlFor="mp-nick">Biệt danh (để trống để xoá)</label>
      <div className="rm-field-row">
        <input
          id="mp-nick"
          value={value}
          maxLength={16}
          autoComplete="off"
          onChange={(event) => {
            setValue(event.target.value)
            setSaved(false)
          }}
        />
        <button
          type="submit"
          className="rm-btn rm-primary"
          aria-disabled={busy || undefined}
        >
          Lưu biệt danh
        </button>
      </div>
      {error && (
        <span
          className="rm-field-msg"
          role="alert"
          data-ok={(!error && saved) || undefined}
        >
          {error ?? (saved ? 'Đã lưu' : '')}
        </span>
      )}
    </form>
  )
}

type Props = {
  item: Individual
  care: CareState | null
  /** the care is still loading: the stats hold their place */
  pending?: boolean
  open: boolean
  buildApi: ReturnType<typeof useBuild>
}

/**
 * Growth, level, the profile (looks included), nickname.
 * A sheet pulled up on mobile, the right column on desktop (styles).
 */
export default function ProfileSheet({
  item,
  care,
  pending = false,
  open,
  buildApi,
}: Props) {
  const personality = personalityLine(item.personality)
  const likes = LIKES[item.personality]
  const marks = marksLabel(item.appearance)
  const size = sizeOf(item.id)
  const affection = care?.affection ?? 0
  const stars = starsFor(buildApi.build, item.potential.stars)
  const level = levelOf(affection)
  const next = nextLevelAt(affection)
  const from = CARE.LEVELS[level - 1] ?? 0
  const progress = next === null ? 1 : (affection - from) / (next - from)
  const top = CARE.LEVELS.length
  // how far along the whole way to the top level
  const reach = Math.min(1, (level - 1 + progress) / (top - 1))

  const unlocks = UNLOCKS.map((unlock) => ({
    ...unlock,
    open: level >= unlock.level,
  }))

  return (
    <div className="rm-profile" id="rm-profile" data-open={open || undefined}>
      <div className="rm-profile-body">
        <div className="rm-paper">
          <section
            className="rm-card rm-card-level"
            aria-labelledby="rm-h-level"
          >
            <h2 id="rm-h-level">Thân thiết</h2>
            <p className="rm-level">
              <b>
                <span aria-hidden="true">♥</span> Lv {level}
              </b>
              <small>
                {next === null ? 'Cấp tối đa' : `${affection}/${next} điểm`}
              </small>
            </p>
            <div
              className="rm-track"
              role="progressbar"
              aria-label="Tiến độ cấp thân thiết"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(reach * 100)}
              style={{ '--reach': `${reach * 100}%` } as CSSProperties}
            >
              <i />
              <ul aria-label="Mở khoá theo cấp">
                {unlocks.map((unlock) => (
                  <li
                    key={unlock.level}
                    data-open={unlock.open || undefined}
                    style={
                      {
                        '--at': `${((unlock.level - 1) / (top - 1)) * 100}%`,
                      } as CSSProperties
                    }
                  >
                    <span aria-hidden="true">{unlock.icon}</span>
                    <b>{unlock.label}</b>
                    <small>
                      {unlock.open ? 'Đã mở' : `Lv ${unlock.level}`}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rm-card" aria-labelledby="rm-h-stats">
            <h2 id="rm-h-stats">Trưởng thành</h2>
            {care ? (
              <StatRadar stats={care.stats} cap={statCap(stars)} />
            ) : pending ? (
              <StatRadar stats={{}} cap={statCap(stars)} pending />
            ) : (
              <p className="rm-muted">Chưa có chỉ số.</p>
            )}
          </section>

          <BuildPanel item={item} affection={affection} api={buildApi} />

          <section className="rm-card" aria-labelledby="rm-h-profile">
            <h2 id="rm-h-profile">Hồ sơ</h2>
            <blockquote className="rm-persona">
              <b>{personality.name}</b>
              <p>{personality.line}</p>
            </blockquote>
            <dl className="rm-facts">
              <div>
                <dt>Sắc độ</dt>
                <dd data-palette={item.appearance.palette}>
                  <PaletteDots
                    appearance={item.appearance}
                    speciesId={item.speciesId}
                  />
                  {paletteLabel(item.appearance)}
                </dd>
              </div>
              {marks && item.appearance.marks && (
                <div>
                  <dt>Đặc điểm</dt>
                  <dd data-marks={item.appearance.marks.kind}>{marks}</dd>
                </div>
              )}
              <div>
                <dt>Kích thước</dt>
                <dd data-size={size.key}>{sizeLabel(size)}</dd>
              </div>
              {likes && (
                <div>
                  <dt>Khẩu vị</dt>
                  <dd>
                    Thích vị {flavorOf(likes.like)}, ghét vị{' '}
                    {flavorOf(likes.dislike)}
                  </dd>
                </div>
              )}
              <div>
                <dt>Tiềm năng</dt>
                <dd>
                  <span className="rm-stars" aria-label={starLabel(stars)}>
                    {'★'.repeat(stars)}
                    {'☆'.repeat(5 - stars)}
                  </span>
                  <span className="rm-cap">Trần chỉ số {statCap(stars)}</span>
                </dd>
              </div>
              {date(item.createdAt) && (
                <div>
                  <dt>Nhận ngày</dt>
                  <dd>{date(item.createdAt)}</dd>
                </div>
              )}
            </dl>
            <Nickname item={item} />
          </section>
        </div>
      </div>
    </div>
  )
}
