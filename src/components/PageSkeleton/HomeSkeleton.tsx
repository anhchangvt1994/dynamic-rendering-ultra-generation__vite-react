import FieldIcon, { Pokeball } from 'components/common/FieldIcon'
import { TYPE_DATA } from 'components/pokemon-page/type-data.mjs'
import { GENERATIONS } from 'pages/HomePage/catalog.mjs'
import { HeroStyle } from 'pages/HomePage/styles'
import type { CSSProperties } from 'react'
import styled from 'styled-components'
import { boneCss } from './bone'
import DexNumber from './DexNumber'

// What never changes is drawn for real: the hero copy (with the hero's own
// styles), the strip, the catalogue heading, region names, type chips. Only
// the data waits: today's encounter ("#0000" searching, a Poké Ball
// mid-catch), the collection count and the Pokémon cards, whose balls
// shake one after another like a wave. Gutters and heights mirror
// HomePageStyle / PokemonListStyle so nothing jumps when the page lands.
const HomeSkeletonStyle = styled.div`
  ${boneCss}
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 40px 0;
  color: var(--ink);

  /* buttons the app wires up: drawn, not pressable yet */
  .hero-actions button:disabled {
    opacity: 1;
    cursor: progress;
  }
  .encounter .bone {
    --bone: rgba(23, 45, 69, 0.1);
    --shine: rgba(255, 255, 255, 0.45);
  }
  .encounter-top .dex {
    font-weight: 700;
  }
  /* out of flow and centred, like the real artwork's link */
  .encounter-art .encounter-ball {
    position: absolute;
    inset: 0;
    margin: auto;
    z-index: 2;
    width: 112px;
    rotate: -7deg;
  }
  /* fluid: a fixed width here would widen the hero grid on a phone */
  .encounter-name {
    flex: 1;
    max-width: 150px;
  }
  .encounter-picker span {
    width: 35px;
    height: 35px;
    border: 1px solid #172d452a;
    border-radius: 50%;
    background: #ffffff35;
  }

  .strip {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 4px;
    color: var(--muted);
    font-size: 12px;
    letter-spacing: 1px;
  }
  .strip span {
    display: inline-flex;
    align-items: center;
    gap: 9px;
  }
  .strip span:first-child {
    font-weight: 700;
    color: var(--ink);
  }
  .collection {
    display: flex;
    align-items: center;
    gap: 18px;
    height: 96px;
    padding: 0 26px;
    border: 1px solid #c9e2d6;
    border-radius: var(--radius-card);
    background: var(--mint);
  }
  .collection .bone {
    --bone: rgba(23, 45, 69, 0.08);
    --shine: rgba(255, 255, 255, 0.6);
  }
  .collection-mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
  }
  .collection-mark svg {
    width: 32px;
  }
  .collection-copy {
    display: grid;
    gap: 8px;
    flex: 1;
  }
  .collection-copy strong {
    font-size: 14px;
    font-weight: 700;
  }
  .regions {
    display: flex;
    gap: 8px;
    margin: 12px 0 0;
    padding: 2px;
    overflow: hidden;
  }
  .region {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 6px;
    flex: 1 0 92px;
    height: 113px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
  .ring {
    width: 46px;
    height: 46px;
    border: 4px solid var(--line);
    border-radius: 50%;
  }

  .catalog {
    padding-top: 44px;
  }
  .heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 24px;
  }
  .heading small {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.8px;
    color: var(--muted);
  }
  .heading h2 {
    margin-top: 5px;
    font-size: clamp(23px, 2.4vw, 30px);
    font-weight: 800;
    letter-spacing: -1.1px;
  }
  .heading h2 span {
    color: var(--red);
  }
  .shuffle {
    width: 44px;
    height: 44px;
    border-radius: 13px;
  }
  .tools {
    display: grid;
    grid-template-columns: 1fr 165px 165px;
    gap: 12px 10px;
  }
  .tools .bone {
    height: 50px;
    border-radius: 12px;
  }
  .chips {
    display: flex;
    gap: 7px;
    margin-top: 16px;
    padding: 3px 2px;
    overflow: hidden;
  }
  .chips span {
    display: flex;
    flex: none;
    align-items: center;
    gap: 7px;
    min-height: 37px;
    padding: 0 13px;
    border: 1px solid var(--line);
    border-radius: 99px;
    background: var(--surface);
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
  }
  .chips span:first-child {
    border-color: var(--ink);
    background: var(--ink);
    color: #fff;
  }
  .chips i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--type);
  }
  .tabs {
    display: flex;
    gap: 5px;
    margin: 20px 0 18px;
  }
  .tabs .bone {
    height: 39px;
    border-radius: 9px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }
  .card {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 10px;
    height: 258px;
    padding: 15px 18px 17px;
    border-radius: 18px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .card .dex {
    font-size: 12px;
    font-weight: 700;
    color: #a3b1c0;
  }
  .card .catch-ball {
    width: 52px;
    margin: auto;
  }
  .card .name {
    width: 64%;
    height: 16px;
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  @media (max-width: 680px) {
    padding: 16px 18px 0;
    .encounter-art .encounter-ball {
      width: 88px;
    }
    /* the real note wraps to two lines on a phone */
    .encounter-name {
      display: grid;
      align-content: center;
      min-height: 65px;
    }
    .strip {
      justify-content: center;
      padding: 15px 0;
      font-size: 11px;
    }
    .strip span:last-child {
      display: none;
    }
    .collection {
      height: 101px;
      gap: 10px;
      padding: 0 16px;
      border-radius: 17px;
    }
    .collection-mark {
      width: 35px;
      height: 35px;
    }
    .collection-mark svg {
      width: 25px;
    }
    .collection-copy strong {
      font-size: 12px;
    }
    .catalog {
      padding-top: 28px;
    }
    .heading {
      margin-bottom: 17px;
    }
    .heading small {
      letter-spacing: 1.6px;
    }
    .heading h2 {
      margin-top: 4px;
      font-size: 21px;
      letter-spacing: -0.8px;
    }
    .shuffle {
      width: 36px;
      height: 39px;
      border-radius: 10px;
    }
    .tools {
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }
    .tools .search {
      grid-column: 1 / -1;
      height: 46px;
    }
    .tools .bone {
      height: 44px;
    }
    .chips {
      margin: 11px -18px 0;
      padding: 4px 18px;
    }
    .chips span {
      min-height: 35px;
      padding: 0 12px;
      font-size: 12px;
    }
    .tabs {
      margin: 12px 0;
    }
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 11px;
    }
    .card {
      height: 211px;
      padding: 11px 13px 14px;
      border-radius: 14px;
    }
    .card .catch-ball {
      width: 44px;
    }
  }
  @media (max-width: 360px) {
    .collection {
      height: 118px;
    }
  }
`

