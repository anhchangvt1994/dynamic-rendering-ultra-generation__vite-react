import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { brotliCompressSync } from 'zlib'
import Console from '../../../utils/ConsoleHandler'
import { ISSRResult } from '../../types'
import { getPagesPath } from '../../../utils/PathHandler'

const pagesPath = getPagesPath()

export interface ICacheSetParams {
	html: string
	url: string
	isRaw?: boolean
}

export type IFileInfo =
	| {
			size: number
			createdAt: Date
			updatedAt: Date
			requestedAt: Date
	  }
	| undefined

if (!fs.existsSync(pagesPath)) {
	try {
		fs.mkdirSync(pagesPath)
		fs.mkdirSync(`${pagesPath}/info`)
	} catch (err) {
		Console.error(err)
	}
}

// export const regexKeyConverter =
// 	/^https?:\/\/(www\.)?|^www\.|botInfo=([^&]*)&deviceInfo=([^&]*)&localeInfo=([^&]*)&environmentInfo=([^&]*)/g
export const regexKeyConverter =
	/www\.|botInfo=([^&]*)&deviceInfo=([^&]*)&localeInfo=([^&]*)&environmentInfo=([^&]*)/g
export const regexKeyConverterWithoutLocaleInfo =
	/www\.|botInfo=([^&]*)(?:\&)|localeInfo=([^&]*)(?:\&)|environmentInfo=([^&]*)/g

export const getKey = (url) => {
	if (!url) return

	url = url
		.replace('/?', '?')
		.replace(regexKeyConverterWithoutLocaleInfo, '')
		.replace(/,"os":"([^&]*)"/, '')
		.replace(/(\?|\&)$/, '')

	return crypto.createHash('md5').update(url).digest('hex')
} // getKey

export const getFileInfo = async (file: string): Promise<IFileInfo> => {
	if (!file) {
		Console.error('Need provide "file" param!')
		return
	}

	const result = await new Promise<IFileInfo>((res) => {
		fs.stat(file, (err, stats) => {
			if (err) {
				Console.error(err)
				res(undefined)
				return
			}

			res({
				size: stats.size,
				createdAt: stats.birthtime,
				updatedAt: stats.mtimeMs > stats.ctimeMs ? stats.mtime : stats.ctime,
				requestedAt: stats.atime,
			})
		})
	})

	return result
} // getFileInfo

export const setRequestTimeInfo = async (file: string, value: unknown) => {
	if (!file || !fs.existsSync(file)) {
		Console.error('File does not exist!')
		return
	}

	let stats
	try {
		stats = fs.statSync(file)
	} catch (err) {
		Console.error(err)
	}

	try {
		const info = await getFileInfo(file)
		Console.log('file info', info)
		const fd = fs.openSync(file, 'r')
		fs.futimesSync(
			fd,
			value as typeof stats.atime,
			info?.updatedAt ?? new Date()
		)
		fs.close(fd)
		Console.log('File access time updated.')
	} catch (err) {
		Console.error(err)
	}
} // setRequestTimeInfo

const maintainFile = path.resolve(__dirname, '../../../../maintain.html')

interface IGetCacheOptionsParam {
	autoCreateIfEmpty: boolean
}

export const get = async (
	url: string,
	options?: IGetCacheOptionsParam
): Promise<ISSRResult> => {
	options = options || {
		autoCreateIfEmpty: true,
	}

	if (!url) {
		Console.error('Need provide "url" param!')
		return
	}

	const key = getKey(url)

	let file = `${pagesPath}/${key}.br`
	let isRaw = false

	switch (true) {
		case fs.existsSync(file):
			break
		case fs.existsSync(`${pagesPath}/${key}.renew.br`):
			file = `${pagesPath}/${key}.renew.br`
			break
		default:
			file = `${pagesPath}/${key}.raw.br`
			isRaw = true
			break
	}

	if (!fs.existsSync(file)) {
		if (!options.autoCreateIfEmpty) return

		Console.log(`Create file ${file}`)

		try {
			await Promise.all([
				fs.writeFileSync(file, ''),
				fs.writeFileSync(
					`${pagesPath}/info/${key}.txt`,
					url
						.replace('/?', '?')
						.replace(regexKeyConverterWithoutLocaleInfo, '')
						.replace(/,"os":"([^&]*)"/, '')
						.replace(/(\?|\&)$/, '')
				),
			])
			Console.log(`File ${key}.br has been created.`)

			const curTime = new Date()

			return {
				file,
				response: maintainFile,
				status: 503,
				createdAt: curTime,
				updatedAt: curTime,
				requestedAt: curTime,
				ttRenderMs: 200,
				available: false,
				isInit: true,
				isRaw,
			}
		} catch (err) {
			if (err) {
				Console.error(err)
				return {
					ttRenderMs: 200,
					available: false,
					isInit: true,
				} as ISSRResult
			}
		}
	}

	await setRequestTimeInfo(file, new Date())
	const info = await getFileInfo(file)

	if (!info || info.size === 0) {
		const curTime = new Date()
		Console.log(`File ${file} chưa có thông tin`)
		return {
			file,
			response: maintainFile,
			status: 503,
			createdAt: info?.createdAt ?? curTime,
			updatedAt: info?.updatedAt ?? curTime,
			requestedAt: info?.requestedAt ?? curTime,
			ttRenderMs: 200,
			available: false,
			isInit:
				Date.now() - new Date(info?.createdAt ?? curTime).getTime() >= 53000,
			isRaw,
		}
	}

	Console.log(`File ${file} is ready!`)

	return {
		file,
		response: file,
		status: 200,
		createdAt: info.createdAt,
		updatedAt: info.updatedAt,
		requestedAt: info.requestedAt,
		ttRenderMs: 200,
		available: true,
		isInit: false,
		isRaw,
	}
} // get

