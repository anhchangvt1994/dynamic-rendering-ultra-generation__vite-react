import { useEffect, useRef, useState } from 'react'
import { RenderingInfo } from 'store/ServerStore'

import { BlurhashStyle, ImageStyle, ImageWrapperStyle } from './styles'

const Image = (props) => {
  const {
    src = '',
    alt = '',
    hash = '',
    width = '100%',
    height = '100%',
    lazy = true,
  } = props

  const imageRef = useRef<HTMLImageElement>(null)
  const [isInView, setIsInView] = useState(!lazy)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const isSrcValid = !!src && !/\/\.(jpg|jpeg|gif|png|webp|svg|ico)/g.test(src)

  // Set up IntersectionObserver for lazy loading
  useEffect(() => {
    if (!lazy) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0,
      }
    )

    if (imageRef.current) {
      observer.observe(imageRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [lazy])

  const handleLoad = (img: HTMLImageElement) => {
    setIsLoaded(true)
    img.classList.add('show')
  }

  const handleError = (img: HTMLImageElement) => {
    img.classList.add('error')
  }

  return (
    <ImageWrapperStyle className="image-wrapper" ref={imageRef}>
      {isSrcValid && isInView && (
        <ImageStyle
          className="image"
          src={src}
          alt={alt || ''}
          width={width}
          height={height}
          loading={undefined}
          onLoad={async (e) => {
            try {
              await e.currentTarget.decode?.()
              await new Promise((res) => setTimeout(res, 50))
            } catch {}
            handleLoad(e.target as HTMLImageElement)
          }}
          onError={(e) => handleError(e.target as HTMLImageElement)}
        />
      )}
      {!isLoaded && RenderingInfo.type === 'CSR' && !!hash && (
        <BlurhashStyle
          className="blurhash"
          hash={hash}
          width={width}
          height={height}
        />
      )}
    </ImageWrapperStyle>
  )
}

export default Image