const TYPES = Object.values(TYPE_DATA)

export default function HomeSkeleton() {
  return (
    <HomeSkeletonStyle className="home-skeleton" role="status" aria-busy="true">
      <span className="sr-only">Đang mở Pokédex…</span>
      <HeroStyle style={{ '--encounter': '#dde4ee' } as CSSProperties}>
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> NHẬT KÝ CỦA MỘT NHÀ HUẤN LUYỆN
          </span>
          <h1>
            Một thế giới.
            <br />
            <span>Ngàn người bạn.</span>
          </h1>
          <p>
            Khám phá Pokémon. Tìm người bạn đồng hành.
            <br />
            Viết tiếp hành trình của riêng bạn.
          </p>
          <div className="hero-actions" aria-hidden="true">
            <button className="explore" type="button" disabled>
              Mở Pokédex <FieldIcon name="arrow" size={18} />
            </button>
            <button className="random" type="button" disabled>
              <FieldIcon name="shuffle" size={17} /> Gặp ngẫu nhiên
            </button>
            <LinkCustom className="random quiz-link" to="/ai-day" tabIndex={-1}>
              <span className="quiz-badge">?</span>
              Chơi “Ai đây?”
            </LinkCustom>
          </div>
          <div className="hero-footnote">
            <span>1.025 Pokémon</span>
            <i />
            <span>9 thế hệ</span>
            <i />
            <span>Vô vàn câu chuyện</span>
          </div>
        </div>
        <div className="encounter" aria-hidden="true">
          <div className="encounter-top">
            <span>
              <i /> CUỘC GẶP HÔM NAY
            </span>
            <DexNumber rolling />
          </div>
          <div className="encounter-art">
            <span className="encounter-word">???</span>
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <span className="spark spark-one">✦</span>
            <span className="spark spark-two">✧</span>
            <span className="catch-ball encounter-ball" />
          </div>
          <div className="encounter-bottom">
            <div className="encounter-name">
              <span className="bone" style={{ width: '70%', height: 22 }} />
              <span
                className="bone"
                style={{ width: '100%', height: 11, marginTop: 6 }}
              />
            </div>
            <div className="encounter-picker">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </HeroStyle>
      <div aria-hidden="true">
        <div className="strip">
          <span>
            <FieldIcon name="spark" size={15} /> MỖI POKÉMON, MỘT CÂU CHUYỆN.
          </span>
          <span>
            Hành trình của bạn bắt đầu ở đây <FieldIcon name="arrow" size={16} />
          </span>
        </div>
        <section className="collection">
          <span className="collection-mark">
            <Pokeball />
          </span>
          <div className="collection-copy">
            <strong>Bộ sưu tập của bạn</strong>
            <span className="bone" style={{ width: '60%', height: 11 }} />
          </div>
        </section>
        <div className="regions">
          {GENERATIONS.map((gen) => (
            <span key={gen.id} className="region">
              <span className="ring" />
              {gen.name}
              <span className="bone" style={{ width: 40, height: 10 }} />
            </span>
          ))}
        </div>
        <section className="catalog">
          <div className="heading">
            <div>
              <small>POKÉDEX TOÀN QUỐC</small>
              <h2>
                Tìm người bạn tiếp theo<span>.</span>
              </h2>
            </div>
            <span className="bone shuffle" />
          </div>
          <div className="tools">
            <span className="bone search" />
            <span className="bone" />
            <span className="bone" />
          </div>
          <div className="chips">
            <span>Tất cả hệ</span>
            {TYPES.map((type) => (
              <span
                key={type.label}
                style={{ '--type': type.color } as CSSProperties}
              >
                <i />
                {type.label}
              </span>
            ))}
          </div>
          <div className="tabs">
            <span className="bone" style={{ width: 82 }} />
            <span className="bone" style={{ width: 109 }} />
          </div>
          <div className="grid">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="card">
                <DexNumber />
                <span
                  className="catch-ball"
                  style={{ '--i': index } as CSSProperties}
                />
                <span className="bone name" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </HomeSkeletonStyle>
  )
}
