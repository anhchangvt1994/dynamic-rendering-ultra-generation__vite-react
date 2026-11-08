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
    justify-content: center;
    font-size: clamp(26px, 8.6vw, 40px);
    line-height: 1.04;
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
  .rm-card-level .rm-level {
    min-height: 26px;
  }
  .rm-skel-level {
    width: 72px;
    height: 26px;
  }
  .rm-skel-points {
    width: 88px;
    height: 12px;
  }
  .rm-card-level .rm-track {
    isolation: isolate;
  }
  .rm-card-level .rm-track > i {
    background: rgba(255, 255, 255, 0.1);
  }
  .rm-skel-level-stop {
    position: absolute;
    z-index: 1;
    top: 0;
    left: var(--stop);
    width: 28px;
    height: 28px;
    margin-left: -14px;
    border-radius: 50%;
    background: #272a30;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.12);
  }
  .rm-skel-level-stop:nth-of-type(2) {
    --stop: 0%;
  }
  .rm-skel-level-stop:nth-of-type(3) {
    --stop: 50%;
  }
  .rm-skel-level-stop:nth-of-type(4) {
    --stop: 100%;
  }
  .rm-skel-radar {
    width: 100%;
    max-width: 320px;
    aspect-ratio: 248 / 184;
    margin: 0 auto;
  }
  .rm-skel-persona {
    width: 100%;
    height: 64px;
    margin-bottom: 12px;
  }
  .rm-skel-facts {
    width: 100%;
    height: 156px;
  }
  @media (min-width: 960px) {
    .rm-h {
      font-size: clamp(34px, 3.6vw, 52px);
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
              <span className="rm-h">
                <span className="rm-skel" />
              </span>
              <p>
                <span className="rm-stars">☆☆☆☆☆</span>
              </p>
            </span>
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
          <div className="rm-disc">
            <span
              className="rm-medal"
              style={{ '--lv': '0%' } as CSSProperties}
            >
              <b>1</b>
            </span>
            <NeedRings needs={null} />
            <span className="rm-sticker"> </span>
          </div>
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
          <div className="rm-profile-body">
            <div className="rm-paper">
              <section className="rm-card rm-card-level">
                <h2>Thân thiết</h2>
                <p className="rm-level">
                  <b className="rm-skel rm-skel-level" />
                  <span className="rm-skel rm-skel-points" />
                </p>
                <div className="rm-track" aria-hidden="true">
                  <i />
                  <span className="rm-skel-level-stop" />
                  <span className="rm-skel-level-stop" />
                  <span className="rm-skel-level-stop" />
                </div>
              </section>
              <section className="rm-card rm-card-stats">
                <h2>Trưởng thành</h2>
                <div className="rm-radar" aria-hidden="true">
                  <span className="rm-skel rm-skel-radar" />
                </div>
              </section>
              <section className="rm-card rm-card-profile">
                <h2>Hồ sơ</h2>
                <span className="rm-skel rm-skel-persona" />
                <span className="rm-skel rm-skel-facts" />
              </section>
            </div>
          </div>
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
