import { Page } from 'puppeteer-core'
import WorkerPool from 'workerpool'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import { getViewsPath } from '../../../utils/PathHandler'
import {
	CACHEABLE_STATUS_CODE,
	regexNotFoundPageID,
	regexQueryStringSpecialInfo,
} from '../../constants'
import { SSRResult } from '../../types'
import BrowserManager from '../BrowserManager'
import CacheManager from '../CacheManager.worker/utils'
import {
	getInternalHTML,
	getInternalScript,
	getInternalStyle,
} from './utils/utils'
import { compressContent } from '../OptimizeHtml.worker/utils'

const viewsPath = getViewsPath()

interface SSRHandlerParam {
	url: string
	baseUrl: string
}

const browserManager = BrowserManager()

const _getSafePage = (page: Page) => {
	const SafePage = page

	return () => {
		if (SafePage && SafePage.isClosed()) return
		return SafePage
	}
} // _getSafePage

const waitResponse = (() => {
	return async (page: Page, url: string) => {
		const safePage = _getSafePage(page)

		let response
		try {
			response = await new Promise(async (resolve, reject) => {
				const result = await new Promise<any>((resolveAfterPageLoad) => {
					safePage()
						?.goto(url, {
							waitUntil: 'load',
						})
						.then((res) => resolveAfterPageLoad(res))
						.catch((err) => {
							reject(err)
						})
				})

				const html = (await safePage()?.content()) ?? ''

				if (regexNotFoundPageID.test(html)) return resolve(result)

				await new Promise((resolveAfterPageLoadInFewSecond) => {
					const startTimeout = (() => {
						let timeout
						return (duration = 1000) => {
							if (timeout) clearTimeout(timeout)
							timeout = setTimeout(resolveAfterPageLoadInFewSecond, duration)
						}
					})()

					startTimeout()

					safePage()?.on('requestfinished', () => {
						startTimeout()
					})
					safePage()?.on('requestservedfromcache', () => {
						startTimeout(200)
					})
					safePage()?.on('requestfailed', () => {
						startTimeout(200)
					})
				})

				resolve(result)
			})
		} catch (err) {
			throw err
		}

		return response
	}
})() // waitResponse

