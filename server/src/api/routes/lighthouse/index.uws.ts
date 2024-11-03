import { TemplatedApp } from 'uWebSockets.js'
import Console from '../../../utils/ConsoleHandler'
import { fetchData } from '../../utils/FetchManager/utils'
import { ILighthouseResponse, IPageSpeedCategories } from './types'
import { getPageSpeedUrl } from './worker'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { TARGET_OPTIMAL_URL } from './constants'
import ServerConfig from '../../../server.config'

const limitRequest = ServerConfig.crawl.limit
let totalRequests = 0
const resetTotalRequestTimeout = (() => {
	let timeout: NodeJS.Timeout

	return () => {
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(() => {
			totalRequests = 0
		}, 50000)
	}
})()

const apiLighthouse = (() => {
	let _app: TemplatedApp

	const _allRequestHandler = () => {
		_app.get('/api/lighthouse', async (res, req) => {
			if (totalRequests >= limitRequest) {
				res.writeStatus('429 Too many requests').end('Too many requests', true)
				return
			}

			resetTotalRequestTimeout()
			totalRequests++

			res.onAborted(() => {
				res.writableEnded = true
				totalRequests = totalRequests > 0 ? totalRequests - 1 : 0
				Console.log('Request aborted')
			})

			// NOTE - Check and create base url
			if (!PROCESS_ENV.BASE_URL)
				PROCESS_ENV.BASE_URL = `${
					req.getHeader('x-forwarded-proto')
						? req.getHeader('x-forwarded-proto')
						: PROCESS_ENV.IS_SERVER
						? 'https'
						: 'http'
				}://${req.getHeader('host')}`

			const urlParam = req.getQuery('url')

			if (!urlParam) {
				res
					.writeHeader('Access-Control-Allow-Origin', '*')
					.writeStatus('400 `url` querystring params is required')
					.end('`url` querystring params is required') // end the request
				res.writableEnded = true // disable to write
			} else if (
				!/^(https?:\/\/)?(www.)?([a-zA-Z0-9_-]+\.[a-zA-Z]{2,6})(\.[a-zA-Z]{2,6})?(\/.*)?$/.test(
					urlParam as string
				)
			) {
				res
					.writeHeader('Access-Control-Allow-Origin', '*')
					.writeStatus(
						'400 `url` querystring params does not match the correct format'
					)
					.end(
						'`url` querystring params does not match the correct format',
						true
					)
				res.writableEnded = true // disable to write
			}

			if (!res.writableEnded) {
				const params = new URLSearchParams()
				params.append('urlTesting', urlParam as string)

				const requestUrl =
					((PROCESS_ENV.BASE_URL as string).includes('localhost')
						? TARGET_OPTIMAL_URL
						: PROCESS_ENV.BASE_URL) + `?${params.toString()}`

				const result = await fetchData(requestUrl, {
					method: 'GET',
					headers: {
						Accept: 'text/html; charset=utf-8',
						'User-Agent':
							'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/118.0.0.0 Safari/537.36',
					},
					timeout: 'infinite',
				})

				if (result.status !== 200) {
					if (!res.writableEnded) {
						totalRequests = totalRequests > 0 ? totalRequests - 1 : 0
						res.cork(() => {
							const statusMessage = result.message || 'Internal Server Error'
							res
								.writeHeader('Access-Control-Allow-Origin', '*') // Ensure header is sent in the final response
								.writeStatus(`${result.status} ${statusMessage}`)
								.end(statusMessage, true) // end the request
							res.writableEnded = true // disable to write
						})
					}
				}

				if (!res.writableEnded) {
					const lighthouseResult = await Promise.all<any>([
						new Promise((res) => {
							fetchData(
								`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${urlParam}&strategy=mobile&category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=SEO`,
								{
									timeout: 'infinite',
								}
							)
								.then((response) => {
									if (response.status === 200) {
										res(response.data.lighthouseResult)
									} else {
										res(undefined)
									}
								})
								.catch(() => res(undefined))
						}),
						new Promise((res) => {
							fetchData(
								`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${requestUrl}&strategy=mobile&category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=SEO`,
								{
									timeout: 'infinite',
								}
							)
								.then((response) => {
									if (response.status === 200) {
										res(response.data.lighthouseResult)
									} else {
										res(undefined)
									}
								})
								.catch(() => res(undefined))
						}),
						// { pageSpeedUrl: '' },
						// { pageSpeedUrl: '' },
						getPageSpeedUrl(urlParam as string),
						getPageSpeedUrl(requestUrl as string),
					])

					const lighthouseResponse = await (async () => {
						if (!lighthouseResult) return {}
						const tmpLighthouseResponse: ILighthouseResponse = {
							image: '',
							original: {
								pageSpeedUrl: lighthouseResult[2]?.pageSpeedUrl ?? '',
								info: [],
							},
							optimal: {
								pageSpeedUrl: lighthouseResult[3]?.pageSpeedUrl ?? '',
								info: [],
							},
						}

						await Promise.all([
							new Promise((res) => {
								if (lighthouseResult[0] && lighthouseResult[0].categories) {
									const categories: IPageSpeedCategories = Object.values(
										lighthouseResult[0].categories
									)

									for (const category of categories) {
										tmpLighthouseResponse.original.info.push({
											title: category.title,
											score: (category.score || 0) * 100,
										})
									}

									res(null)
								} else {
									res(null)
								}
							}),
							new Promise((res) => {
								if (lighthouseResult[1] && lighthouseResult[1].categories) {
									const categories: IPageSpeedCategories = Object.values(
										lighthouseResult[1].categories
									)

									for (const category of categories) {
										tmpLighthouseResponse.optimal.info.push({
											title: category.title,
											score: (category.score || 0) * 100,
										})
									}

									res(null)
								} else {
									res(null)
								}
							}),
						])

						return tmpLighthouseResponse
					})()

					totalRequests = totalRequests > 0 ? totalRequests - 1 : 0

					if (!res.writableEnded) {
						res.cork(() => {
							res
								.writeHeader('Access-Control-Allow-Origin', '*') // Ensure header is sent in the final response
								.writeStatus('200 OK')
								.end(JSON.stringify(lighthouseResponse)) // end the request
						})
						res.writableEnded = true // disable to write
					}
				}
			}
		})
	} // _allRequestHandler

	return {
		init(app: TemplatedApp) {
			if (!app) return Console.warn('You need provide app!')
			_app = app
			_allRequestHandler()
		},
	}
})()

export default apiLighthouse
