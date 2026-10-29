import Icon from 'components/common/Icon'
import FieldIcon, { Pokeball } from 'components/common/FieldIcon'
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
  const location = useLocation()
  const collection =
    location.pathname === '/' &&
    new URLSearchParams(location.search).get('view') === 'caught'

  const dialogRef = useDialog<HTMLDivElement>(isOpen, onClose)

  const menuList = [
    {
      title: 'Pokédex',
      id: import.meta.env.ROUTER_HOME_ID,
      icon: import.meta.env.ROUTER_HOME_ICON,
      path: import.meta.env.ROUTER_HOME_PATH,
    },
    {
      title: 'Bộ sưu tập',
      id: 'collection',
      icon: 'ball',
      path: '/?view=caught',
    },
    {
      title: 'Ai đây? – Đoán Pokémon',
      id: 'QuizPage',
      icon: 'quiz',
      path: '/ai-day',
    },
    {
      title: 'So sánh Pokémon',
      id: 'ComparePage',
      icon: 'compare',
      path: '/so-sanh',
    },
    {
      title: 'Bài viết',
      id: import.meta.env.ROUTER_BLOGS_ID,
      icon: import.meta.env.ROUTER_BLOGS_ICON,
      path: import.meta.env.ROUTER_BLOGS_PATH,
    },
  ].map((menu) => {
    const active =
      menu.id === 'collection'
        ? collection
        : menu.id === route.id &&
          !(collection && menu.id === import.meta.env.ROUTER_HOME_ID)
    return (
      <MenuItemStyle
        key={menu.id}
        className={active ? 'is-active' : ''}
        aria-current={active ? 'page' : undefined}
        to={menu.path}
        onClick={onClose}
      >
        <Icon name={menu.icon} className="icon" />
        <span>{menu.title}</span>
      </MenuItemStyle>
    )
  })

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
          <Pokeball className="menu-ball" />
          <div>
            <span>FIELD NOTES</span>
            <h2>Hành trình của bạn</h2>
          </div>
          <button type="button" aria-label="Đóng menu" onClick={onClose}>
            <FieldIcon name="close" />
          </button>
        </HeaderStyle>
        <BodyStyle>{menuList}</BodyStyle>
        <p className="menu-footnote">
          Một thế giới. Ngàn người bạn.
          <br />
          Bạn sẽ gặp ai hôm nay?
        </p>
      </ContainerStyle>
    </OverlayStyle>
  )
}

export default MenuBar
