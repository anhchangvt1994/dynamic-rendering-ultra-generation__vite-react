export const HeaderStyle = styled.header`
  position: relative;
  display: flex;
  padding: 16px;
  height: 100px;
  flex: 0 0 100px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  z-index: 10;
`

export const AvatarStyle = styled.div`
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  position: absolute;
  width: 100px;
  height: 100px;
  left: 0;
  right: 0;
  margin: 0 auto;
  top: calc(100% - 50px);
  border-radius: 100%;
  z-index: 0;
  background: #ff00cc;
  background: -webkit-linear-gradient(
    to right,
    rgb(6, 65, 168, 0.2),
    rgb(0, 255, 187, 0.2)
  );
  background: linear-gradient(
    to right,
    rgb(6, 65, 168, 0.2),
    rgb(0, 255, 187, 0.2)
  );

  &::before {
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    content: '';
    position: absolute;
    width: calc(100% - 16px);
    height: calc(100% - 16px);
    border-radius: 100%;
    z-index: -1;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    margin: auto;
  }

  &.lazy-load {
    &::before {
      background: url('/images/pikachu_lazy-load-01.webp') center center / 180%
        no-repeat;
    }
  }

  &.full-load {
    &::before {
      background:
        url('/images/pikachu-01.webp') center center / 180% no-repeat,
        url('/images/pikachu_lazy-load-01.webp') center center / 180% no-repeat;
    }
  }
`
