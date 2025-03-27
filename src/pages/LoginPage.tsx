import { useUserInfo } from 'store/UserInfoContext'
import ImageItem, { Outer as ImageOuter } from 'components/ImageItem'

const Page = styled.div``

const Section = styled.section`
  height: 100vh;
`

const Block = styled.div`
  position: relative;
  display: flex;
  max-width: 320px;
  flex-wrap: wrap;
  justify-content: center;
  left: 50%;
  top: 30%;
  transform: translate(-50%);
`

const Avatar = styled.div`
  height: 100px;
  flex: 0 0 100px;
  ${ImageOuter} {
    height: 100%;
    width: 100%;
    overflow: hidden;
    border-radius: 50%;
    background-color: ${rgba(import.meta.env.STYLE_COLOR_DARK, 0.1)};
    background-size: 16px 16px;
  }
`

const Button = styled.button`
  margin-top: 16px;
  width: 100%;
  cursor: pointer;
`

export default function LoginPage() {
  const route = useRoute()
  const { setUserState } = useUserInfo()

  const onClickLogin = () => {
    setUserState({ email: 'abc@gmail.com' })
  }

  return (
    <Page>
      <div>
        <Link to={import.meta.env.ROUTER_HOME_PATH}>
          {'< Back to HomePage'}
        </Link>
      </div>
      <Section>
        <Block>
          <Avatar>
            <ImageItem src="" />
          </Avatar>
          <Button onClick={onClickLogin}>Login</Button>
        </Block>
      </Section>
    </Page>
  )
}
