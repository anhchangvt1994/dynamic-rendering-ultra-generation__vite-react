'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _optionalChain(ops) {
	let lastAccessLHS = undefined
	let value = ops[0]
	let i = 1
	while (i < ops.length) {
		const op = ops[i]
		const fn = ops[i + 1]
		i += 2
		if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
			return undefined
		}
		if (op === 'access' || op === 'optionalAccess') {
			lastAccessLHS = value
			value = fn(value)
		} else if (op === 'call' || op === 'optionalCall') {
			value = fn((...args) => value.call(lastAccessLHS, ...args))
			lastAccessLHS = undefined
		}
	}
	return value
}
var _htmlminifierterser = require('html-minifier-terser')
var _zlib = require('zlib')
var _constants = require('../../../constants')
var _InitEnv = require('../../../utils/InitEnv')

var _constants3 = require('../../constants')

const compressContent = async (html) => {
	if (!html || _InitEnv.PROCESS_ENV.DISABLE_COMPRESS) return html
	// console.log('start compress')
	if (Buffer.isBuffer(html))
		html = _zlib.brotliDecompressSync.call(void 0, html).toString()

	if (_constants.POWER_LEVEL === _constants.POWER_LEVEL_LIST.ONE) return html

	let tmpHTML = html

	if (_InitEnv.ENV !== 'development') {
		try {
			tmpHTML = await _htmlminifierterser.minify.call(void 0, tmpHTML, {
				collapseBooleanAttributes: true,
				collapseInlineTagWhitespace: true,
				collapseWhitespace: true,
				removeAttributeQuotes: true,
				removeComments: true,
				removeEmptyAttributes: true,
				removeEmptyElements: true,
				useShortDoctype: true,
			})
		} catch (err) {
			return html
		}
	}

	return tmpHTML
}
exports.compressContent = compressContent // compressContent

