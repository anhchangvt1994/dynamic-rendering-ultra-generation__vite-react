import minifyHtml from '@minify-html/node'
import { brotliDecompressSync } from 'zlib'
import { POWER_LEVEL, POWER_LEVEL_LIST } from '../../../constants'
import { ENV, PROCESS_ENV } from '../../../utils/InitEnv'
import {
  regexFullOptimizeBody,
  regexHandleAttrsHtmlTag,
  regexHandleAttrsImageTag,
  regexHandleAttrsInteractiveTag,
  regexHasFullOptimization,
  regexHasPreservedHtml,
  regexHasScriptRemoval,
  regexHasShallowOptimization,
  regexHasStyleRemoval,
  regexHtmlTransformSegments,
  regexLowOptimize,
  regexRemoveClassAttrs,
  regexRemoveClassAndStyleAttrs,
  regexRemoveScriptTag,
  regexRemoveSpecialTag,
  regexRemoveStyleTag,
  regexRemoveStyleAttrs,
  regexShallowOptimize,
} from '../../constants'

// These callbacks share the four groups of htmlOptimizationRegex. A removed
// block wrapper needs a word boundary; inline tags do not acquire whitespace.
const preserveAttributeValue = (match: string) =>
  match[0] === '"' || match[0] === "'" ? match : ''
const hasRemovableAttribute = /\s(?:class|style)\s*=/i
const hasLowOptimization =
  /<\/?div(?=[\s/>])|\sclass\s*=|<i\s*(?:\/>|>\s*<\/i\s*>)/i
const hasRawText = /<!--|<(?:script|style|pre|code|textarea|title)(?=[\s/>])/i
const hasQuotedMarkup = /=\s*(?:"[^"]*<|'[^']*<)/
const hasNormalizationTarget = /<\/?(?:html|source|img|a|button)(?=[\s/>])/i
const isCommentOrTitle = /^(?:<!--|<title(?=[\s/>]))/i
const replaceOptimizationMatch =
  (attributes?: RegExp) =>
  (
    match: string,
    removed: string,
    preserved: string,
    div: string,
    tag: string
  ) => {
    if (preserved) return preserved
    if (div) return ' '
    if (tag)
      return attributes && hasRemovableAttribute.test(tag)
        ? tag.replace(attributes, preserveAttributeValue)
        : tag
    return ''
  }
const removeElements = replaceOptimizationMatch()
const removeClasses = replaceOptimizationMatch(regexRemoveClassAttrs)
const removeStyles = replaceOptimizationMatch(regexRemoveStyleAttrs)
const removeClassesAndStyles = replaceOptimizationMatch(
  regexRemoveClassAndStyleAttrs
)

// Subsequent image/link normalization must not rewrite example markup inside
// JSON-LD, comments, pre/code, or another tag's quoted attribute value.
const transformHtmlSegments = (
  html: string,
  transform: (html: string) => string
) => {
  const probe = hasQuotedMarkup.test(html) ? regexHasPreservedHtml : hasRawText
  if (!probe.test(html)) return transform(html)
  const parts: string[] = []
  let cursor = 0
  for (const match of html.matchAll(regexHtmlTransformSegments)) {
    if (!match[1]) continue
    const end = match.index + match[0].length
    // Ordinary SSR markers/title text contain no tags to normalize. Keeping
    // them in the segment lets the surrounding anchor/button still match.
    if (
      !isCommentOrTitle.test(match[0]) ||
      hasNormalizationTarget.test(match[0])
    ) {
      parts.push(transform(html.slice(cursor, match.index)), match[0])
      cursor = end
    }
    if (!probe.test(html.slice(end))) break
  }
  // An interactive element crossing pre/code/raw example markup stays intact;
  // rewriting its body or aria-label would alter the protected example.
  if (!parts.length) return transform(html)
  parts.push(transform(html.slice(cursor)))
  return parts.join('')
}

// Helper function to safely decompress brotli buffers
const safeDecompress = (html: any): string => {
  if (!Buffer.isBuffer(html)) return html

  try {
    return brotliDecompressSync(html).toString()
  } catch (err) {
    console.error('Failed to decompress HTML buffer:', err)
    // Return the buffer as string if decompression fails
    return html.toString()
  }
}

