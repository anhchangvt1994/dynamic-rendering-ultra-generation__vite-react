import { Pokeball } from 'components/common/FieldIcon'
import { HeaderStyle } from 'components/common/Header/styles'
import styled from 'styled-components'
import { boneCss } from './bone'

// Same bar as the real header (height, colours, the dark variant on a
// Pokémon's page). The brand is real: it is a plain link that works before
// the app starts. The nav and the buttons, which need the app, are bones.
const HeaderSkeletonStyle = styled(HeaderStyle)`
  ${boneCss}
  nav {
    align-items: center;
  }
  nav .bone {
    height: 13px;
  }
  .header-actions .bone {
    height: 44px;
    border-radius: 12px;
  }
  .search-bone {
    width: 113px;
  }
  .menu-bone {
    display: none;
    width: 44px;
  }
  body:has(.pokemon-page) & .bone {
    --bone: rgba(255, 255, 255, 0.08);
    --shine: rgba(255, 255, 255, 0.17);
  }
  @media (max-width: 680px) {
    .search-bone {
      width: 44px;
    }
    .menu-bone {
      display: block;
    }
  }
`

const NAV_WIDTHS = [65, 70, 50, 52]

export default function HeaderSkeleton() {
  return (
    <HeaderSkeletonStyle>
      <div className="header-inner">
        <LinkCustom className="brand" to="/" aria-label="Pokédex — Trang chủ">
          <Pokeball />
          <span>
            poké<span className="brand-light">dex</span>
            <i>FIELD NOTES</i>
          </span>
        </LinkCustom>
        <nav aria-hidden="true">
          {NAV_WIDTHS.map((width, index) => (
            <span key={index} className="bone" style={{ width }} />
          ))}
        </nav>
        <div className="header-actions" aria-hidden="true">
          <span className="bone search-bone" />
          <span className="bone menu-bone" />
        </div>
      </div>
    </HeaderSkeletonStyle>
  )
}