const optimizeContent = async (html, isFullOptimize = false) => {
	if (!html) return html
	// console.log('start optimize')

	if (Buffer.isBuffer(html))
		html = _zlib.brotliDecompressSync.call(void 0, html).toString()

	html = html.replace(_constants3.regexRemoveScriptTag, '')
	html = html.replace(_constants3.regexRemoveSpecialTag, '')

	if (_InitEnv.PROCESS_ENV.DISABLE_DEEP_OPTIMIZE) return html
	else {
		let tmpHTML = html
		try {
			tmpHTML = tmpHTML
				.replace(_constants3.regexFullOptimizeBody, '')
				.replace(
					_constants3.regexHandleAttrsHtmlTag,
					(match, tag, curAttrs) => {
						let newAttrs = curAttrs

						if (!newAttrs.includes('lang')) {
							newAttrs = `lang="en"`
						}

						return `<html ${newAttrs}>`
					}
				)
				.replace(
					_constants3.regexHandleAttrsImageTag,
					(match, tag, curAttrs) => {
						const alt = _optionalChain([
							/alt=("|'|)(?<alt>[^"']+)("|'|)+(\s|$)/g,
							'access',
							(_) => _.exec,
							'call',
							(_2) => _2(curAttrs),
							'optionalAccess',
							(_3) => _3.groups,
							'optionalAccess',
							(_4) => _4.alt,
							'optionalAccess',
							(_5) => _5.trim,
							'call',
							(_6) => _6(),
						])

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
					}
				)
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

						switch (true) {
							case newTag === 'a':
								const href = _optionalChain([
									/href=("|'|)(?<href>.*?)("|'|)+(\s|$)/g,
									'access',
									(_7) => _7.exec,
									'call',
									(_8) => _8(curAttrs),
									'optionalAccess',
									(_9) => _9.groups,
									'optionalAccess',
									(_10) => _10.href,
								])
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
									const ariaLabel = _optionalChain([
										/aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g,
										'access',
										(_11) => _11.exec,
										'call',
										(_12) => _12(curAttrs),
										'optionalAccess',
										(_13) => _13.groups,
										'optionalAccess',
										(_14) => _14.ariaLabel,
									])

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
									const ariaLabel = _optionalChain([
										/aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g,
										'access',
										(_15) => _15.exec,
										'call',
										(_16) => _16(curAttrs),
										'optionalAccess',
										(_17) => _17.groups,
										'optionalAccess',
										(_18) => _18.ariaLabel,
									])

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
		} catch (err) {
			return html
		}

		return tmpHTML
	}
}
exports.optimizeContent = optimizeContent // optimizeContent

const scriptOptimizeContent = async (html) => {
	if (!html) return html

	if (Buffer.isBuffer(html))
		html = _zlib.brotliDecompressSync.call(void 0, html).toString()

	html = html.replace(_constants3.regexRemoveScriptTag, '')

	return html
}
exports.scriptOptimizeContent = scriptOptimizeContent // scriptOptimizeContent

const styleOptimizeContent = async (html) => {
	if (!html) return html

	if (Buffer.isBuffer(html))
		html = _zlib.brotliDecompressSync.call(void 0, html).toString()

	html = html.replace(_constants3.regexRemoveStyleTag, '')

	return html
}
exports.styleOptimizeContent = styleOptimizeContent // styleOptimizeContent

const lowOptimizeContent = async (html) => {
	if (!html) return html

	if (Buffer.isBuffer(html))
		html = _zlib.brotliDecompressSync.call(void 0, html).toString()

	html = html.replace(_constants3.regexLowOptimize, '')

	return html
}
exports.lowOptimizeContent = lowOptimizeContent // lowOptimizeContent

const shallowOptimizeContent = async (html) => {
	if (!html) return html

	if (Buffer.isBuffer(html))
		html = _zlib.brotliDecompressSync.call(void 0, html).toString()

	html = html
		.replace(_constants3.regexShallowOptimize, '')
		.replace(_constants3.regexHandleAttrsHtmlTag, (match, tag, curAttrs) => {
			let newAttrs = curAttrs

			if (!newAttrs.includes('lang')) {
				newAttrs = `lang="en"`
			}

			return `<html ${newAttrs}>`
		})
		.replace(_constants3.regexHandleAttrsImageTag, (match, tag, curAttrs) => {
			const alt = _optionalChain([
				/alt=("|'|)(?<alt>[^"']+)("|'|)+(\s|$)/g,
				'access',
				(_19) => _19.exec,
				'call',
				(_20) => _20(curAttrs),
				'optionalAccess',
				(_21) => _21.groups,
				'optionalAccess',
				(_22) => _22.alt,
				'optionalAccess',
				(_23) => _23.trim,
				'call',
				(_24) => _24(),
			])

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

	return html
}
exports.shallowOptimizeContent = shallowOptimizeContent // shallowOptimizeContent

const deepOptimizeContent = async (html) => {
	if (!html) return html

	if (Buffer.isBuffer(html))
		html = _zlib.brotliDecompressSync.call(void 0, html).toString()

	let tmpHTML = html
	try {
		tmpHTML = tmpHTML.replace(
			_constants3.regexHandleAttrsInteractiveTag,
			(math, tag, curAttrs, negative, content, endTag) => {
				let newAttrs = curAttrs.trim()
				let newTag = tag
				let tmpEndTag = tag === 'input' ? '' : endTag === tag ? endTag : tag
				let tmpContent = content
				let result

				switch (true) {
					case newTag === 'a':
						const href = _optionalChain([
							/href=("|'|)(?<href>.*?)("|'|)+(\s|$)/g,
							'access',
							(_25) => _25.exec,
							'call',
							(_26) => _26(curAttrs),
							'optionalAccess',
							(_27) => _27.groups,
							'optionalAccess',
							(_28) => _28.href,
						])
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
							const ariaLabel = _optionalChain([
								/aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g,
								'access',
								(_29) => _29.exec,
								'call',
								(_30) => _30(curAttrs),
								'optionalAccess',
								(_31) => _31.groups,
								'optionalAccess',
								(_32) => _32.ariaLabel,
							])

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
							const ariaLabel = _optionalChain([
								/aria-label=("|'|)(?<ariaLabel>[^"']+)("|'|)+(\s|$)/g,
								'access',
								(_33) => _33.exec,
								'call',
								(_34) => _34(curAttrs),
								'optionalAccess',
								(_35) => _35.groups,
								'optionalAccess',
								(_36) => _36.ariaLabel,
							])

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
	} catch (err) {
		return html
	}

	return tmpHTML
}
exports.deepOptimizeContent = deepOptimizeContent // deepOptimizeContent
