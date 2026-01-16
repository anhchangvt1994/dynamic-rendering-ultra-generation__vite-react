const Image = styled.img`
  display: block;
  background-color: #fdfffc;
  width: 100%;
  height: 100%;
  object-fit: contain;

  &[src=''],
  &:not([src]) {
    display: none;
  }
`

export const Outer = styled.div`
  height: 100px;
  width: 100%;
  &.--is-error {
    background: url('/images/icons/image-loading-icon.png') center/24px 24px
      no-repeat;

    & ${Image} {
      display: none;
    }
  }
`

function ImageItem(props) {
  const [isError, setIsError] = useState(false)

  const onErrorHandler = () => {
    console.log('error image loading')
    setIsError(true)
  }

  return (
    <Outer className={isError ? '--is-error' : ''}>
      <Image
        {...props}
        ref={(el) => {
          if (el) {
            el.onerror = onErrorHandler
          }
        }}
        src={null}
      />
    </Outer>
  )
}

export default ImageItem
