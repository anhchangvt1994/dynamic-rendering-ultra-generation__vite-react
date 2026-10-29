import useDialog from 'hooks/useDialog'
import {
  BodyStyle,
  ContainerStyle,
  HeaderStyle,
  MenuItemStyle,
  OverlayStyle,
} from './styles'

interface MenuBarProps {
  isOpen: boolean
  onClose: () => void
}

const MenuBar = ({ isOpen, onClose }: MenuBarProps) => {
  const route = useRoute()

  const dialogRef = useDialog<HTMLDivElement>(isOpen, onClose)

  const menuList = [
    {
      title: 'Pokédex',
      id: import.meta.env.ROUTER_HOME_ID,
      icon: import.meta.env.ROUTER_HOME_ICON,
      path: import.meta.env.ROUTER_HOME_PATH,
    },
    {
      title: 'Bài viết',
      id: import.meta.env.ROUTER_BLOGS_ID,
      icon: import.meta.env.ROUTER_BLOGS_ICON,
      path: import.meta.env.ROUTER_BLOGS_PATH,
    },
  ].map((menu) => (
    <MenuItemStyle
      key={menu.id}
      className={`${menu.id === route.id ? 'is-active' : ''}`}
      aria-current={menu.id === route.id ? 'page' : undefined}
      to={menu.path}
      onClick={onClose}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {menu.icon}
      </span>
      <span>{menu.title}</span>
    </MenuItemStyle>
  ))

  return (
    // closed, it only slides off-screen: inert keeps its links out of Tab
    <OverlayStyle $isOpen={isOpen} onClick={onClose} inert={!isOpen}>
      <ContainerStyle
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        $isOpen={isOpen}
        onClick={(e) => e.stopPropagation()}
      >
        <HeaderStyle>
          <span
            className="material-symbols-outlined menu-icon"
            aria-hidden="true"
          >
            menu
          </span>
          <h2>Menu</h2>
        </HeaderStyle>
        <BodyStyle>{menuList}</BodyStyle>
      </ContainerStyle>
    </OverlayStyle>
  )
}

export default MenuBar
