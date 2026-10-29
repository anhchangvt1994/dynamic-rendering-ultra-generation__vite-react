import { AvatarStyle, HeaderBackgroundStyle, HeaderStyle } from './styles'

const Header = (props) => {
  const { onClickMenu = () => {}, onClickSearch = () => {} } = props

  return (
    <HeaderStyle>
      <HeaderBackgroundStyle>
        <button
          type="button"
          className="left"
          aria-label="Mở menu"
          onClick={onClickMenu}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>
        <button
          type="button"
          className="right"
          aria-label="Tìm kiếm"
          onClick={onClickSearch}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
        </button>
      </HeaderBackgroundStyle>
      <AvatarStyle
        className={`${RenderingInfo.loader ? 'lazy-load' : 'full-load'}`}
      ></AvatarStyle>
    </HeaderStyle>
  )
}

export default Header
