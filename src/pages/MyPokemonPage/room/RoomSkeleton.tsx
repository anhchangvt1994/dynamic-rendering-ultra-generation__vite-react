import type { CSSProperties, ReactNode } from 'react'
import { OWNED_COLLECTION_PATH } from '../paths.mjs'
import CareBar from './CareBar'
import Chevron from './Chevron'
import NeedRings from './NeedRings'
import { RoomStyle } from './styles'

// the room before its Pokémon is known: RoomStyle's own boxes (nameplate,
// needs, bubble, circle, sticker, dock, profile column) in a neutral theme,
// so the room lands on the same geometry
const RoomSkeletonStyle = styled(RoomStyle)`
  .rm-skel {
    display: block;
    border-radius: 999px;
    background:
      linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.08),
          transparent
        )
        0 0 / 200% 100%,
      rgba(255, 255, 255, 0.08);
  }
  @media (prefers-reduced-motion: no-preference) {
    .rm-skel {
      animation: rm-shimmer 1.4s linear infinite;
    }
  }
  @keyframes rm-shimmer {
    to {
      background-position:
        -200% 0,
        0 0;
    }
  }
  /* the h1's line box (and MyPokemonStyle's h1 margin), a bar in it */
  .rm-h {
    display: flex;
    margin-bottom: 4px;
    align-items: center;
    font-size: clamp(18px, 5.6vw, 24px);
  }
  .rm-h::before {
    content: '\\200b';
  }
  .rm-h .rm-skel {
    width: min(9em, 40vw);
    max-width: 100%;
    height: 0.8em;
  }
  .rm-name .rm-stars {
    opacity: 0.35;
  }
  .rm-xp .rm-skel {
    width: 56px;
    height: 26px;
    border-radius: 8px;
  }
  .rm-disc {
    background: rgba(255, 255, 255, 0.06);
    box-shadow:
      0 0 0 4px rgba(255, 255, 255, 0.1),
      0 0 0 11px rgba(255, 255, 255, 0.03);
  }
  .rm-disc::before {
    border-color: rgba(255, 255, 255, 0.12);
  }
  .rm-sticker {
    min-width: 90px;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: none;
  }
  .rm-act {
    opacity: 0.5;
  }
  .rm-card .rm-skel {
    border-radius: 12px;
  }
  .rm-card-level .rm-skel {
    height: 160px;
  }
  .rm-card-stats .rm-skel {
    height: 297px;
  }
  .rm-card-profile .rm-skel {
    height: 417px;
  }
  @media (min-width: 960px) {
    .rm-h {
      font-size: 30px;
    }
    /* a usual name's width, so the needs beside it keep theirs */
    .rm-h .rm-skel {
      width: 5em;
    }
  }
`

const THEME = {
  '--fg': '#ffffff',
  '--star': '#ffd447',
  '--bg': '#111111',
  '--a1': '#4a4f58',
  '--a2': '#2a2d33',
  '--ink': '#ffffff',
} as CSSProperties

const CARDS = [
  ['level', 'Thân thiết'],
  ['stats', 'Trưởng thành'],
  ['profile', 'Hồ sơ'],
] as const

const none = () => {}

/** The room while its Pokémon loads; back is the live way out. */
export default function RoomSkeleton({
  id,
  back,
}: {
  id: string
  back?: ReactNode
}) {
  return (
    <RoomSkeletonStyle
      className="rm-layout"
      style={THEME}
      data-tone="dark"
      data-page-skeleton
    >
      <section
        className="rm-room"
        role="status"
        aria-busy="true"
        aria-label="Đang tải phòng"
      >
        <div className="rm-sky" aria-hidden="true" />
        <div className="rm-floor" aria-hidden="true" />
        <div className="rm-upper">
          <div className="rm-hud">
            <div className="rm-head">
              {back ?? (
                <LinkCustom
                  className="rm-back"
                  to={OWNED_COLLECTION_PATH}
                  aria-label="Về Bộ sưu tập"
                >
                  <Chevron size={20} />
                  <span className="rm-back-text">Bộ sưu tập</span>
                </LinkCustom>
              )}
              <span className="rm-name" aria-hidden="true">
                <span
                  className="rm-medal"
                  style={{ '--lv': '0%' } as CSSProperties}
                >
                  <b>1</b>
                  <small>♥</small>
                </span>
                <span className="rm-id">
                  <span className="rm-h">
                    <span className="rm-skel" />
                  </span>
                  <p>
                    <span className="rm-stars">☆☆☆☆☆</span>
                  </p>
                </span>
                <span className="rm-xp">
                  <span className="rm-skel" />
                </span>
              </span>
            </div>
            <div className="rm-needs" aria-hidden="true">
              <NeedRings needs={null} />
            </div>
          </div>
          <div className="rm-bubble-wrap">
            <p className="rm-bubble">
              <span className="rm-emoji" aria-hidden="true">
                {'​'}
              </span>
              Đang tải…
            </p>
          </div>
        </div>
        <div className="rm-stage" aria-hidden="true">
          <div className="rm-disc" />
          <span className="rm-sticker">{' '}</span>
        </div>
      </section>
      <div className="rm-dock" aria-hidden="true" inert>
        <span className="rm-sheet-toggle">
          <span className="rm-grab" />
          <span className="rm-toggle-label">
            Chỉ số · hồ sơ
            <span className="rm-chev" />
          </span>
        </span>
        <div className="rm-profile">
          {CARDS.map(([key, title]) => (
            <section key={key} className={`rm-card rm-card-${key}`}>
              <h2>{title}</h2>
              <span className="rm-skel" />
            </section>
          ))}
        </div>
        <CareBar
          individualId={id}
          blocked={null}
          urgent={{}}
          busy
          onFeed={none}
          onBathe={none}
          onPet={none}
        />
      </div>
    </RoomSkeletonStyle>
  )
}
