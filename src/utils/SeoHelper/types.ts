import { SeoTagsEnum } from './constants'

export interface ISetSeoTagOptionsParam {
  [SeoTagsEnum.title]?: string
  [SeoTagsEnum.description]?: string
  [SeoTagsEnum.keywords]?: string
  [SeoTagsEnum.robots]?: string
  [SeoTagsEnum.canonical]?: string
  [SeoTagsEnum.viewport]?: string
  [SeoTagsEnum.og_title]?: string
  [SeoTagsEnum.og_description]?: string
  [SeoTagsEnum.og_image]?: string
  [SeoTagsEnum.og_image_width]?: string
  [SeoTagsEnum.og_image_height]?: string
  [SeoTagsEnum.og_url]?: string
  [SeoTagsEnum.og_type]?: string
  [SeoTagsEnum.og_site_name]?: string
  [SeoTagsEnum.og_site_name]?: string
  [SeoTagsEnum.author]?: string
  [SeoTagsEnum.googlebot]?: string
  [SeoTagsEnum.google_site_verification]?: string
  [SeoTagsEnum.alternate]?: string
  [SeoTagsEnum.geo_region]?: string
  [SeoTagsEnum.geo_position]?: string
  [SeoTagsEnum.ICBM]?: string
  [SeoTagsEnum.next]?: string
  [SeoTagsEnum.prev]?: string
  [SeoTagsEnum.author_link]?: string
  [SeoTagsEnum.amphtml]?: string
  [SeoTagsEnum.twitter_title]?: string
  [SeoTagsEnum.twitter_description]?: string
  [SeoTagsEnum.twitter_image]?: string
  [SeoTagsEnum.twitter_card]?: string
}

export interface IGenerateSeoTagWrapperParams {
  name?: string
  generator: ((name: any, val: any) => void) | ((val: any) => void)
}
