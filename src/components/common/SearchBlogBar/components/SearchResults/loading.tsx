import {
  DescriptionLoadingStyle,
  ImageColStyle,
  ImageLoadingStyle,
  InfoColStyle,
  NameLoadingStyle,
  SearchItemInnerLoadingStyle,
  SearchItemStyle,
  SearchListStyle,
} from './styles'

const SearchLoading = () => {
  const loadingList = Array.from({ length: 4 }).map((_, index) => (
    <SearchItemStyle key={index}>
      <SearchItemInnerLoadingStyle>
        <ImageColStyle>
          <ImageLoadingStyle />
        </ImageColStyle>
        <InfoColStyle>
          <NameLoadingStyle />
          <DescriptionLoadingStyle />
          <DescriptionLoadingStyle style={{ width: '70%' }} />
        </InfoColStyle>
      </SearchItemInnerLoadingStyle>
    </SearchItemStyle>
  ))

  return <SearchListStyle>{loadingList}</SearchListStyle>
}

export default SearchLoading
