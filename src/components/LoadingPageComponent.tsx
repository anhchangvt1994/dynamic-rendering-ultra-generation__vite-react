const RotationAnimation = keyframes`
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
`

const Wrapper = styled.div`
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

const Loading = styled.span`
  width: 175px;
  height: 80px;
  display: block;
  margin: auto;
  background-image:
    radial-gradient(circle 25px at 25px 25px, #efefef 100%, transparent 0),
    radial-gradient(circle 50px at 50px 50px, #efefef 100%, transparent 0),
    radial-gradient(circle 25px at 25px 25px, #efefef 100%, transparent 0),
    linear-gradient(#efefef 50px, transparent 0);
  background-size:
    50px 50px,
    100px 76px,
    50px 50px,
    120px 40px;
  background-position:
    0px 30px,
    37px 0px,
    122px 30px,
    25px 40px;
  background-repeat: no-repeat;
  position: relative;
  box-sizing: border-box;
  &:after {
    content: '';
    left: 0;
    right: 0;
    margin: auto;
    bottom: 20px;
    position: absolute;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 5px solid transparent;
    border-color: #ff3d00 transparent;
    box-sizing: border-box;
    animation: ${RotationAnimation} 1s linear infinite;
  }
`

function Component() {
  return (
    <Wrapper id="loading-page-component--global">
      <Loading></Loading>
    </Wrapper>
  )
}

const LoadingPageComponent = memo(Component)

export default LoadingPageComponent
