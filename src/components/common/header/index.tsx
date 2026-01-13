import { AvatarStyle, HeaderBackgroundStyle, HeaderStyle } from './styles'

const Header = () => {
  return (
    <HeaderStyle>
      <HeaderBackgroundStyle>
        <div className="left">
          <span>Poke</span>
        </div>
        <div className="right">
          <span>Monster</span>
        </div>
      </HeaderBackgroundStyle>
      <AvatarStyle
        className={`${RenderingInfo.loader ? 'lazy-load' : 'full-load'}`}
      ></AvatarStyle>
    </HeaderStyle>
  )
}

export default Header