export const compressContent = async (html: string): Promise<string> => {
  if (!html || PROCESS_ENV.DISABLE_COMPRESS) return html

  if (POWER_LEVEL === POWER_LEVEL_LIST.ONE) {
    if (Buffer.isBuffer(html)) html = safeDecompress(html)

    return html
  }

  let tmpHTML = html

  if (ENV !== 'development') {
    try {
      if (Buffer.isBuffer(html)) {
        tmpHTML = await minifyHtml
          .minify(tmpHTML as unknown as Buffer, {})
          .toString()
      } else {
        tmpHTML = await minifyHtml.minify(Buffer.from(tmpHTML), {}).toString()
      }
    } catch (err) {
      return html
    }
  }

  return tmpHTML
} // compressContent

export const optimizeContent = async (
  html: string,
  isFullOptimize = false
): Promise<string> => {
  if (!html) return html
  // console.log('start optimize')

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (PROCESS_ENV.DISABLE_DEEP_OPTIMIZE)
    return html.replace(regexRemoveSpecialTag, removeElements)
  else {
    let tmpHTML = html
    try {
      if (regexHasFullOptimization.test(tmpHTML))
        tmpHTML = tmpHTML.replace(regexFullOptimizeBody, removeClassesAndStyles)

      tmpHTML = transformHtmlSegments(tmpHTML, (segment) => {
        return segment
          .replace(regexHandleAttrsHtmlTag, (match, tag, curAttrs) => {
            let newAttrs = curAttrs

            if (!newAttrs.includes('lang')) {
              newAttrs = `lang="en"`
            }

            return `<html ${newAttrs}>`
          })
          .replace(regexHandleAttrsImageTag, (match, tag, curAttrs) => {
            const alt = /alt=("|'|)(?<alt>[^"']+)("|'|)+(\s|$)/g
              .exec(curAttrs)
              ?.groups?.alt?.trim()

            if (!alt) return ''

            let newAttrs = (
              curAttrs.includes('seo-tag')
                ? curAttrs
                : curAttrs.replace(
                    /(?<srcAttr>(src|srcset))=("|'|)(.*?)("|'|)+(\s|$)/g,
                    '$<srcAttr> '
                  )
            ).trim()

            switch (true) {
              case !newAttrs.includes('height='):
                newAttrs = `height="200" ${newAttrs}`
              case !newAttrs.includes('width='):
                newAttrs = `width="150" ${newAttrs}`
              default:
                break
            }

            return `<img ${newAttrs}>`
          })
          .replace(
            regexHandleAttrsInteractiveTag,
            (math, tag, curAttrs, negative, content, endTag) => {
              let newAttrs = `style="display: inline-block;min-width: 48px;min-height: 48px;" ${curAttrs.trim()}`
              let newTag = tag
              let tmpEndTag =
                tag === 'input' ? '' : endTag === tag ? endTag : tag
              let tmpContent = content
              let result

              switch (true) {
                case newTag === 'a' && !curAttrs.includes('href='):
                  newTag = 'button'
                  newAttrs = `type="button" ${newAttrs}`
                  tmpEndTag = 'button'
                  break
                case newTag === 'a' && /href(\s|$)|href=""/g.test(curAttrs):
                  newTag = 'button'
                  newAttrs = `type="button" ${newAttrs.replace(
                    /href(\s|$)|href=""/g,
                    ''
                  )}`
                  tmpEndTag = 'button'
                  break
                default:
                  break
              }

              switch (true) {
                case newTag === 'a':
                  const href = /href=("|'|)(?<href>.*?)("|'|)+(\s|$)/g.exec(
                    curAttrs
                  )?.groups?.href
                  tmpContent = tmpContent.replace(
                    /[Cc]lick here|[Cc]lick this|[Gg]o|[Hh]ere|[Tt]his|[Ss]tart|[Rr]ight here|[Mm]ore|[Ll]earn more/g,
                    ''
                  )

                  const tmpContentWithTrim = tmpContent
                    .replace(/([\n]|<!--(\s[^>]+)*-->)/g, '')
                    .trim()

                  if (!tmpContentWithTrim.replace(/<[^>]*>/g, ''))
                    tmpContent = `${tmpContentWithTrim} ${href}`

                  if (curAttrs.includes('aria-label=')) {
                    const ariaLabel =
                      /aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g.exec(
                        curAttrs
                      )?.groups?.ariaLabel

                    if (ariaLabel !== tmpContent)
                      newAttrs = curAttrs.replace(
                        /aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g,
                        ''
                      )
                  }

                  break
                case newTag === 'button':
                  const tmpContentWithoutHTMLTags = tmpContent
                    .replace(/<[^>]*>|[\n]/g, '')
                    .trim()

                  if (!tmpContentWithoutHTMLTags) return ''
                  if (!curAttrs.includes('type='))
                    newAttrs = `type="button" ${newAttrs}`

                  if (curAttrs.includes('aria-label=')) {
                    const ariaLabel =
                      /aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g.exec(
                        curAttrs
                      )?.groups?.ariaLabel

                    tmpContent = ariaLabel
                  } else {
                    newAttrs = `aria-label="${tmpContentWithoutHTMLTags}" ${newAttrs}`
                    tmpContent = tmpContentWithoutHTMLTags
                  }
                  break
                case newTag === 'input' &&
                  /type=['"](button|submit)['"]/g.test(curAttrs) &&
                  !/value(\s|$)|value=['"]{2}/g.test(curAttrs):
                  return ''
                case newTag === 'input' &&
                  /id=("|'|)(.*?)("|'|)+(\s|$)/g.test(newAttrs):
                  const id = /id=("|'|)(?<id>.*?)("|'|)+(\s|$)/g.test(newAttrs)
                  result = `<label for=${id}><${newTag} ${newAttrs}>${tmpContent}</${tmpEndTag}>`
                  break
                default:
                  break
              }

              result =
                result || tmpEndTag
                  ? `<${newTag} ${newAttrs} ${negative}>${tmpContent}</${tmpEndTag}>`
                  : `<${newTag} ${negative} ${newAttrs}>`

              return result
            }
          )
      })
    } catch (err) {
      return html
    }

    return tmpHTML
  }
} // optimizeContent

export const scriptOptimizeContent = async (html: string) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (!regexHasScriptRemoval.test(html)) return html

  html = html.replace(regexRemoveScriptTag, removeElements)

  return html
} // scriptOptimizeContent

export const styleOptimizeContent = async (html) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (!regexHasStyleRemoval.test(html)) return html

  html = html.replace(regexRemoveStyleTag, removeStyles)

  return html
} // styleOptimizeContent

export const lowOptimizeContent = async (html) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (!hasLowOptimization.test(html)) return html

  html = html.replace(regexLowOptimize, removeClasses)

  return html
} // lowOptimizeContent

export const shallowOptimizeContent = async (
  html: string,
  removeAssets = false
) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (
    (removeAssets
      ? regexHasFullOptimization
      : regexHasShallowOptimization
    ).test(html)
  )
    html = html.replace(
      removeAssets ? regexFullOptimizeBody : regexShallowOptimize,
      removeAssets ? removeClassesAndStyles : removeClasses
    )

  html = transformHtmlSegments(html, (segment) => {
    return segment
      .replace(regexHandleAttrsHtmlTag, (match, tag, curAttrs) => {
        let newAttrs = curAttrs

        if (!newAttrs.includes('lang')) {
          newAttrs = `lang="en"`
        }

        return `<html ${newAttrs}>`
      })
      .replace(regexHandleAttrsImageTag, (match, tag, curAttrs) => {
        const alt = /alt=("|'|)(?<alt>[^"']+)("|'|)+(\s|$)/g
          .exec(curAttrs)
          ?.groups?.alt?.trim()

        if (!alt) return ''

        let newAttrs = (
          curAttrs.includes('seo-tag')
            ? curAttrs
            : curAttrs.replace(
                /(?<srcAttr>(src|srcset))=("|'|)(.*?)("|'|)+(\s|$)/g,
                '$<srcAttr> '
              )
        ).trim()

        switch (true) {
          case !newAttrs.includes('height='):
            newAttrs = `height="200" ${newAttrs}`
          case !newAttrs.includes('width='):
            newAttrs = `width="150" ${newAttrs}`
          default:
            break
        }

        return `<img ${newAttrs}>`
      })
      .replace(
        regexHandleAttrsInteractiveTag,
        (math, tag, curAttrs, negative, content, endTag) => {
          let newAttrs = `style="display: inline-block;min-width: 48px;min-height: 48px;" ${curAttrs.trim()}`
          let newTag = tag
          let tmpEndTag = tag === 'input' ? '' : endTag === tag ? endTag : tag
          let tmpContent = content
          let result

          switch (true) {
            case newTag === 'a' && !curAttrs.includes('href='):
              newTag = 'button'
              newAttrs = `type="button" ${newAttrs}`
              tmpEndTag = 'button'
              break
            case newTag === 'a' && /href(\s|$)|href=""/g.test(curAttrs):
              newTag = 'button'
              newAttrs = `type="button" ${newAttrs.replace(
                /href(\s|$)|href=""/g,
                ''
              )}`
              tmpEndTag = 'button'
              break
            default:
              break
          }

          result =
            result || tmpEndTag
              ? `<${newTag} ${newAttrs} ${negative}>${tmpContent}</${tmpEndTag}>`
              : `<${newTag} ${negative} ${newAttrs}>`

          return result
        }
      )
  })

  return html
} // shallowOptimizeContent

export const deepOptimizeContent = async (html: string) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  let tmpHTML = html
  try {
    tmpHTML = transformHtmlSegments(tmpHTML, (segment) =>
      segment.replace(
        regexHandleAttrsInteractiveTag,
        (math, tag, curAttrs, negative, content, endTag) => {
          let newAttrs = curAttrs.trim()
          let newTag = tag
          let tmpEndTag = tag === 'input' ? '' : endTag === tag ? endTag : tag
          let tmpContent = content
          let result

          switch (true) {
            case newTag === 'a':
              const href = /href=("|'|)(?<href>.*?)("|'|)+(\s|$)/g.exec(
                curAttrs
              )?.groups?.href
              tmpContent = tmpContent.replace(
                /[Cc]lick here|[Cc]lick this|[Gg]o|[Hh]ere|[Tt]his|[Ss]tart|[Rr]ight here|[Mm]ore|[Ll]earn more/g,
                ''
              )

              const tmpContentWithTrim = tmpContent
                .replace(/([\n]|<!--(\s[^>]+)*-->)/g, '')
                .trim()

              if (!tmpContentWithTrim.replace(/<[^>]*>/g, ''))
                tmpContent = `${tmpContentWithTrim} ${href}`

              if (curAttrs.includes('aria-label=')) {
                const ariaLabel =
                  /aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g.exec(
                    curAttrs
                  )?.groups?.ariaLabel

                if (ariaLabel !== tmpContent)
                  newAttrs = curAttrs.replace(
                    /aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g,
                    ''
                  )
              }

              break
            case newTag === 'button':
              const tmpContentWithoutHTMLTags = tmpContent
                .replace(/<[^>]*>|[\n]/g, '')
                .trim()

              if (!tmpContentWithoutHTMLTags) return ''
              if (!curAttrs.includes('type='))
                newAttrs = `type="button" ${newAttrs}`

              if (curAttrs.includes('aria-label=')) {
                const ariaLabel =
                  /aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g.exec(
                    curAttrs
                  )?.groups?.ariaLabel

                tmpContent = ariaLabel
              } else {
                newAttrs = `aria-label="${tmpContentWithoutHTMLTags}" ${newAttrs}`
                tmpContent = tmpContentWithoutHTMLTags
              }
              break
            case newTag === 'input' &&
              /type=['"](button|submit)['"]/g.test(curAttrs) &&
              !/value(\s|$)|value=['"]{2}/g.test(curAttrs):
              return ''
            case newTag === 'input' &&
              /id=("|'|)(.*?)("|'|)+(\s|$)/g.test(newAttrs):
              const id = /id=("|'|)(?<id>.*?)("|'|)+(\s|$)/g.test(newAttrs)
              result = `<label for=${id}><${newTag} ${newAttrs}>${tmpContent}</${tmpEndTag}>`
              break
            default:
              break
          }

          result =
            result || tmpEndTag
              ? `<${newTag} ${newAttrs} ${negative}>${tmpContent}</${tmpEndTag}>`
              : `<${newTag} ${negative} ${newAttrs}>`

          return result
        }
      )
    )
  } catch (err) {
    return html
  }

  return tmpHTML
} // deepOptimizeContent
