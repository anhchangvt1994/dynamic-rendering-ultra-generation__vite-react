const RotationAnimation = keyframes`
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
`

const WrapperStyle = styled.div`
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
`

const PokeballLoadingStyle = styled.div`
  position: absolute;
  height: 100px;
  width: 100px;
  overflow: hidden;
  border-radius: 50%;
  z-index: 0;
  animation: ${RotationAnimation} 3s linear infinite;

  &::before,
  &::after {
    position: absolute;
    display: block;
    content: '';
    width: 100%;
    /* height: 50%; */
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    border-radius: 50%;
    left: 0;
    z-index: -1;
  }

  &::before {
    top: 0;
    background: rgba(255, 255, 255, 0.1);
  }

  &::after {
    bottom: 0;
    background: rgba(255, 2, 1, 0.1);
  }
`

const PokeballInnerLoadingStyle = styled.div`
  position: absolute;
  height: calc(100% - 8px);
  width: calc(100% - 8px);
  overflow: hidden;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  margin: auto;
  border-radius: 50%;

  &::before,
  &::after {
    position: absolute;
    content: '';
    display: block;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    margin: auto;
    background: #ffffff;
    z-index: 1;
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    border-radius: 50%;
  }

  &::before {
    width: 20px;
    height: 20px;
    background: rgba(255, 255, 255, 0.3);
  }

  &::after {
    width: 10px;
    height: 10px;
    background: rgba(255, 255, 255, 0.7);
  }
`

const HalfBallStyle = styled.div`
  position: absolute;
  width: 100%;
  height: calc(50% - 3px);
  left: 0;

  &.top {
    top: 0;
    background: #ff0201;
  }

  &.bottom {
    bottom: 0;
    background: #ffffff;
  }
`

function Component() {
  return (
    <WrapperStyle id="loading-page-component--global">
      <PokeballLoadingStyle>
        <PokeballInnerLoadingStyle>
          <HalfBallStyle className="top" />
          <HalfBallStyle className="bottom" />
        </PokeballInnerLoadingStyle>
      </PokeballLoadingStyle>
    </WrapperStyle>
  )
}

const LoadingPageComponent = memo(Component)

export default LoadingPageComponent
