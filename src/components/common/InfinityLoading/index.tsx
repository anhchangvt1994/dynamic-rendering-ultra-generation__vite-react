import {
  ImageLoadingStyle,
  ImageWrapperStyle,
  InfinityLoadingStyle,
  NameLoadingStyle,
} from './styles'

const InfinityLoading = () => {
  return (
    <InfinityLoadingStyle>
      <ImageWrapperStyle>
        <ImageLoadingStyle
          className="show"
          alt="Loading..."
          src="/images/pikachu-02.webp"
          height={60}
        />
      </ImageWrapperStyle>
      <NameLoadingStyle>
        <div className="stage">
          <div className="dot-flashing"></div>
        </div>
      </NameLoadingStyle>
    </InfinityLoadingStyle>
  )
}

export default InfinityLoading
