import { useAccount } from 'app/supabase/account'
import { useTrainerAvatar } from 'app/supabase/trainerAvatar'
import AvatarArt from 'pages/MiniGamePage/trainer/AvatarArt'
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
  const account = useAccount()
  const { avatar: trainerAvatar, image: trainerImage } = useTrainerAvatar(
    account.user?.id
  )
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
            <i>JOURNEY</i>
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
            to="/whos-that-pokemon"
            aria-current={
              location.pathname === '/whos-that-pokemon' ? 'page' : undefined
            }
          >
            Who’s That Pokémon?
          </LinkCustom>
          {/* items live on accounts: no accounts, no bag (dev keeps one) */}
          {(account.status !== 'off' || import.meta.env.DEV) && (
            <LinkCustom
              to="/tui-do"
              aria-current={
                location.pathname === '/tui-do' ? 'page' : undefined
              }
            >
              Túi đồ
            </LinkCustom>
          )}
          {(account.status !== 'off' || import.meta.env.DEV) && (
            <LinkCustom
              to="/che-bien"
              aria-current={
                location.pathname === '/che-bien' ? 'page' : undefined
              }
            >
              Chế biến
            </LinkCustom>
          )}
          {(account.status !== 'off' || import.meta.env.DEV) && (
            <LinkCustom
              to="/mini-game"
              aria-current={
                location.pathname === '/mini-game' ? 'page' : undefined
              }
            >
              Mini game
            </LinkCustom>
          )}
          <LinkCustom
            to="/ban-do"
            aria-current={
              location.pathname === '/ban-do' ? 'page' : undefined
            }
          >
            Bản đồ
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
          {account.status !== 'off' && (
            <LinkCustom
              className="account-trigger"
              to="/dang-nhap"
              state={{ from: location.pathname + location.search }}
              aria-current={
                location.pathname === '/dang-nhap' ? 'page' : undefined
              }
              aria-label={
                account.user ? `Tài khoản ${account.user.email}` : 'Đăng nhập'
              }
            >
              {account.user ? (
                <span
                  className="avatar"
                  data-trainer={
                    trainerAvatar && (trainerAvatar !== 'custom' || trainerImage)
                      ? trainerAvatar
                      : undefined
                  }
                  aria-hidden="true"
                >
                  {trainerAvatar && (trainerAvatar !== 'custom' || trainerImage) ? (
                    <AvatarArt id={trainerAvatar} image={trainerImage} size={32} />
                  ) : (
                    (account.user.email || '?').charAt(0).toUpperCase()
                  )}
                </span>
              ) : (
                <>
                  <FieldIcon name="user" />
                  <span>Đăng nhập</span>
                </>
              )}
            </LinkCustom>
          )}
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
