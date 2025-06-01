import ImageItem, { Outer as ImageOuter } from 'components/ImageItem'

// NOTE - Dummy Data Region
const moduleList: Array<{
  title: string
  id: number
  isVip: boolean
}> = [
  {
    title: 'Excepteur nostrud deserunt do ipsum eu dolore.',
    id: 1,
    isVip: false,
  },
  {
    title:
      'Ex Lorem commodo nisi et qui adipisicing consectetur magna duis enim pariatur eu.',
    id: 2,
    isVip: false,
  },
  {
    title: 'Dolor in voluptate anim magna.',
    id: 3,
    isVip: false,
  },
  {
    title:
      'Eiusmod exercitation sint adipisicing magna sit dolore adipisicing.',
    id: 4,
    isVip: true,
  },
]
// NOTE - End Dummy Data Region

// NOTE - Styled Components Region
const ModuleCard = styled.div`
  ${ImageOuter} {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid ${import.meta.env.STYLE_COLOR_DARK};
    background-color: ${import.meta.env.STYLE_COLOR_WHITE};
  }
`
const Title = styled.div`
  color: ${import.meta.env.STYLE_COLOR_DARK};
  text-decoration: none;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 8px;
`
// NOTE - End Styled Components Region

export default function ModuleSection() {
  const cardList = moduleList.map((item) => (
    <LinkCustom key={item.id} to={`${getSlug(item.title)}-${item.id}`}>
      <ModuleCard>
        <ImageItem src="" alt={item.title} />
        <Title>{item.title}</Title>
      </ModuleCard>
    </LinkCustom>
  ))

  return <div className="grid grid-cols-3 gap-16">{cardList}</div>
}
