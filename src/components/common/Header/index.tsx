import Icon from 'components/common/Icon'
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
          <Icon name="menu" className="icon" />
        </button>
        <button
          type="button"
          className="right"
          aria-label="Tìm kiếm"
          onClick={onClickSearch}
        >
          <Icon name="search" className="icon" />
        </button>
      </HeaderBackgroundStyle>
      <AvatarStyle
        className={`${RenderingInfo.loader ? 'lazy-load' : 'full-load'}`}
      ></AvatarStyle>
    </HeaderStyle>
  )
}

export default Header
