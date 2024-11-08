import { Page } from 'puppeteer'
import WorkerPool from 'workerpool'
import { BANDWIDTH_LEVEL, BANDWIDTH_LEVEL_LIST } from '../../../constants'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import {
	CACHEABLE_STATUS_CODE,
	DURATION_TIMEOUT,
	puppeteer,
	regexNotFoundPageID,
	regexQueryStringSpecialInfo,
	WINDOW_VIEWPORT_HEIGHT,
	WINDOW_VIEWPORT_WIDTH,
} from '../../constants'
import { ISSRResult } from '../../types'
import CacheManager from '../CacheManager.worker/utils'
import {
	compressContent,
	shallowOptimizeContent,
	deepOptimizeContent,
	lowOptimizeContent,
	scriptOptimizeContent,
	styleOptimizeContent,
} from '../OptimizeHtml.worker/utils'
import { getInternalHTML, getInternalScript } from './utils/utils'

interface IISRHandlerParam {
	startGenerating: number
	hasCache: boolean
	url: string
	wsEndpoint: string
	baseUrl: string
}

const _getRestOfDuration = (startGenerating, gapDuration = 0) => {
	if (!startGenerating) return 0

	return DURATION_TIMEOUT - gapDuration - (Date.now() - startGenerating)
} // _getRestOfDuration

const _getSafePage = (page: Page) => {
	const SafePage = page

	return () => {
		if (SafePage && SafePage.isClosed()) return
		return SafePage
	}
} // _getSafePage

const fetchData = async (
	input: RequestInfo | URL,
	init?: RequestInit | undefined,
	reqData?: { [key: string]: any }
) => {
	try {
		const params = new URLSearchParams()
		if (reqData) {
			for (const key in reqData) {
				params.append(key, reqData[key])
			}
		}

		const response = await fetch(
			input + (reqData ? `?${params.toString()}` : ''),
			init
		).then(async (res) => ({
			status: res.status,
			data: await res.text(),
		}))

		const data = /^{(.|[\r\n])*?}$/.test(response.data)
			? JSON.parse(response.data)
			: response.data

		return {
			...response,
			data,
		}
	} catch (error) {
		Console.error(error)
		return {
			status: 500,
			data: '',
		}
	}
} // fetchData

const waitResponse = (() => {
	return async (page: Page, url: string, duration: number) => {
		const pathname = new URL(url).pathname

		const crawlSpeedOption = (
			ServerConfig.crawl.custom?.(url) ??
			ServerConfig.crawl.routes[pathname] ??
			ServerConfig.crawl
		).speed

		const commonWaitingDuration = crawlSpeedOption / 10
		const waitUntil = commonWaitingDuration <= 800 ? 'load' : 'domcontentloaded'

		const firstWaitingDuration =
			BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? commonWaitingDuration : 500
		const defaultRequestWaitingDuration =
			BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? commonWaitingDuration : 500
		const requestServedFromCacheDuration =
			BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? commonWaitingDuration : 500
		const requestFailDuration =
			BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? commonWaitingDuration : 500
		const maximumTimeout =
			BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? 20000 : 20000

		// console.log(url.split('?')[0])
		let hasRedirected = false
		const safePage = _getSafePage(page)
		safePage()?.on('response', (response) => {
			const status = response.status()
			//[301, 302, 303, 307, 308]
			if (status >= 300 && status <= 399) {
				hasRedirected = true
			}
		})

		let response
		try {
			response = await new Promise(async (resolve, reject) => {
				// WorkerPool.workerEmit('waitResponse_00')
				const result = await new Promise<any>((resolveAfterPageLoad) => {
					safePage()
						?.goto(url, {
							// waitUntil: 'networkidle2',
							waitUntil,
							timeout: 30000,
						})
						.then((res) => {
							setTimeout(() => resolveAfterPageLoad(res), firstWaitingDuration)
						})
						.catch((err) => {
							reject(err)
						})
				})

				// console.log(`finish page load: `, url.split('?')[0])

				// WorkerPool.workerEmit('waitResponse_01')
				const waitForNavigate = (() => {
					let counter = 0
					return async () => {
						if (hasRedirected) {
							if (counter < 3) {
								counter++
								hasRedirected = false
								return new Promise(async (resolveAfterNavigate) => {
									try {
										await safePage()?.waitForSelector('body')
										// await new Promise((resWaitForNavigate) =>
										// 	setTimeout(resWaitForNavigate, 2000)
										// )
										const navigateResult = await waitForNavigate()

										resolveAfterNavigate(navigateResult)
									} catch (err) {
										Console.error(err.message)
										resolveAfterNavigate('fail')
									}
								})
							} else {
								return 'fail'
							}
						} else return 'finish'
					}
				})()

				const navigateResult = await waitForNavigate()

				// console.log(`finish page navigate: `, url.split('?')[0])

				// WorkerPool.workerEmit('waitResponse_02')

				if (navigateResult === 'fail') return resolve(result)

				safePage()?.removeAllListeners('response')

				const html = (await safePage()?.content()) ?? ''

				if (regexNotFoundPageID.test(html)) return resolve(result)

				await new Promise((resolveAfterPageLoadInFewSecond) => {
					const startTimeout = (() => {
						let timeout
						return (duration = defaultRequestWaitingDuration) => {
							if (timeout) clearTimeout(timeout)
							timeout = setTimeout(resolveAfterPageLoadInFewSecond, duration)
						}
					})()

					startTimeout()

					safePage()?.on('requestfinished', () => {
						startTimeout()
					})
					safePage()?.on('requestservedfromcache', () => {
						startTimeout(requestServedFromCacheDuration)
					})
					safePage()?.on('requestfailed', () => {
						startTimeout(requestFailDuration)
					})

					setTimeout(resolveAfterPageLoadInFewSecond, maximumTimeout)
				})

				// console.log(`finish all page: `, url.split('?')[0])

				setTimeout(() => {
					resolve(result)
				}, 500)
			})
		} catch (err) {
			// console.log(err.message)
			// console.log('-------')
			throw err
		}

		return response
	}
})() // waitResponse

