import { AvatarStyle, HeaderStyle } from './styles'

const Header = () => {
  return (
    <HeaderStyle>
      <AvatarStyle
        className={`${RenderingInfo.loader ? 'lazy-load' : 'full-load'}`}
      ></AvatarStyle>
    </HeaderStyle>
  )
}

export default Header
