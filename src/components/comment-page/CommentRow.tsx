import ImageItem, { Outer as ImageOuter } from 'components/ImageItem'
import { Suspender } from 'utils/Suspender'

const Row = styled.div`
  display: flex;
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`
const AvatarCol = styled.div`
  margin-right: 8px;
  flex: 0 0 50px;
  height: 50px;
  ${ImageOuter} {
    height: 100%;
    width: 100%;
    overflow: hidden;
    border-radius: 50%;
    background-color: ${rgba(import.meta.env.STYLE_COLOR_DARK, 0.1)};
    background-size: 16px 16px;
  }
`
const MetaCol = styled.div`
  min-width: 0;
  flex: 1 1 auto;
`
const NameLabel = styled.p`
  margin-bottom: 8px;
`
const ContentLabel = styled.div``

const suspender = Suspender()

export default function CommentRow({ total }: { total?: number }) {
  const route = useRoute()
  const amount = total ? total : Math.floor(Math.random() * 4) + 1

  suspender.start(() => {
    const duration = 1500
    new Promise((res) => {
      setTimeout(function () {
        res('OK')
      }, duration)
    })
      .then((result) => {
        suspender.resolve(result)
      })
      .catch((err) => suspender.reject(err))
  })

  suspender.get()

  const commentItemList = new Array(amount).fill(null).map((val, idx) => (
    <Row key={idx}>
      <AvatarCol>
        <ImageItem src="" />
      </AvatarCol>
      <MetaCol>
        <NameLabel>
          Proident consectetur deserunt officia consectetur ad aliqua do
          excepteur sit.
        </NameLabel>
        <ContentLabel>
          Excepteur reprehenderit minim officia anim occaecat nostrud nulla
          elit. Excepteur officia fugiat nisi anim enim quis proident
          consectetur exercitation. Consequat eu ea enim ullamco. Amet elit ad
          sit ipsum magna consequat exercitation consectetur ullamco.
        </ContentLabel>
      </MetaCol>
    </Row>
  ))

  if (route?.id !== import.meta.env.ROUTER_COMMENT_ID) {
    commentItemList.push(
      <LinkCustom
        key={import.meta.env.ROUTER_COMMENT_ID}
        to={`${route.fullPath}/detail`}
      >
        See more
      </LinkCustom>
    )
  }

  return <>{commentItemList}</>
}
