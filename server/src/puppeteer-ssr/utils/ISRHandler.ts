import { Page } from 'puppeteer-core'
import { BANDWIDTH_LEVEL, BANDWIDTH_LEVEL_LIST } from '../../constants'
import ServerConfig from '../../server.config'
import Console from '../../utils/ConsoleHandler'
import { ENV_MODE } from '../../utils/InitEnv'
import {
	CACHEABLE_STATUS_CODE,
	DURATION_TIMEOUT,
	regexNotFoundPageID,
	regexQueryStringSpecialInfo,
	WINDOW_VIEWPORT_HEIGHT,
	WINDOW_VIEWPORT_WIDTH,
} from '../constants'
import { ISSRResult } from '../types'
import BrowserManager, { IBrowser } from './BrowserManager'
import CacheManager from './CacheManager.worker/utils'
import {
	shallowOptimizeContent,
	deepOptimizeContent,
	scriptOptimizeContent,
	styleOptimizeContent,
} from './OptimizeHtml.worker'
import { compressContent } from './OptimizeHtml.worker/utils'
const { parentPort, isMainThread } = require('worker_threads')

const browserManager = (() => {
	if (ENV_MODE === 'development') return undefined as unknown as IBrowser
	return BrowserManager()
})()

interface IISRHandlerParam {
	startGenerating: number
	hasCache: boolean
	url: string
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
	const firstWaitingDuration =
		BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? 500 : 500
	const defaultRequestWaitingDuration =
		BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? 500 : 500
	const requestServedFromCacheDuration =
		BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? 500 : 500
	const requestFailDuration =
		BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? 500 : 500
	const maximumTimeout =
		BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE ? 10000 : 10000

	return async (page: Page, url: string, duration: number) => {
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
						?.goto(url.split('?')[0], {
							// waitUntil: 'networkidle2',
							waitUntil: 'load',
							timeout: 12000,
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

	const { hasCache, url } = params

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

	if (
		browserManager &&
		(!ServerConfig.crawler || [404, 500].includes(status))
	) {
		const browser = await browserManager.get()

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

			try {
				await safePage()?.waitForNetworkIdle({ idleTime: 150 })
				await safePage()?.setViewport({
					width: WINDOW_VIEWPORT_WIDTH,
					height: WINDOW_VIEWPORT_HEIGHT,
				})
				await safePage()?.setRequestInterception(true)
				safePage()?.on('request', (req) => {
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
						req.continue()
					}
				})

				await safePage()?.setExtraHTTPHeaders({
					...specialInfo,
					service: 'puppeteer',
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
				cacheManager.remove(url, { force: true }).catch((err) => {
					Console.error(err)
				})
				safePage()?.close()
				browser.emit('closePage', url)
				if (!isMainThread) {
					parentPort.postMessage({
						name: 'closePage',
						wsEndpoint: browser.wsEndpoint(),
						url,
					})
				}
				if (params.hasCache) {
					cacheManager.rename({
						url,
					})
				}

				return {
					status: 500,
				}
			}

			try {
				html = (await safePage()?.content()) ?? '' // serialized HTML of page DOM.
				safePage()?.close()
				browser.emit('closePage', url)
				if (!isMainThread) {
					parentPort.postMessage({
						name: 'closePage',
						wsEndpoint: browser.wsEndpoint(),
						url,
					})
				}
			} catch (err) {
				Console.log('ISRHandler line 315:')
				Console.error(err)
				safePage()?.close()
				browser.emit('closePage', url)
				if (!isMainThread) {
					parentPort.postMessage({
						name: 'closePage',
						wsEndpoint: browser.wsEndpoint(),
						url,
					})
				}
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

	restOfDuration = _getRestOfDuration(startGenerating)

	let result: ISSRResult
	if (CACHEABLE_STATUS_CODE[status]) {
		const pathname = new URL(url).pathname
		const crawlCustomOption = ServerConfig.crawl.custom?.(url)

		const optimizeOption = (
			crawlCustomOption ??
			ServerConfig.crawl.routes[pathname] ??
			ServerConfig.crawl
		).optimize

		const enableShallowOptimize =
			optimizeOption === 'shallow' &&
			enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableDeepOptimize =
			optimizeOption === 'deep' && enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableLowOptimize =
			optimizeOption === 'low' && enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableScriptOptimize =
			typeof optimizeOption !== 'string' &&
			optimizeOption.includes('script') &&
			enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableStyleOptimize =
			typeof optimizeOption !== 'string' &&
			optimizeOption.includes('style') &&
			enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableToCompress = (() => {
			const options =
				crawlCustomOption ??
				ServerConfig.crawl.routes[pathname] ??
				ServerConfig.crawl

			return options.compress && enableOptimizeAndCompressIfRemoteCrawlerFail
		})()

		let isRaw = false
		try {
			if (enableScriptOptimize) html = await scriptOptimizeContent(html)

			if (enableStyleOptimize) html = await styleOptimizeContent(html)

			if (enableShallowOptimize) html = await shallowOptimizeContent(html)

			if (enableToCompress) html = await compressContent(html)

			if (enableDeepOptimize) html = await deepOptimizeContent(html)
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
		cacheManager.remove(url, { force: true }).catch((err) => {
			Console.error(err)
		})
		return {
			status,
			html: status === 404 ? 'Page not found!' : html,
		}
	}

	return result
}

export default ISRHandler
