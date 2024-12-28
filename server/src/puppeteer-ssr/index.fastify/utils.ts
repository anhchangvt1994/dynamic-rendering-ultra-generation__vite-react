import fs from 'fs'
import { brotliCompressSync, brotliDecompressSync, gzipSync } from 'zlib'
import { CACHEABLE_STATUS_CODE } from '../constants'
import { ISSRResult } from '../types'
import Console from '../../utils/ConsoleHandler'

export const handleResultAfterISRGenerator = (
	res,
	params: {
		result: ISSRResult
		enableContentEncoding: boolean
		contentEncoding: 'br' | 'gzip' | ''
	}
) => {
	if (!res) return
	const { result, enableContentEncoding, contentEncoding } = params

	if (result) {
		/**
		 * NOTE
		 * calc by using:
		 * https://www.inchcalculator.com/convert/year-to-second/
		 */
		res.raw.setHeader(
			'Server-Timing',
			`Prerender;dur=50;desc="Headless render time (ms)"`
		)
		res.raw.setHeader('Cache-Control', 'no-store')
		res.raw.statusCode = result.status
		if (enableContentEncoding && result.status === 200) {
			res.raw.setHeader('Content-Encoding', contentEncoding)
		}

		if (result.status === 503) res.header('Retry-After', '120')
	} else {
		return res.status(504).send('504 Gateway Timeout')
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
						? brotliCompressSync(result.html)
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
							else if (tmpContent && Buffer.isBuffer(tmpContent))
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

		return res.send(body)
	}
	// Serve prerendered page as response.
	else {
		const body = (() => {
			let tmpBody: string | Buffer = ''

			if (enableContentEncoding) {
				try {
					tmpBody = result.html
						? contentEncoding === 'br'
							? brotliCompressSync(result.html)
							: contentEncoding === 'gzip'
							? gzipSync(result.html)
							: result.html
						: fs.readFileSync(result.response)
				} catch (err) {
					Console.error(err)
				}
			} else if (result.response.indexOf('.br') !== -1) {
				let content

				try {
					content = fs.readFileSync(result.response)
				} catch (err) {
					Console.error(err)
				}

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
} // handleResultAfterISRGenerator