const SSRHandler = async (params: SSRHandlerParam) => {
	if (!browserManager || !params) return

	const browser = await browserManager.get()

	if (!browser || !browser.connected) return

	const { url, baseUrl } = params
	const cacheManager = CacheManager(url, viewsPath)

	let html = ''
	let status = 200

	const specialInfo = regexQueryStringSpecialInfo.exec(url)?.groups ?? {}

	if (browser && browser.connected) {
		const page = await browser.newPage()
		const safePage = _getSafePage(page)

		const deviceInfo = JSON.parse(specialInfo.deviceInfo)

		try {
			await Promise.all([
				safePage()?.setUserAgent(
					deviceInfo.isMobile
						? 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
						: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
				),
				safePage()?.waitForNetworkIdle({ idleTime: 150 }),
				safePage()?.setCacheEnabled(false),
				safePage()?.setRequestInterception(true),
				safePage()?.setViewport({ width: 1366, height: 768 }),
				safePage()?.setExtraHTTPHeaders({
					...specialInfo,
					service: 'puppeteer',
				}),
			])

			safePage()?.on('request', async (req) => {
				const resourceType = req.resourceType()

				if (resourceType === 'stylesheet') {
					req.respond({ status: 200, body: 'aborted' })
				} else if (
					/(socket.io.min.js)+(?:$)|data:image\/[a-z]*.?\;base64/.test(url) ||
					/googletagmanager.com|connect.facebook.net|asia.creativecdn.com|static.hotjar.com|deqik.com|contineljs.com|googleads.g.doubleclick.net|analytics.tiktok.com|google.com|gstatic.com|static.airbridge.io|googleadservices.com|google-analytics.com|sg.mmstat.com|t.contentsquare.net|accounts.google.com|browser.sentry-cdn.com|bat.bing.com|tr.snapchat.com|ct.pinterest.com|criteo.com|webchat.caresoft.vn|tags.creativecdn.com|script.crazyegg.com|tags.tiqcdn.com|trc.taboola.com|securepubads.g.doubleclick.net|partytown/.test(
						req.url()
					) ||
					['font', 'image', 'media', 'imageset'].includes(resourceType)
				) {
					req.abort()
				} else {
					const reqUrl = req.url()

					if (resourceType.includes('fetch')) {
						const urlInfo = new URL(reqUrl)
						if (!urlInfo.pathname.startsWith('/api')) {
							return req.respond({
								status: 200,
							})
						}
					}

					if (resourceType === 'document' && reqUrl.startsWith(baseUrl)) {
						const urlInfo = new URL(reqUrl)
						const pointsTo = (() => {
							const tmpPointsTo =
								ServerConfig.routes?.list?.[urlInfo.pathname]?.pointsTo

							if (!tmpPointsTo) return ''

							return typeof tmpPointsTo === 'string'
								? tmpPointsTo
								: tmpPointsTo.url
						})()

						if (!pointsTo || pointsTo.startsWith(baseUrl)) {
							getInternalHTML({ url: reqUrl })
								.then((result) => {
									if (!result)
										req.respond({
											body: 'File not found',
											status: 404,
											contentType: 'text/html',
										})
									else {
										req.respond({
											body: result.body,
											status: result.status,
											contentType: 'text/html',
										})
									}
								})
								.catch((err) => {
									Console.error(err)
									req.continue()
								})
						} else {
							req.continue()
						}
					} else if (resourceType === 'script' && reqUrl.startsWith(baseUrl)) {
						getInternalScript({ url: reqUrl })
							.then((result) => {
								if (!result)
									req.respond({
										body: 'File not found',
										status: 404,
										contentType: 'application/javascript',
									})
								else
									req.respond({
										body: result.body,
										status: result.status,
										contentType: 'application/javascript',
									})
							})
							.catch((err) => {
								Console.error(err)
								req.continue()
							})
					} else {
						req.continue()
					}
				}
			})

			Console.log(`Start to crawl: ${url}`)

			let response

			try {
				response = await waitResponse(page, url)
			} catch (err) {
				Console.log('SSRHandler line 341:')
				Console.error('err name: ', err.name)
				Console.error('err message: ', err.message)
				throw new Error('Internal Error')
			} finally {
				status = response?.status?.() ?? status
				Console.log(`Internal crawler status: ${status}`)
			}
		} catch (err) {
			Console.log('SSRHandler line 297:')
			Console.log('Crawler is fail!')
			Console.error(err)
			safePage()?.close()

			return {
				status: 500,
			}
		}

		if (CACHEABLE_STATUS_CODE[status]) {
			try {
				html = (await safePage()?.content()) ?? '' // serialized HTML of page DOM.
				safePage()?.close()
			} catch (err) {
				Console.log('SSRHandler line 315:')
				Console.error(err)
				safePage()?.close()

				return
			}

			status = html && regexNotFoundPageID.test(html) ? 404 : 200
		}
	}

	let result: SSRResult
	if (CACHEABLE_STATUS_CODE[status]) {
		try {
			let scriptTags = ''
			html = html
				.replace(
					/(?<script><script(\s[^>]+)src=("|'|)(.*?)("|'|)(\s[^>]+)*>(.|[\r\n])*?<\/script>)/g,
					(script) => {
						if (script) {
							script = script.replace('<script', '<script defer')
							scriptTags += script
						}
						return ''
					}
				)
				.replace('</body>', scriptTags + '</body>')
				.replace(
					/(?<style><link(\s[^>]+)href=("|'|)[A-Za-z0-9_\-\/]{0,}\.css("|'|)[^>\s]*>)/g,
					(style) => {
						if (style) {
							const href =
								/href=("|'|)(?<href>[A-Za-z0-9_\-\/]{0,}\.css)("|'|)/.exec(
									style
								)?.groups?.href

							if (href) {
								const styleResult = getInternalStyle({
									url: href,
								})

								if (styleResult && styleResult.status === 200) {
									return `<style>${styleResult.body}</style>`
								}
							}
						}

						return ''
					}
				)
		} catch (err) {
			Console.error(err)
		}

		try {
			html = html.replace(
				/<link\s+(?=.*(rel=["']?(dns-prefetch|preconnect|modulepreload|preload|prefetch)["']?).*?(\/|)?)(?:.*?\/?>)/g,
				''
			)
		} catch (err) {
			Console.error(err)
		}

		try {
			html = await compressContent(html, {
				collapseBooleanAttributes: true,
				collapseInlineTagWhitespace: true,
				collapseWhitespace: true,
				removeAttributeQuotes: true,
				removeComments: false,
				removeEmptyAttributes: true,
				useShortDoctype: true,
			})
		} catch (err) {
			Console.error(err)
		}

		result = await cacheManager.set(url, {
			html,
			isRaw: false,
		})
	} else {
		cacheManager.remove(url).catch((err) => {
			Console.error(err)
		})
		return {
			status,
			html: status === 404 ? 'Page not found!' : html,
		}
	}

	return result
} // SSRHandler

WorkerPool.worker({
	SSRHandler,
	finish: () => {
		return 'finish'
	},
})
