import { BlurhashStyle, ImageStyle, ImageWrapperStyle } from './styles'

const Image = (props) => {
  const {
    src = '',
    alt = '',
    hash = '',
    width = '100%',
    height = '100%',
  } = props

  const isSrcValid = !!src && !/\/\.(jpg|jpeg|gif|png|webp|svg|ico)/g.test(src)

  const onLoad = (img) => {
    img.classList.add('show')
  }

  const onError = (img) => {
    img.classList.add('error')
  }

  return (
    <ImageWrapperStyle className="image-wrapper">
      {isSrcValid && (
        <ImageStyle
          className="image"
          src={src}
          alt={alt || ''}
          width={width}
          height={height}
          onLoad={async (e) => {
            await e.currentTarget.decode()
            onLoad(e.target)
          }}
          onError={(e) => onError(e.target)}
        />
      )}
      {RenderingInfo.type === 'CSR' && !!hash && (
        <BlurhashStyle
          className="blurhash"
          hash={hash}
          width={width}
          height={height}
          resolutionX={32}
          resolutionY={32}
          punch={1}
        />
      )}
    </ImageWrapperStyle>
  )
}

export default Image
