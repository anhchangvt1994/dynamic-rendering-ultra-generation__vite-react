"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _node = require('@minify-html/node'); var _node2 = _interopRequireDefault(_node);
var _zlib = require('zlib');
var _constants = require('../../../constants');
var _InitEnv = require('../../../utils/InitEnv');



















var _constants3 = require('../../constants');

// These callbacks share the four groups of htmlOptimizationRegex. A removed
// block wrapper needs a word boundary; inline tags do not acquire whitespace.
const preserveAttributeValue = (match) =>
  match[0] === '"' || match[0] === "'" ? match : ''
const hasRemovableAttribute = /\s(?:class|style)\s*=/i
const hasLowOptimization =
  /<\/?div(?=[\s/>])|\sclass\s*=|<i\s*(?:\/>|>\s*<\/i\s*>)/i
const hasRawText = /<!--|<(?:script|style|pre|code|textarea|title)(?=[\s/>])/i
const hasQuotedMarkup = /=\s*(?:"[^"]*<|'[^']*<)/
const hasNormalizationTarget = /<\/?(?:html|source|img|a|button)(?=[\s/>])/i
const isCommentOrTitle = /^(?:<!--|<title(?=[\s/>]))/i
const replaceOptimizationMatch =
  (attributes) =>
  (
    match,
    removed,
    preserved,
    div,
    tag
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
const removeClasses = replaceOptimizationMatch(_constants3.regexRemoveClassAttrs)
const removeStyles = replaceOptimizationMatch(_constants3.regexRemoveStyleAttrs)
const removeClassesAndStyles = replaceOptimizationMatch(
  _constants3.regexRemoveClassAndStyleAttrs
)

// Subsequent image/link normalization must not rewrite example markup inside
// JSON-LD, comments, pre/code, or another tag's quoted attribute value.
const transformHtmlSegments = (
  html,
  transform
) => {
  const probe = hasQuotedMarkup.test(html) ? _constants3.regexHasPreservedHtml : hasRawText
  if (!probe.test(html)) return transform(html)
  const parts = []
  let cursor = 0
  for (const match of html.matchAll(_constants3.regexHtmlTransformSegments)) {
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
const safeDecompress = (html) => {
  if (!Buffer.isBuffer(html)) return html

  try {
    return _zlib.brotliDecompressSync.call(void 0, html).toString()
  } catch (err) {
    console.error('Failed to decompress HTML buffer:', err)
    // Return the buffer as string if decompression fails
    return html.toString()
  }
}

 const compressContent = async (html) => {
  if (!html || _InitEnv.PROCESS_ENV.DISABLE_COMPRESS) return html

  if (_constants.POWER_LEVEL === _constants.POWER_LEVEL_LIST.ONE) {
    if (Buffer.isBuffer(html)) html = safeDecompress(html)

    return html
  }

  let tmpHTML = html

  if (_InitEnv.ENV !== 'development') {
    try {
      if (Buffer.isBuffer(html)) {
        tmpHTML = await _node2.default
          .minify(tmpHTML , {})
          .toString()
      } else {
        tmpHTML = await _node2.default.minify(Buffer.from(tmpHTML), {}).toString()
      }
    } catch (err) {
      return html
    }
  }

  return tmpHTML
}; exports.compressContent = compressContent // compressContent

 const optimizeContent = async (
  html,
  isFullOptimize = false
) => {
  if (!html) return html
  // console.log('start optimize')

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (_InitEnv.PROCESS_ENV.DISABLE_DEEP_OPTIMIZE)
    return html.replace(_constants3.regexRemoveSpecialTag, removeElements)
  else {
    let tmpHTML = html
    try {
      if (_constants3.regexHasFullOptimization.test(tmpHTML))
        tmpHTML = tmpHTML.replace(_constants3.regexFullOptimizeBody, removeClassesAndStyles)

      tmpHTML = transformHtmlSegments(tmpHTML, (segment) => {
        return segment
          .replace(_constants3.regexHandleAttrsHtmlTag, (match, tag, curAttrs) => {
            let newAttrs = curAttrs

            if (!newAttrs.includes('lang')) {
              newAttrs = `lang="en"`
            }

            return `<html ${newAttrs}>`
          })
          .replace(_constants3.regexHandleAttrsImageTag, (match, tag, curAttrs) => {
            const alt = _optionalChain([/alt=("|'|)(?<alt>[^"']+)("|'|)+(\s|$)/g
, 'access', _ => _.exec, 'call', _2 => _2(curAttrs)
, 'optionalAccess', _3 => _3.groups, 'optionalAccess', _4 => _4.alt, 'optionalAccess', _5 => _5.trim, 'call', _6 => _6()])

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
            _constants3.regexHandleAttrsInteractiveTag,
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
                  const href = _optionalChain([/href=("|'|)(?<href>.*?)("|'|)+(\s|$)/g, 'access', _7 => _7.exec, 'call', _8 => _8(
                    curAttrs
                  ), 'optionalAccess', _9 => _9.groups, 'optionalAccess', _10 => _10.href])
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
                      _optionalChain([/aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g, 'access', _11 => _11.exec, 'call', _12 => _12(
                        curAttrs
                      ), 'optionalAccess', _13 => _13.groups, 'optionalAccess', _14 => _14.ariaLabel])

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
                      _optionalChain([/aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g, 'access', _15 => _15.exec, 'call', _16 => _16(
                        curAttrs
                      ), 'optionalAccess', _17 => _17.groups, 'optionalAccess', _18 => _18.ariaLabel])

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
}; exports.optimizeContent = optimizeContent // optimizeContent

 const scriptOptimizeContent = async (html) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (!_constants3.regexHasScriptRemoval.test(html)) return html

  html = html.replace(_constants3.regexRemoveScriptTag, removeElements)

  return html
}; exports.scriptOptimizeContent = scriptOptimizeContent // scriptOptimizeContent

 const styleOptimizeContent = async (html) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (!_constants3.regexHasStyleRemoval.test(html)) return html

  html = html.replace(_constants3.regexRemoveStyleTag, removeStyles)

  return html
}; exports.styleOptimizeContent = styleOptimizeContent // styleOptimizeContent

 const lowOptimizeContent = async (html) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (!hasLowOptimization.test(html)) return html

  html = html.replace(_constants3.regexLowOptimize, removeClasses)

  return html
}; exports.lowOptimizeContent = lowOptimizeContent // lowOptimizeContent

 const shallowOptimizeContent = async (
  html,
  removeAssets = false
) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  if (
    (removeAssets
      ? _constants3.regexHasFullOptimization
      : _constants3.regexHasShallowOptimization
    ).test(html)
  )
    html = html.replace(
      removeAssets ? _constants3.regexFullOptimizeBody : _constants3.regexShallowOptimize,
      removeAssets ? removeClassesAndStyles : removeClasses
    )

  html = transformHtmlSegments(html, (segment) => {
    return segment
      .replace(_constants3.regexHandleAttrsHtmlTag, (match, tag, curAttrs) => {
        let newAttrs = curAttrs

        if (!newAttrs.includes('lang')) {
          newAttrs = `lang="en"`
        }

        return `<html ${newAttrs}>`
      })
      .replace(_constants3.regexHandleAttrsImageTag, (match, tag, curAttrs) => {
        const alt = _optionalChain([/alt=("|'|)(?<alt>[^"']+)("|'|)+(\s|$)/g
, 'access', _19 => _19.exec, 'call', _20 => _20(curAttrs)
, 'optionalAccess', _21 => _21.groups, 'optionalAccess', _22 => _22.alt, 'optionalAccess', _23 => _23.trim, 'call', _24 => _24()])

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
        _constants3.regexHandleAttrsInteractiveTag,
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
}; exports.shallowOptimizeContent = shallowOptimizeContent // shallowOptimizeContent

 const deepOptimizeContent = async (html) => {
  if (!html) return html

  if (Buffer.isBuffer(html)) html = safeDecompress(html)

  let tmpHTML = html
  try {
    tmpHTML = transformHtmlSegments(tmpHTML, (segment) =>
      segment.replace(
        _constants3.regexHandleAttrsInteractiveTag,
        (math, tag, curAttrs, negative, content, endTag) => {
          let newAttrs = curAttrs.trim()
          let newTag = tag
          let tmpEndTag = tag === 'input' ? '' : endTag === tag ? endTag : tag
          let tmpContent = content
          let result

          switch (true) {
            case newTag === 'a':
              const href = _optionalChain([/href=("|'|)(?<href>.*?)("|'|)+(\s|$)/g, 'access', _25 => _25.exec, 'call', _26 => _26(
                curAttrs
              ), 'optionalAccess', _27 => _27.groups, 'optionalAccess', _28 => _28.href])
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
                  _optionalChain([/aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g, 'access', _29 => _29.exec, 'call', _30 => _30(
                    curAttrs
                  ), 'optionalAccess', _31 => _31.groups, 'optionalAccess', _32 => _32.ariaLabel])

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
                  _optionalChain([/aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g, 'access', _33 => _33.exec, 'call', _34 => _34(
                    curAttrs
                  ), 'optionalAccess', _35 => _35.groups, 'optionalAccess', _36 => _36.ariaLabel])

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
}; exports.deepOptimizeContent = deepOptimizeContent // deepOptimizeContent
