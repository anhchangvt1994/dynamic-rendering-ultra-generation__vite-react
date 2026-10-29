import { FastifyInstance } from 'fastify'
import Console from '../../../utils/ConsoleHandler'
import { fetchData } from '../../utils/FetchManager'
import { TARGET_OPTIMAL_URL } from './constants'
import { ILighthouseResponse, IPageSpeedCategories } from './types'
import { runPageSpeed } from './worker'

const apiLighthouse = (() => {
	let _app: FastifyInstance

	const _allRequestHandler = () => {
		_app.all('/api/lighthouse', async function (req, res) {
			const urlParam = req.query?.['url']
			if (!urlParam) {
				res.raw.statusMessage = '`url` querystring params is required'
				return res.status(400).send('`url` querystring params is required')
			} else if (
				!/^(https?:\/\/)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(
					urlParam as string
				)
			) {
				res.raw.statusMessage =
					'`url` querystring params does not match the correct format'
				return res
					.status(400)
					.send('`url` querystring params does not match the correct format')
			}

			const params = new URLSearchParams()
			params.append('urlTesting', urlParam as string)

			const requestUrl =
				TARGET_OPTIMAL_URL.replace('http://', 'https://') +
				`?${params.toString()}`

			const result = await fetchData(requestUrl, {
				method: 'GET',
				headers: {
					Accept: 'text/html; charset=utf-8',
					'User-Agent':
						'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/118.0.0.0 Safari/537.36',
				},
			})

			if (result.status !== 200) {
				res.raw.statusMessage = result.message || 'Internal Server Error'
				return res.status(result.status).send(result.data)
			}

			const lighthouseResult = await Promise.all([
				runPageSpeed(
					`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${urlParam}&strategy=mobile&category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=SEO`
				),
				runPageSpeed(
					`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${requestUrl}&strategy=mobile&category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=SEO`
				),
			])

			const lighthouseResponse = await (async () => {
				if (!lighthouseResult) return {}
				const tmpLighthouseResponse: ILighthouseResponse = {
					// image:
					// 	lighthouseResult[0]?.lhr.fullPageScreenshot?.screenshot.data || '',
					image: '',
					original: {
						pageSpeedUrl: '',
						info: [],
					},
					optimal: {
						pageSpeedUrl: '',
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

			res.send(lighthouseResponse)
		})
	} // _allRequestHandler

	return {
		init(app: FastifyInstance) {
			if (!app) return Console.warn('You need provide express app!')
			_app = app
			_allRequestHandler()
		},
	}
})()

export default apiLighthouse
