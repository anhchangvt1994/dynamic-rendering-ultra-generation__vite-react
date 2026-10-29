import FieldIcon, { Pokeball } from 'components/common/FieldIcon'
import { useLocation } from 'react-router'
import { HeaderStyle } from './styles'

const Header = ({
  onClickMenu = () => {},
  onClickSearch = () => {},
  isMenuOpen = false,
  isSearchOpen = false,
}) => {
  const location = useLocation()
  const collection =
    location.pathname === '/' &&
    new URLSearchParams(location.search).get('view') === 'caught'
  return (
    <HeaderStyle>
      <div className="header-inner">
        <LinkCustom className="brand" to="/" aria-label="Pokédex — Trang chủ">
          <Pokeball />
          <span>
            poké<span className="brand-light">dex</span>
            <i>FIELD NOTES</i>
          </span>
        </LinkCustom>
        <nav aria-label="Điều hướng chính">
          <LinkCustom
            to="/"
            aria-current={
              location.pathname === '/' && !collection ? 'page' : undefined
            }
          >
            Khám phá
          </LinkCustom>
          <LinkCustom
            to="/?view=caught"
            aria-current={collection ? 'page' : undefined}
          >
            Bộ sưu tập
          </LinkCustom>
          <LinkCustom
            to="/ai-day"
            aria-current={location.pathname === '/ai-day' ? 'page' : undefined}
          >
            Ai đây?
          </LinkCustom>
          <LinkCustom
            to="/blogs"
            aria-current={
              location.pathname.startsWith('/blogs') ? 'page' : undefined
            }
          >
            Bài viết
          </LinkCustom>
        </nav>
        <div className="header-actions">
          <button
            className="search-trigger"
            type="button"
            aria-label="Tìm Pokémon hoặc bài viết"
            aria-haspopup="dialog"
            aria-expanded={isSearchOpen}
            onClick={onClickSearch}
          >
            <FieldIcon name="search" />
            <span>Tìm kiếm</span>
          </button>
          <button
            className="menu-trigger"
            type="button"
            aria-label="Mở menu"
            aria-haspopup="dialog"
            aria-expanded={isMenuOpen}
            onClick={onClickMenu}
          >
            <FieldIcon name="menu" />
          </button>
        </div>
      </div>
    </HeaderStyle>
  )
}
export default Header
