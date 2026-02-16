export const BlogDetailPageStyle = styled.div`
  color: #ffffff;
  padding: 16px 0;

  .image-wrapper {
    position: relative;
    width: calc(100% - 16px);
    padding-bottom: calc(100% * 13 / 16);
    overflow: hidden;
    margin: 0 auto 16px;
    border-radius: 8px;
  }

  .image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
  }
`

export const ImageLoadingStyle = styled.div`
  width: calc(100% - 16px);
  padding-bottom: calc(100% * 13 / 16);
  margin: 0 auto 16px;
  border-radius: 8px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
`

export const TitleStyle = styled.h1`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
  text-align: center;
`

export const TitleLoadingStyle = styled.div`
  height: 24px;
  width: 50%;
  margin: -12px auto 24px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border-radius: 4px;
`

export const DesciptionLoadingStyle = styled.div`
  height: 16px;
  margin-bottom: 12px;
  width: 100%;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border-radius: 4px;
`

export const BoldStyle = styled.strong`
  font-weight: bold;
`

export const ItalicStyle = styled.em`
  font-style: italic;
`

export const UnderlineStyle = styled.u`
  text-decoration: underline;
`

export const ParagraphStyle = styled.p`
  margin-bottom: 16px;
  line-height: 1.6;
`

export const LinkStyle = styled.a`
  color: #77d7f7;
  text-decoration: underline;
`
