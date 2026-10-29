import { IGenerateSeoTagWrapperParams } from './types'
import { generateLinkTag, generateMetaTag, generateTitleTag } from './utils'

export const enum SeoTagsEnum {
  title = 'title',
  description = 'description',
  keywords = 'keywords',
  robots = 'robots',
  canonical = 'canonical',
  viewport = 'viewport',
  og_title = 'og:title',
  og_description = 'og:description',
  og_image = 'og:image',
  og_image_width = 'og:image:width',
  og_image_height = 'og:image:height',
  og_url = 'og:url',
  og_type = 'og:type',
  og_site_name = 'og:site_name',
  author = 'author',
  author_link = 'author_link',
  googlebot = 'googlebot',
  'google_site_verification' = 'google-site-verification',
  alternate = 'alternate',
  geo_region = 'geo.region',
  geo_placename = 'geo.placename',
  geo_position = 'geo.position',
  ICBM = 'ICBM',
  next = 'next',
  prev = 'prev',
  amphtml = 'amphtml',
  twitter_title = 'twitter:title',
  twitter_description = 'twitter:description',
  twitter_image = 'twitter:image',
  twitter_card = 'twitter:card',
  article_published_time = 'article:published_time',
  article_modified_time = 'article:modified_time',
  article_section = 'article:section',
  article_tag = 'article:tag',
}

export const INFO = {
  curPath: location.pathname,
  resetSeoTagTimeout: null,
}

const generateSeoTagWrapper = (params: IGenerateSeoTagWrapperParams) => {
  return (val) => {
    if (INFO.resetSeoTagTimeout) {
      clearTimeout(INFO.resetSeoTagTimeout)
      INFO.resetSeoTagTimeout = null
    }
    if (INFO.curPath !== location.pathname) {
      INFO.curPath = location.pathname
      for (const key in SeoTags) {
        SeoTags[key]()
      }
    }

    if (params.name) params.generator(params.name, val)
    else (params.generator as (val: any) => void)(val)
  }
} // generateSeoTagWrapper

export const SeoTags = {
  [SeoTagsEnum.title]: generateSeoTagWrapper({
    generator: generateTitleTag,
  }),
  [SeoTagsEnum.description]: generateSeoTagWrapper({
    name: SeoTagsEnum.description,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.keywords]: generateSeoTagWrapper({
    name: SeoTagsEnum.keywords,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.robots]: generateSeoTagWrapper({
    name: SeoTagsEnum.robots,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.canonical]: generateSeoTagWrapper({
    name: SeoTagsEnum.canonical,
    generator: generateLinkTag,
  }),
  [SeoTagsEnum.viewport]: generateSeoTagWrapper({
    name: SeoTagsEnum.viewport,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.og_title]: generateSeoTagWrapper({
    name: SeoTagsEnum.og_title,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.og_description]: generateSeoTagWrapper({
    name: SeoTagsEnum.og_description,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.og_image]: generateSeoTagWrapper({
    name: SeoTagsEnum.og_image,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.og_image_width]: generateSeoTagWrapper({
    name: SeoTagsEnum.og_image_width,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.og_image_height]: generateSeoTagWrapper({
    name: SeoTagsEnum.og_image_height,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.og_url]: generateSeoTagWrapper({
    name: SeoTagsEnum.og_url,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.og_type]: generateSeoTagWrapper({
    name: SeoTagsEnum.og_type,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.og_site_name]: generateSeoTagWrapper({
    name: SeoTagsEnum.og_site_name,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.author]: generateSeoTagWrapper({
    name: SeoTagsEnum.author,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.googlebot]: generateSeoTagWrapper({
    name: SeoTagsEnum.googlebot,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.google_site_verification]: generateSeoTagWrapper({
    name: SeoTagsEnum.google_site_verification,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.alternate]: generateSeoTagWrapper({
    name: SeoTagsEnum.alternate,
    generator: generateLinkTag,
  }),
  [SeoTagsEnum.geo_region]: generateSeoTagWrapper({
    name: SeoTagsEnum.geo_region,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.geo_position]: generateSeoTagWrapper({
    name: SeoTagsEnum.geo_position,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.ICBM]: generateSeoTagWrapper({
    name: SeoTagsEnum.ICBM,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.next]: generateSeoTagWrapper({
    name: SeoTagsEnum.next,
    generator: generateLinkTag,
  }),
  [SeoTagsEnum.prev]: generateSeoTagWrapper({
    name: SeoTagsEnum.prev,
    generator: generateLinkTag,
  }),
  [SeoTagsEnum.author_link]: generateSeoTagWrapper({
    name: SeoTagsEnum.author,
    generator: generateLinkTag,
  }),
  [SeoTagsEnum.amphtml]: generateSeoTagWrapper({
    name: SeoTagsEnum.amphtml,
    generator: generateLinkTag,
  }),
  [SeoTagsEnum.twitter_title]: generateSeoTagWrapper({
    name: SeoTagsEnum.twitter_title,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.twitter_description]: generateSeoTagWrapper({
    name: SeoTagsEnum.twitter_description,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.twitter_image]: generateSeoTagWrapper({
    name: SeoTagsEnum.twitter_image,
    generator: generateMetaTag,
  }),
  [SeoTagsEnum.twitter_card]: generateSeoTagWrapper({
    name: SeoTagsEnum.twitter_card,
    generator: generateMetaTag,
  }),
}
