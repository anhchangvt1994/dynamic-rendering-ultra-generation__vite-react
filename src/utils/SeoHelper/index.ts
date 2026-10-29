import { SeoTagsEnum, SeoTags, INFO } from './constants'
import { ISetSeoTagOptionsParam } from './types'

export const setTitleTag = SeoTags[SeoTagsEnum.title]
export const setMetaDescriptionTag = SeoTags[SeoTagsEnum.description]
export const setMetaKeywordsTag = SeoTags[SeoTagsEnum.keywords]
export const setMetaRobotsTag = SeoTags[SeoTagsEnum.robots]
export const setLinkCanonicalTag = SeoTags[SeoTagsEnum.canonical]
export const setMetaViewportTag = SeoTags[SeoTagsEnum.viewport]
export const setMetaOgTitleTag = SeoTags[SeoTagsEnum.og_title]
export const setMetaOgDescriptionTag = SeoTags[SeoTagsEnum.og_description]
export const setMetaOgImageTag = SeoTags[SeoTagsEnum.og_image]
export const setMetaOgImageWidthTag = SeoTags[SeoTagsEnum.og_image_width]
export const setMetaOgImageHeightTag = SeoTags[SeoTagsEnum.og_image_height]
export const setMetaOgUrlTag = SeoTags[SeoTagsEnum.og_url]
export const setMetaOgTypeTag = SeoTags[SeoTagsEnum.og_type]
export const setMetaOgSiteNameTag = SeoTags[SeoTagsEnum.og_site_name]
export const setMetaAuthorTag = SeoTags[SeoTagsEnum.author]
export const setMetaGoogleBotTag = SeoTags[SeoTagsEnum.googlebot]
export const setMetaGoogleSiteVerificationTag =
  SeoTags[SeoTagsEnum.google_site_verification]
export const setLinkAlternateTag = SeoTags[SeoTagsEnum.alternate]
export const setMetaGeoRegionTag = SeoTags[SeoTagsEnum.geo_region]
export const setMetaGeoPositionTag = SeoTags[SeoTagsEnum.geo_position]
export const setMetaICBMTag = SeoTags[SeoTagsEnum.ICBM]
export const setLinkNextTag = SeoTags[SeoTagsEnum.next]
export const setLinkPrevTag = SeoTags[SeoTagsEnum.prev]
export const setLinkAuthorTag = SeoTags[SeoTagsEnum.author_link]
export const setLinkAmphtmlTag = SeoTags[SeoTagsEnum.amphtml]
export const setMetaTwitterTitleTag = SeoTags[SeoTagsEnum.twitter_title]
export const setMetaTwitterDescriptionTag =
  SeoTags[SeoTagsEnum.twitter_description]
export const setMetaTwitterImageTag = SeoTags[SeoTagsEnum.twitter_image]
export const setMetaTwitterCardTag = SeoTags[SeoTagsEnum.twitter_card]

export const setSeoTag = (options?: ISetSeoTagOptionsParam) => {
  for (const key in options) {
    SeoTags[key](options?.[key])
  }
}

export const resetSeoTag = (duration = 150) => {
  const curPath = location.pathname

  if (INFO.resetSeoTagTimeout) clearTimeout(INFO.resetSeoTagTimeout)
  INFO.resetSeoTagTimeout = setTimeout(() => {
    if (curPath === INFO.curPath && INFO.curPath === location.pathname) return
    for (const key in SeoTags) {
      SeoTags[key]()
    }
  }, duration)
}
