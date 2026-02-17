export const MainContainerStyle = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 1280px;
  min-width: 0;
  height: 100dvh;
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

export const BodyWrapperStyle = styled.div`
  position: relative;
  flex: 1 1 auto;
  overflow: hidden;
  border-radius: 16px;
  margin-top: 16px;
  /* z-index: 0; */

  &::before {
    content: '';
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    z-index: 0;
  }
`

export const BodyStyle = styled.div`
  position: relative;
  overflow-y: auto;
  /* Firefox */
  scrollbar-width: none;
  /* IE / Edge cũ */
  -ms-overflow-style: none;
  height: 100%;
  padding: 16px;
  z-index: 10;

  &::-webkit-scrollbar {
    display: none; /* Chrome / Safari */
  }
`

export const ContentStyle = styled.div`
  height: 100%;
`