export const set = async (
	{ html, url, isRaw }: ICacheSetParams = {
		html: '',
		url: '',
		isRaw: false,
	}
): Promise<ISSRResult> => {
	const key = getKey(url)

	if (!html) {
		Console.error('Need provide "html" param')
		return
	}

	const file = `${pagesPath}/${key}${isRaw ? '.raw' : ''}.br`

	if (!isRaw) {
		if (fs.existsSync(`${pagesPath}/${key}.renew.br`))
			try {
				fs.renameSync(`${pagesPath}/${key}.renew.br`, file)
			} catch (err) {
				Console.error(err)
			}
		else if (fs.existsSync(`${pagesPath}/${key}.raw.br`))
			try {
				fs.renameSync(`${pagesPath}/${key}.raw.br`, file)
			} catch (err) {
				Console.error(err)
			}
	}

	// NOTE - If file is exist and isRaw or not disable compress process, will be created new or updated
	if (fs.existsSync(file)) {
		const contentCompression = Buffer.isBuffer(html)
			? html
			: brotliCompressSync(html)

		try {
			fs.writeFileSync(file, contentCompression)
			Console.log(`File ${file} was updated!`)
		} catch (err) {
			Console.error(err)
		}
	}

	const result =
		(await get(url, {
			autoCreateIfEmpty: false,
		})) || ({ html, status: 200 } as ISSRResult)

	return result
} // set

export const renew = async (url) => {
	if (!url) return Console.log('Url can not empty!')
	const key = getKey(url)
	let hasRenew = true

	const file = `${pagesPath}/${key}.renew.br`

	if (!fs.existsSync(file)) {
		hasRenew = false
		const curFile = (() => {
			let tmpCurFile = `${pagesPath}/${key}.br`

			switch (true) {
				case fs.existsSync(tmpCurFile):
					break
				default:
					tmpCurFile = `${pagesPath}/${key}.raw.br`
			}

			return tmpCurFile
		})()

		try {
			fs.renameSync(curFile, file)
		} catch (err) {
			Console.error(err)
		}
	}

	return hasRenew
} // renew

export const remove = async (url: string) => {
	if (!url) return Console.log('Url can not empty!')
	const key = getKey(url)

	const curFile = (() => {
		switch (true) {
			case fs.existsSync(`${pagesPath}/${key}.raw.br`):
				return `${pagesPath}/${key}.raw.br`
			case fs.existsSync(`${pagesPath}/${key}.br`):
				return `${pagesPath}/${key}.br`
			case fs.existsSync(`${pagesPath}/${key}.renew.br`):
				return `${pagesPath}/${key}.renew.br`
			default:
				return
		}
	})()

	if (!curFile) return

	try {
		await Promise.all([
			fs.unlinkSync(curFile),
			fs.unlinkSync(`${pagesPath}/info/${key}.txt`),
		])
	} catch (err) {
		Console.error(err)
	}
} // remove

export const rename = (params: { url: string; type?: 'raw' | 'renew' }) => {
	if (!params || !params.url) {
		Console.log('Url can not empty!')
		return
	}

	const key = getKey(params.url)
	const file = `${pagesPath}/${key}${params.type ? '.' + params.type : ''}.br`

	if (!fs.existsSync(file)) {
		const curFile = (() => {
			switch (true) {
				case fs.existsSync(`${pagesPath}/${key}.raw.br`):
					return `${pagesPath}/${key}.raw.br`
				case fs.existsSync(`${pagesPath}/${key}.br`):
					return `${pagesPath}/${key}.br`
				case fs.existsSync(`${pagesPath}/${key}.renew.br`):
					return `${pagesPath}/${key}.renew.br`
				default:
					return
			}
		})()

		if (!curFile) return

		try {
			fs.renameSync(curFile, file)
		} catch (err) {
			Console.error(err)
		}
	}
} // rename

export const isExist = (url: string) => {
	if (!url) {
		Console.log('Url can not empty!')
		return false
	}

	const key = getKey(url)

	return (
		fs.existsSync(`${pagesPath}/${key}.raw.br`) ||
		fs.existsSync(`${pagesPath}/${key}.br`) ||
		fs.existsSync(`${pagesPath}/${key}.renew.br`)
	)
} // isExist

export const getStatus = (
	url: string
): ('raw' | 'renew' | 'ok') | undefined => {
	if (!url) {
		Console.log('Url can not empty!')
		return
	}

	const key = getKey(url)

	switch (true) {
		case fs.existsSync(`${pagesPath}/${key}.raw.br`):
			return 'raw'
		case fs.existsSync(`${pagesPath}/${key}.renew.br`):
			return 'renew'
		default:
			return 'ok'
	}
} // getStatus
