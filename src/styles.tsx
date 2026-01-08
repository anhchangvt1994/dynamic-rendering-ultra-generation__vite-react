import { css } from 'styled-components'

export const liquidGlass = css`
  /* From https://css.glass */
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 152, 104, 0.3);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
`

export const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 1280px;
  min-width: 0;
  min-height: 100vh;
  overflow: hidden;
  margin: 0 auto;
  padding: 16px;
  background: url('/images/pokemon-01.gif') center center / cover no-repeat;

  @media (min-width: ${import.meta.env.STYLE_SCREEN_TABLET}) {
  }

  @media (min-width: ${import.meta.env.STYLE_SCREEN_LAPTOP}) {
  }
`

export const Body = styled.div`
  padding: 16px;
  margin-top: 16px;
  flex: 1 1 auto;
  ${liquidGlass}
`
