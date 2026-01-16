export const HeaderStyle = styled.header`
  position: relative;
  display: flex;
  padding: 16px;
  height: 80px;
  flex: 0 0 80px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  z-index: 10;
`

export const HeaderBackgroundStyle = styled.div`
  position: absolute;
  height: calc(100% - 8px);
  width: calc(100% - 8px);
  z-index: -1;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  margin: auto;
  border-radius: 12px;
  overflow: hidden;

  .left,
  .right {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'Pokemon Hollow', sans-serif;
    position: absolute;
    height: 100%;
    width: calc(50% - 2px);
    top: 0;
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    border-radius: 0;
    color: #ffffff;
    font-size: 24px;
  }

  .left {
    left: 0;
    background: rgba(255, 2, 1, 0.2);
    span {
      margin-left: -16px;
    }
  }

  .right {
    right: 0;
    background: rgba(255, 255, 255, 0.2);
    span {
      margin-right: -24px;
    }
  }
`

export const AvatarStyle = styled.div`
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  position: absolute;
  width: 80px;
  height: 80px;
  left: 0;
  right: 0;
  margin: 0 auto;
  top: calc(100% - 40px);
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
    width: calc(100% - 12px);
    height: calc(100% - 12px);
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
