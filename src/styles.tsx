export const MainContainer = styled.div`
  max-width: 1280px;
  min-width: 0;
  min-height: 100vh;
  overflow: hidden;
  margin: 0 auto;

  @media (min-width: ${import.meta.env.STYLE_SCREEN_TABLET}) {
  }

  @media (min-width: ${import.meta.env.STYLE_SCREEN_LAPTOP}) {
  }
`

export const Header = styled.header`
  padding: 16px;
`

export const Body = styled.div`
  padding: 16px;
`
