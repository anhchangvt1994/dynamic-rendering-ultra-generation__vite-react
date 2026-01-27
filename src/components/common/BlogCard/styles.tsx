import { css } from 'styled-components'
import { functionGenerator } from 'utils/EnvHelper'

const generateReadMoreMultipleLineStyle = functionGenerator(
  import.meta.env.STYLE_MIXINS_READ_MORE_MULTIPLE_LINE_FUNCTION
)

export const BlogCardStyle = styled.a`
  overflow: hidden;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  flex: 0 0 calc(50% - 8px);
`

export const ImageWrapperStyle = styled.div`
  width: 100%;
  padding-bottom: calc(100% * 9 / 16);
  position: relative;
  overflow: hidden;

  img {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    left: 0;
    top: 0;
  }
`

export const ImageWrapperLoadingStyle = styled.div`
  width: 100%;
  padding-bottom: calc(100% * 9 / 16);
  background: #a6a6a6;
`

export const BodyStyle = styled.div`
  padding: 12px;
`

export const TitleStyle = styled.h3`
  margin: 0 0 8px 0;
  color: #ffffff;
`

export const TitleLoadingStyle = styled.div`
  width: 70%;
  height: 20px;
  background: #a6a6a6;
  margin-bottom: 8px;
`

export const DescriptionStyle = styled.p`
  color: #dddddd;
  font-size: 12px;
  ${generateReadMoreMultipleLineStyle(css, 3)}
`

export const DescriptionLoadingStyle = styled.div`
  width: 100%;
  height: 14px;
  background: #a6a6a6;
`
