export const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 1280px;
  min-width: 0;
  min-height: 100vh;
  overflow: hidden;
  margin: 0 auto;
  padding: 16px;

  &.lazy-load {
    background: url('/images/pokemon_lazy-load-01.webp') center center / cover
      no-repeat;
  }
  &.full-load {
    background:
      url('/images/pokemon-01.webp') center center / cover no-repeat,
      url('/images/pokemon_lazy-load-01.webp') center center / cover no-repeat;
  }

  @media (min-width: ${import.meta.env.STYLE_SCREEN_TABLET}) {
  }

  @media (min-width: ${import.meta.env.STYLE_SCREEN_LAPTOP}) {
  }
`

export const Body = styled.div`
  padding: 16px;
  margin-top: 16px;
  flex: 1 1 auto;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
`
