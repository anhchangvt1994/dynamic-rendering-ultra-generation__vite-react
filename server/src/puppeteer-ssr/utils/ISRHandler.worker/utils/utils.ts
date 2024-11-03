import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
	getData as getDataCache,
	getStore as getStoreCache,
} from '../../../../api/utils/CacheManager/utils'
import Console from '../../../../utils/ConsoleHandler'
import { hashCode } from '../../../../utils/StringHelper'
import { IGetInternalHTMLParams, IGetInternalScriptParams } from './types'
// import sharp from 'sharp'

export const getInternalScript = async (
	params: IGetInternalScriptParams
): Promise<{ body: Buffer | string; status: number } | undefined> => {
	if (!params) {
		Console.error('Need provide `params`')
		return
	}

	if (!params.url) {
		Console.error('Need provide `params.url`')
		return
	}

	const urlSplitted = params.url.split('/')
	const file = urlSplitted[urlSplitted.length - 1].split('?')[0]
	const filePath = resolve(__dirname, `../../../../../../dist/${file}`)

	try {
		const body = readFileSync(filePath)

		return {
			body,
			status: 200,
		}
	} catch (err) {
		Console.error(err)
		return {
			body: 'File not found',
			status: 404,
		}
	}
} // getInternalScript

export const getInternalHTML = async (params: IGetInternalHTMLParams) => {
	if (!params) {
		Console.error('Need provide `params`')
		return
	}

	if (!params.url) {
		Console.error('Need provide `params.url`')
		return
	}

	try {
		const filePath = resolve(__dirname, '../../../../../../dist/index.html')

		const apiStoreData = await (async () => {
			let tmpStoreKey
			let tmpAPIStore

			tmpStoreKey = hashCode(params.url)

			tmpAPIStore = await getStoreCache(tmpStoreKey)

			return tmpAPIStore?.data
		})()

		const WindowAPIStore = {}

		if (apiStoreData) {
			if (apiStoreData.length) {
				for (const cacheKey of apiStoreData) {
					const apiCache = await getDataCache(cacheKey)
					if (!apiCache || !apiCache.cache || apiCache.cache.status !== 200)
						continue

					WindowAPIStore[cacheKey] = apiCache.cache.data
				}
			}
		}

		let html = readFileSync(filePath, 'utf8') || ''

		html = html.replace(
			'</head>',
			`<script>window.API_STORE = ${JSON.stringify({
				WindowAPIStore,
			})}</script></head>`
		)

		return {
			body: html,
			status: 200,
		}
	} catch (err) {
		Console.error(err)
		return {
			body: 'File not found',
			status: 404,
		}
	}
} // getInternalHTML

// export const compressInternalImage = async (image: string) => {
// 	if (!image) {
// 		Console.log('Need provide `image`!')
// 		return
// 	}

// 	let result
// 	let timeout

// 	try {
// 		result = await new Promise((res, rej) => {
// 			timeout = setTimeout(() => rej(new Error('Time out')), 300)

// 			sharp(image)
// 				.resize(200)
// 				.jpeg({ mozjpeg: true, quality: 1 })
// 				.toBuffer()
// 				.then((data) => {
// 					sharp(data)
// 						.toFormat('webp', { quality: 1 })
// 						.toBuffer()
// 						.then((data) => {
// 							res(data)
// 						})
// 					res(data)
// 				})
// 				.catch((err) => {
// 					rej(err)
// 				})
// 		})
// 	} catch (err) {
// 		throw new Error(err)
// 	}

// 	return result
// } // compressInternalImage

// export const compressExternalImage = async (image: string) => {
// 	if (!image) {
// 		Console.log('Need provide `image`!')
// 		return
// 	}

// 	let result
// 	let timeout

// 	try {
// 		result = await new Promise((res, rej) => {
// 			timeout = setTimeout(() => rej(new Error('Time out')), 300)

// 			fetch(image)
// 				.then(async (response) => {
// 					try {
// 						const imageArrBuffer = await response.arrayBuffer()

// 						sharp(imageArrBuffer)
// 							.resize(200)
// 							.jpeg({ mozjpeg: true, quality: 20 })
// 							.toBuffer()
// 							.then((data) => {
// 								sharp(data)
// 									.toFormat('webp')
// 									.toBuffer()
// 									.then((data) => {
// 										res(data)
// 									})
// 								res(data)
// 							})
// 							.catch((err) => {
// 								rej(err)
// 							})
// 					} catch (err) {
// 						rej(err)
// 					} finally {
// 						clearTimeout(timeout)
// 					}
// 				})
// 				.catch((err) => {
// 					rej(err)
// 				})
// 				.finally(() => {
// 					clearTimeout(timeout)
// 				})
// 		})
// 	} catch (err) {
// 		throw new Error(err)
// 	}

// 	return result
// } // compressExternalImage
