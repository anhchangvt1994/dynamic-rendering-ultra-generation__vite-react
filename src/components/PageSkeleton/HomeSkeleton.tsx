import styled from 'styled-components'
import { boneCss } from './bone'

// Mirrors HomePageStyle / HeroStyle / PokemonListStyle: same gutters,
// breakpoints and block heights, so the page does not jump when it lands.
const HomeSkeletonStyle = styled.div`
  ${boneCss}
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 40px 0;

  .hero {
    display: grid;
    grid-template-columns: 1.08fr 1fr;
    min-height: 410px;
    border-radius: 26px;
    background: var(--ink);
    overflow: hidden;
  }
  .hero-copy {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 40px 0 30px 40px;
  }
  .eyebrow {
    width: 190px;
    height: 11px;
  }
  .title {
    width: 62%;
    height: 44px;
    margin-top: 22px;
  }
  .title + .title {
    width: 78%;
    margin-top: 10px;
    margin-bottom: 18px;
    --bone: rgba(255, 218, 85, 0.22);
    --shine: rgba(255, 218, 85, 0.38);
  }
  .line {
    width: 56%;
    height: 11px;
    margin-top: 9px;
  }
  .line--narrow {
    display: none;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 18px;
    margin-top: 26px;
  }
  .hero .explore {
    width: 135px;
    height: 44px;
    border-radius: 10px;
    --bone: rgba(255, 218, 85, 0.45);
    --shine: rgba(255, 218, 85, 0.7);
  }
  .action {
    width: 104px;
    height: 16px;
  }
  .encounter {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 16px;
    margin: 11px 14px 11px 18px;
    padding: 22px 24px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.06);
  }
  .encounter-art {
    width: min(64%, 230px);
    aspect-ratio: 1;
    margin: auto;
  }
  .encounter-name {
    width: 130px;
    height: 22px;
  }

  .strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 54px;
    padding: 0 4px;
  }
  .strip .bone {
    width: 200px;
    height: 12px;
  }
  .collection {
    display: flex;
    align-items: center;
    gap: 18px;
    height: 96px;
    padding: 0 26px;
    border-radius: var(--radius-card);
    background: var(--mint);
  }
  .collection .bone {
    --bone: rgba(23, 45, 69, 0.08);
    --shine: rgba(255, 255, 255, 0.6);
  }
  .collection .mark {
    width: 50px;
    height: 50px;
  }
  .collection .copy {
    display: grid;
    gap: 8px;
    flex: 1;
  }
  .regions {
    display: flex;
    gap: 8px;
    margin: 12px 0 0;
    padding: 2px;
    overflow: hidden;
  }
  .regions .bone {
    flex: 1 0 92px;
    height: 113px;
    border-radius: 14px;
  }

  .catalog {
    padding-top: 44px;
  }
  .heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .heading-title {
    width: 344px;
    height: 45px;
    margin-top: 14px;
  }
  .random {
    width: 44px;
    height: 44px;
    border-radius: 13px;
  }
  .tools {
    display: grid;
    grid-template-columns: 1fr 165px 165px;
    gap: 12px 10px;
    margin-top: 24px;
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
  .chips .bone {
    height: 37px;
  }
  .tabs {
    display: flex;
    gap: 5px;
    margin: 72px 0 18px;
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
  .card .art {
    width: 60%;
    aspect-ratio: 1;
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
    .hero {
      grid-template-columns: 1fr;
      border-radius: 21px;
    }
    .hero-copy {
      padding: 25px 23px 0;
    }
    .hero-copy .eyebrow {
      margin-block: 3px;
    }
    .title {
      width: 58%;
      height: 32px;
      margin-top: 15px;
    }
    .title + .title {
      width: 84%;
      margin-top: 6px;
      margin-bottom: 11px;
    }
    .line {
      width: 90%;
    }
    /* two rows on phones: the buttons, then the quiz link */
    .actions {
      align-content: flex-start;
      gap: 15px;
      min-height: 100px;
      margin-top: 19px;
    }
    .hero .explore {
      width: 126px;
      height: 41px;
    }
    .encounter {
      height: 288px;
      margin: 18px 14px 17px;
    }
    .strip {
      justify-content: center;
      height: 47px;
    }
    .strip .bone:last-child {
      display: none;
    }
    .collection {
      height: 101px;
      gap: 10px;
      padding: 0 16px;
      border-radius: 17px;
    }
    .collection .mark {
      width: 35px;
      height: 35px;
    }
    .regions {
      margin-top: 12px;
    }
    .catalog {
      padding-top: 28px;
    }
    .heading-title {
      width: 240px;
      height: 32px;
    }
    .random {
      width: 36px;
      height: 39px;
    }
    .tools {
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-top: 16px;
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
    .chips .bone {
      height: 35px;
    }
    .tabs {
      margin: 12px 0;
    }
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 11px;
    }
  }
  /* 320-360px: the eyebrow and the intro wrap one more line */
  @media (max-width: 360px) {
    .hero-copy .eyebrow {
      margin-bottom: 19px;
    }
    .line--narrow {
      display: block;
    }
    .collection {
      height: 118px;
    }
    .card {
      height: 211px;
      padding: 11px 13px 14px;
      border-radius: 14px;
    }
  }
`

const CHIP_WIDTHS = [80, 58, 63, 71, 66, 60, 74, 62, 70, 58, 66]

export default function HomeSkeleton() {
  return (
    <HomeSkeletonStyle className="home-skeleton" role="status" aria-busy="true">
      <span className="sr-only">Đang mở Pokédex…</span>
      <div aria-hidden="true">
        <section className="hero" data-tone="dark">
          <div className="hero-copy">
            <span className="bone eyebrow" />
            <span className="bone title" />
            <span className="bone title" />
            <span className="bone line" />
            <span className="bone line" />
            <span className="bone line line--narrow" />
            <div className="actions">
              <span className="bone explore" />
              <span className="bone action" />
              <span className="bone action" />
            </div>
          </div>
          <div className="encounter">
            <span className="bone eyebrow" />
            <span className="bone bone--round encounter-art" />
            <span className="bone encounter-name" />
          </div>
        </section>
        <div className="strip">
          <span className="bone" />
          <span className="bone" />
        </div>
        <section className="collection">
          <span className="bone bone--round mark" />
          <div className="copy">
            <span className="bone" style={{ width: 150, height: 15 }} />
            <span className="bone" style={{ width: '60%', height: 11 }} />
          </div>
        </section>
        <div className="regions">
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} className="bone" />
          ))}
        </div>
        <section className="catalog">
          <div className="heading">
            <div>
              <span className="bone eyebrow" />
              <span className="bone heading-title" />
            </div>
            <span className="bone random" />
          </div>
          <div className="tools">
            <span className="bone search" />
            <span className="bone" />
            <span className="bone" />
          </div>
          <div className="chips">
            {CHIP_WIDTHS.map((width, index) => (
              <span
                key={index}
                className="bone bone--pill"
                style={{ width }}
              />
            ))}
          </div>
          <div className="tabs">
            <span className="bone" style={{ width: 82 }} />
            <span className="bone" style={{ width: 109 }} />
          </div>
          <div className="grid">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="card">
                <span className="bone" style={{ width: 44, height: 12 }} />
                <span className="bone bone--round art" />
                <span className="bone name" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </HomeSkeletonStyle>
  )
}
