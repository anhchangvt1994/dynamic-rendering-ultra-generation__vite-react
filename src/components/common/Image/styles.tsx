import { Blurhash } from 'react-blurhash'

export const ImageWrapperStyle = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: calc(9 / 16 * 100%);
  overflow: hidden;

  &::before,
  &::after {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
`

export const ImageStyle = styled.img`
  position: absolute;
  display: none;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  object-fit: contain;

  &.show {
    display: block;

    & + .blurhash {
      display: none !important;
    }
  }
  &.error {
    display: none;
  }
`

export const BlurhashStyle = styled(Blurhash)`
  position: absolute !important;
  display: none;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  object-fit: scale-down;

  &.show {
    display: block;
  }
  &.error {
    display: none;
  }
`