const gapDurationDefault = 1500

const ISRHandler = async (params: IISRHandlerParam) => {
	if (!params) return

	const { hasCache, url, wsEndpoint, baseUrl } = params

	const startGenerating = Date.now()
	if (_getRestOfDuration(startGenerating, gapDurationDefault) <= 0) return

	const cacheManager = CacheManager(url)

	let restOfDuration = _getRestOfDuration(startGenerating, gapDurationDefault)

	if (restOfDuration <= 0) {
		if (hasCache) {
			const tmpResult = await cacheManager.achieve()

			return tmpResult
		}
		return
	}

	let html = ''
	let status = 200
	let enableOptimizeAndCompressIfRemoteCrawlerFail = !ServerConfig.crawler

	const specialInfo = regexQueryStringSpecialInfo.exec(url)?.groups ?? {}

	if (ServerConfig.crawler) {
		const requestParams = {
			startGenerating,
			hasCache,
			url: url.split('?')[0],
		}

		if (ServerConfig.crawlerSecretKey) {
			requestParams['crawlerSecretKey'] = ServerConfig.crawlerSecretKey
		}

		const headers = { ...specialInfo }

		const botInfo = JSON.parse(headers['botInfo'])

		if (!botInfo.isBot) {
			headers['botInfo'] = JSON.stringify({
				name: 'unknown',
				isBot: true,
			})
		}

		try {
			const result = await fetchData(
				ServerConfig.crawler,
				{
					method: 'GET',
					headers: new Headers({
						Accept: 'text/html; charset=utf-8',
						...headers,
					}),
				},
				requestParams
			)

			if (result) {
				status = result.status
				html = result.data
			}

			Console.log('External crawler status: ', status)
		} catch (err) {
			enableOptimizeAndCompressIfRemoteCrawlerFail = true
			Console.log('ISRHandler line 230:')
			Console.log('Crawler is fail!')
			Console.error(err)
		}
	}

	if (wsEndpoint && (!ServerConfig.crawler || [404, 500].includes(status))) {
		const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint })

		if (browser && browser.connected) {
			enableOptimizeAndCompressIfRemoteCrawlerFail = true
			Console.log('Create new page')
			const page = await browser.newPage()
			const safePage = _getSafePage(page)

			Console.log('Create new page success!')

			if (!page) {
				if (!page && hasCache) {
					const tmpResult = await cacheManager.achieve()

					return tmpResult
				}
				return
			}

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
					safePage()?.setViewport({
						width: WINDOW_VIEWPORT_WIDTH,
						height: WINDOW_VIEWPORT_HEIGHT,
					}),
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

						if (resourceType === 'document' && reqUrl.startsWith(baseUrl)) {
							const urlInfo = new URL(reqUrl)
							const pointsTo = ServerConfig.routes?.[urlInfo.pathname]?.pointsTo

							if (!pointsTo || pointsTo.startsWith(baseUrl)) {
								getInternalHTML({ url: reqUrl })
									.then((result) => {
										if (!result)
											req.respond({
												body: 'File not found',
												status: 404,
												contentType: 'text/html',
											})
										else
											req.respond({
												body: result.body,
												status: result.status,
												contentType: 'text/html',
											})
									})
									.catch((err) => {
										Console.error(err)
										req.continue()
									})
							} else {
								req.continue()
							}
						} else if (
							resourceType === 'script' &&
							reqUrl.startsWith(baseUrl)
						) {
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
					response = await waitResponse(page, url, restOfDuration)
				} catch (err) {
					Console.log('ISRHandler line 341:')
					Console.error('err name: ', err.name)
					Console.error('err message: ', err.message)
					throw new Error('Internal Error')
				} finally {
					status = response?.status?.() ?? status
					Console.log(`Internal crawler status: ${status}`)
				}
			} catch (err) {
				Console.log('ISRHandler line 297:')
				Console.log('Crawler is fail!')
				Console.error(err)
				cacheManager.remove(url).catch((err) => {
					Console.error(err)
				})
				safePage()?.close()
				if (params.hasCache) {
					cacheManager.rename({
						url,
					})
				}

				return {
					status: 500,
				}
			}

			if (CACHEABLE_STATUS_CODE[status]) {
				try {
					html = (await safePage()?.content()) ?? '' // serialized HTML of page DOM.
					safePage()?.close()
				} catch (err) {
					Console.log('ISRHandler line 315:')
					Console.error(err)
					safePage()?.close()
					if (params.hasCache) {
						cacheManager.rename({
							url,
						})
					}

					return
				}

				status = html && regexNotFoundPageID.test(html) ? 404 : 200
			}
		}
	}

	restOfDuration = _getRestOfDuration(startGenerating)

	let result: ISSRResult
	if (CACHEABLE_STATUS_CODE[status]) {
		if (cacheManager.getStatus() !== 'renew') {
			WorkerPool.workerEmit({
				name: 'html',
				value: html,
			})
		}

		const pathname = new URL(url).pathname

		const crawlCustomOption = ServerConfig.crawl.custom?.(url)

		const optimizeOption = (
			crawlCustomOption ??
			ServerConfig.crawl.routes[pathname] ??
			ServerConfig.crawl
		).optimize

		const enableScriptOptimize =
			optimizeOption &&
			(typeof optimizeOption === 'string' ||
				optimizeOption.includes('script')) &&
			enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableStyleOptimize =
			optimizeOption &&
			(typeof optimizeOption === 'string' ||
				optimizeOption.includes('style')) &&
			enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableShallowOptimize =
			optimizeOption === 'shallow' &&
			enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableDeepOptimize =
			optimizeOption === 'deep' && enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableLowOptimize =
			optimizeOption === 'low' && enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableToCompress = (() => {
			const options =
				crawlCustomOption ??
				ServerConfig.crawl.routes[pathname] ??
				ServerConfig.crawl

			return options.compress && enableOptimizeAndCompressIfRemoteCrawlerFail
		})()

		let isRaw = false
		try {
			if (
				crawlCustomOption &&
				typeof crawlCustomOption.onContentCrawled === 'function'
			) {
				html = crawlCustomOption.onContentCrawled({ html }) as string
			}

			if (enableScriptOptimize) html = await scriptOptimizeContent(html)

			if (enableStyleOptimize) html = await styleOptimizeContent(html)

			if (enableLowOptimize || enableShallowOptimize || enableDeepOptimize)
				html = await lowOptimizeContent(html)

			if (cacheManager.getStatus() !== 'renew') {
				WorkerPool.workerEmit({
					name: 'html',
					value: html,
				})
			}

			if (enableShallowOptimize || enableDeepOptimize)
				html = await shallowOptimizeContent(html)

			if (cacheManager.getStatus() !== 'renew') {
				WorkerPool.workerEmit({
					name: 'html',
					value: html,
				})
			}

			if (enableToCompress) html = await compressContent(html)

			if (enableDeepOptimize) {
				if (cacheManager.getStatus() !== 'renew') {
					WorkerPool.workerEmit({
						name: 'html',
						value: html,
					})
				}
				html = await deepOptimizeContent(html)
			}
			// console.log('finish optimize and compress: ', url.split('?')[0])
			// console.log('-------')
		} catch (err) {
			isRaw = true
			Console.log('--------------------')
			Console.log('ISRHandler line 368:')
			Console.log('error url', url.split('?')[0])
			Console.error(err)
			// console.log('fail optimize and compress: ', url.split('?')[0])
			// console.log('-------')
		}

		result = await cacheManager.set({
			html,
			url,
			isRaw,
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
}

WorkerPool.worker({
	ISRHandler,
	finish: () => {
		return 'finish'
	},
})
