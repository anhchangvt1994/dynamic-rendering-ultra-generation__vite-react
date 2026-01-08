import { css } from 'styled-components'

export const liquidGlass = css`
  background: white;
  background: linear-gradient(
    to right bottom,
    rgba(255, 255, 255, 0.4),
    rgba(255, 255, 255, 0.2)
  );
  backdrop-filter: blur(1rem);
  z-index: 1;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 1rem rgba(0, 0, 0, 0.2);
  border-radius: 8px;
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
  background: #ff00cc;
  background: -webkit-linear-gradient(to right, #333399, #ff00cc);
  background: linear-gradient(to right, #333399, #ff00cc);

  @media (min-width: ${import.meta.env.STYLE_SCREEN_TABLET}) {
  }

  @media (min-width: ${import.meta.env.STYLE_SCREEN_LAPTOP}) {
  }
`

export const Header = styled.header`
  display: flex;
  padding: 16px;
  height: 100px;
  ${liquidGlass}
`

export const Body = styled.div`
  padding: 16px;
  margin-top: 16px;
  flex: 1 1 auto;
  ${liquidGlass}
`
