import { liquidGlass } from 'styles'

export const HeaderStyle = styled.header`
  position: relative;
  display: flex;
  padding: 16px;
  height: 100px;
  ${liquidGlass}
  z-index: 10;
`

export const AvatarStyle = styled.div`
  ${liquidGlass}
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
    ${liquidGlass}
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
    background: url('/images/pikachu-01.gif') center center / 180% no-repeat;
  }
`
