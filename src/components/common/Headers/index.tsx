import { AvatarStyle, HeaderBackgroundStyle, HeaderStyle } from './styles'

const Header = (props) => {
  const { onClickMenu = () => {}, onClickSearch = () => {} } = props

  return (
    <HeaderStyle>
      <HeaderBackgroundStyle>
        <div className="left" onClick={onClickMenu}>
          <span className="material-symbols-outlined">menu</span>
        </div>
        <div className="right" onClick={onClickSearch}>
          <span className="material-symbols-outlined">search</span>
        </div>
      </HeaderBackgroundStyle>
      <AvatarStyle
        className={`${RenderingInfo.loader ? 'lazy-load' : 'full-load'}`}
      ></AvatarStyle>
    </HeaderStyle>
  )
}

export default Header
