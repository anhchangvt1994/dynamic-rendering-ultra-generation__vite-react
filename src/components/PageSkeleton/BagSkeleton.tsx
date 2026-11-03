import type { CSSProperties } from 'react'
import { BagStyle } from 'pages/BagPage/styles'
import { Backpack, PocketGlyph, POCKET_TABS } from 'pages/BagPage/BagArt'
import BagBones from 'pages/BagPage/BagBones'

// The bag page's own markup and styles (BagStyle). No words at all: every
// text is a bone of its box's fixed size, so whether the fonts have come
// or not, the hand-over to the page moves nothing. The drawings (bag,
// pocket signs) are SVG and stay.
export default function BagSkeleton() {
  return (
    <BagStyle
      className="bag-page"
      role="status"
      aria-busy="true"
      data-tone="dark"
      data-page-skeleton
      style={{ '--pocket': POCKET_TABS[0].color } as CSSProperties}
    >
      <span className="sr-only">Đang mở túi đồ…</span>
      <header className="bag-hero" aria-hidden="true">
        <div className="bag-art">
          <Backpack />
        </div>
        <div className="bag-name">
          <span className="bag-kicker">
            <span className="bone" />
          </span>
          <span className="bag-title">
            <span className="bone" />
          </span>
        </div>
        <div className="stickers">
          {['#ffda55', '#4fd18b', '#c38bff'].map((c, i) => (
            <div
              key={c}
              className="sticker"
              style={{ '--c': c, '--i': i } as CSSProperties}
            >
              <span className="sticker-dt">
                <span className="bone" />
              </span>
              <span className="sticker-dd">
                <span className="bone" />
              </span>
            </div>
          ))}
        </div>
        <div className="bag-tiers">
          <span className="tier-bar" />
          <span className="tier-legend">
            <span className="bone" />
          </span>
        </div>
      </header>
      <div className="pockets" aria-hidden="true">
        {POCKET_TABS.map((p, i) => (
          <span
            key={p.id}
            className="tag"
            aria-pressed={i === 0}
            style={{ '--c': p.color, '--i': i } as CSSProperties}
          >
            <span className="tag-card">
              <span className="tag-glyph">
                <PocketGlyph id={p.id} />
              </span>
              <span className="tag-label">
                <span className="bone" />
              </span>
              <span className="tag-count">
                <span className="bone" />
              </span>
            </span>
          </span>
        ))}
      </div>
      <div className="pocket-panel">
        <div className="bag-head" aria-hidden="true">
          <span className="bag-pocket">
            <span className="bone" />
          </span>
          <span className="bag-tools">
            <span className="sort">
              <span className="bone" />
            </span>
            <span className="seek">
              <span className="bone" />
            </span>
          </span>
        </div>
        <BagBones />
      </div>
    </BagStyle>
  )
}
