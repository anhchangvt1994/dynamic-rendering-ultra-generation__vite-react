import fs from 'fs'
import { brotliCompressSync, brotliDecompressSync, gzipSync } from 'zlib'
import { CACHEABLE_STATUS_CODE, ISR_RETRY_AFTER_SECONDS } from '../constants'
import { ISSRResult } from '../types'
import Console from '../../utils/ConsoleHandler'
import { BROTLI_OPTIONS } from '../../constants'

export const handleResultAfterISRGenerator = (
	res,
	next,
	params: {
		result: ISSRResult
		enableContentEncoding: boolean
		contentEncoding: 'br' | 'gzip' | ''
	}
) => {
	if (!res || !next) return
	const { result, enableContentEncoding, contentEncoding } = params

	if (result) {
		/**
		 * NOTE
		 * calc by using:
		 * https://www.inchcalculator.com/convert/year-to-second/
		 */
		res.set({
			'Server-Timing': `Prerender;dur=50;desc="Headless render time (ms)"`,
			// 'Cache-Control': 'public, max-age: 31556952',
			'Cache-Control': 'no-store',
		})

		res.status(result.status)

		if (enableContentEncoding && result.status === 200) {
			res.set({
				'Content-Encoding': contentEncoding,
			})
		}

		if (result.status === 503) res.set('Retry-After', ISR_RETRY_AFTER_SECONDS)
	} else {
		next(new Error('504 Gateway Timeout'))
		return
	}

	if (
		(CACHEABLE_STATUS_CODE[result.status] || result.status === 503) &&
		result.response
	) {
		const body = (() => {
			let tmpBody: string | Buffer = ''

			if (enableContentEncoding) {
				tmpBody = result.html
					? contentEncoding === 'br'
						? brotliCompressSync(result.html, BROTLI_OPTIONS)
						: contentEncoding === 'gzip'
						? gzipSync(result.html)
						: result.html
					: (() => {
							let tmpContent: Buffer | string = ''

							try {
								tmpContent = fs.readFileSync(result.response)
							} catch (err) {
								Console.error(err)
							}

							if (contentEncoding === 'br') return tmpContent
							// NOTE - Only the cache files are brotli: decompressing the plain 503 page
							// threw, so a client without br (ex: gzip only) got a 504 instead of the 503
							else if (
								tmpContent &&
								Buffer.isBuffer(tmpContent) &&
								result.response.endsWith('.br')
							)
								tmpContent = brotliDecompressSync(tmpContent).toString()

							if (result.status === 200) {
								if (contentEncoding === 'gzip')
									tmpContent = gzipSync(tmpContent)
							}

							return tmpContent
					  })()
			} else if (result.response.indexOf('.br') !== -1) {
				let content

				try {
					content = fs.readFileSync(result.response)
				} catch (err) {
					Console.error(err)
				}

				if (content && Buffer.isBuffer(content))
					tmpBody = brotliDecompressSync(content).toString()
			} else {
				try {
					tmpBody = fs.readFileSync(result.response)
				} catch (err) {
					Console.error(err)
				}
			}

			return tmpBody
		})()

		res.send(body)
	}
	// Serve prerendered page as response.
	else {
		const body = (() => {
			let tmpBody
			if (enableContentEncoding) {
				try {
					tmpBody = result.html
						? contentEncoding === 'br'
							? brotliCompressSync(result.html, BROTLI_OPTIONS)
							: contentEncoding === 'gzip'
							? gzipSync(result.html)
							: result.html
						: fs.readFileSync(result.response)
				} catch (err) {
					Console.error(err)
				}
			}

			tmpBody = result.html || `${result.status} Error`

			return tmpBody
		})()
		res.status(result.status).send(body) // Serve prerendered page as response.
	}
} // handleResultAfterISRGenerator
