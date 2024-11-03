import { brotliDecompressSync, gunzipSync } from 'zlib'
import Console from '../../../utils/ConsoleHandler'
import { getDataPath } from '../../../utils/PathHandler'
import { ICacheResult } from '../CacheManager/types'
import {
	get as getDataCache,
	set as setDataCache,
	updateStatus as updateDataCacheStatus,
} from '../CacheManager/utils'

const dataPath = getDataPath()

export const fetchData = async (
	input: RequestInfo | URL,
	init?:
		| (RequestInit & {
				timeout?: number | 'infinite'
		  })
		| undefined
): Promise<{
	status: number
	data: any
	cookies?: string[]
	message?: string
}> => {
	if (!input) {
		Console.error('URL is required!')
		return { status: 500, data: {}, message: 'URL is required' }
	}

	const response = await new Promise<{
		status: number
		data: any
		cookies?: string[]
		message?: string
	}>(async (rootResolve) => {
		const timeout = init?.timeout ?? 10000
		if (timeout !== 'infinite') {
			var responseTimeout: NodeJS.Timeout = setTimeout(() => {
				rootResolve({
					status: 408,
					message: 'Request Timeout',
					data: {},
				})
			}, timeout)
		}

		try {
			const response = await fetch(input, {
				...(init || {}),
			})
				.then(async (res) => {
					if (responseTimeout) clearTimeout(responseTimeout)
					const data = await new Promise(async (resolve) => {
						let tmpData
						const buffer = await res.clone().arrayBuffer()

						try {
							tmpData = brotliDecompressSync(buffer)?.toString()
						} catch {}

						if (!tmpData)
							try {
								tmpData = gunzipSync(buffer)?.toString()
							} catch {}

						if (!tmpData) {
							const text = await res.clone().text()

							try {
								tmpData = JSON.parse(text)
							} catch (error) {
								tmpData = {}
							}
						} else JSON.parse(tmpData)

						resolve(tmpData)
					})

					return {
						status: res.status,
						message: res.statusText,
						cookies: res.headers.getSetCookie(),
						data,
					}
				})
				.catch((err) => {
					if (responseTimeout) clearTimeout(responseTimeout)
					if (err.name !== 'AbortError') Console.error(err)
					return {
						status: 500,
						data: {},
						message: 'Server Error',
					}
				})

			rootResolve(response)
		} catch (error) {
			Console.error(error)
			rootResolve({ status: 500, data: {}, message: 'Server Error' })
		}
	})

	return response
} // fetchData

export const refreshData = async (cacheKeyList: string[]) => {
	if (!cacheKeyList || !cacheKeyList.length) return

	const arrRefreshData: (Promise<any> | undefined)[] = []

	for (const cacheKeyItem of cacheKeyList) {
		const apiCache = await getDataCache(dataPath, cacheKeyItem, 'br')

		if (!apiCache || !apiCache.cache || !apiCache.url) continue

		updateDataCacheStatus(dataPath, cacheKeyItem, 'br', 'fetch')

		arrRefreshData.push(
			new Promise(async (res) => {
				const headers = new Headers()
				for (const key in apiCache.headers) {
					headers.append(key, apiCache.headers[key])
				}

				await fetchData(apiCache.url as string, {
					method: apiCache.method,
					headers: apiCache.headers,
					body: apiCache.body,
				}).then((result) => {
					const cacheResult = apiCache.cache as Exclude<
						NonNullable<ICacheResult>['cache'],
						string | Buffer | undefined
					>
					const enableToSetCache =
						result.status === 200 || !cacheResult || cacheResult.status !== 200
					if (enableToSetCache) {
						setDataCache(dataPath, cacheKeyItem, 'br', {
							url: apiCache.url as string,
							method: apiCache.method as string,
							body: apiCache.body,
							headers: apiCache.headers,
							cache: {
								expiredTime: cacheResult.expiredTime,
								...result,
							},
						})

						res('finish')
					}
				})
			})
		)
	}

	if (arrRefreshData.length) await Promise.all(arrRefreshData)

	return 'finish'
} // refreshData
