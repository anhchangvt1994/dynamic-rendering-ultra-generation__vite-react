import crypto from 'crypto'
import fs from 'fs'
import { brotliCompressSync, brotliDecompressSync } from 'zlib'
import Console from '../../../utils/ConsoleHandler'
import { getDataPath, getStorePath } from '../../../utils/PathHandler'
import {
	ICacheResult,
	IFileInfo,
	IGetCacheOptionsParam,
	ISetCacheContent,
	ISetCacheOptionsParam,
	IStatus,
} from './types'

const dataPath = getDataPath()
const storePath = getStorePath()

if (!fs.existsSync(dataPath)) {
	fs.mkdirSync(dataPath)
}

if (!fs.existsSync(storePath)) {
	fs.mkdirSync(storePath)
}

export const regexKeyConverter =
	/^https?:\/\/(www\.)?|^www\.|botInfo=([^&]*)&deviceInfo=([^&]*)&localeInfo=([^&]*)&environmentInfo=([^&]*)/g

export const getKey = (url) => {
	if (!url) {
		Console.error('Need provide "url" param!')
		return
	}

	url = url
		.replace('/?', '?')
		.replace(regexKeyConverter, '')
		.replace(/\?(?:\&|)$/g, '')
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

export const getStatus = (
	directory: string,
	key: string,
	extension: 'json' | 'br'
) => {
	switch (true) {
		case fs.existsSync(`${directory}/${key}.${extension}`):
			return 'ready'
		case fs.existsSync(`${directory}/${key}.fetch.${extension}`):
			return 'fetch'
		default:
			return
	}
} // getStatus

export const updateStatus = (
	directory: string,
	key: string,
	extension: 'json' | 'br',
	newStatus: IStatus
) => {
	const status = getStatus(directory, key, extension)

	const file = `${directory}/${key}${
		!status || status === 'ready' ? '' : '.' + status
	}.${extension}`
	const newFile = `${directory}/${key}${
		!newStatus || newStatus === 'ready' ? '' : '.' + newStatus
	}.${extension}`

	if (file !== newFile) fs.rename(file, newFile, () => {})
} // updateStatus

export const get = async (
	directory: string,
	key: string,
	extension: 'json' | 'br',
	options?: IGetCacheOptionsParam
): Promise<ICacheResult> => {
	options = {
		autoCreateIfEmpty: {
			enable: false,
		},
		...(options || {}),
	}

	if (!directory) {
		Console.error('Need provide "directory" param!')
		return
	}

	if (!key) {
		Console.error('Need provide "key" param!')
		return
	}

	const status = getStatus(directory, key, extension)
	const file = `${directory}/${key}${
		!status || status === 'ready'
			? !options.autoCreateIfEmpty.status ||
			  options.autoCreateIfEmpty.status === 'ready'
				? ''
				: '.' + options.autoCreateIfEmpty.status
			: '.' + status
	}.${extension}`

	if (!status) {
		if (!options.autoCreateIfEmpty.enable) return

		Console.log(`Create file ${file}`)

		try {
			fs.writeFileSync(file, '')
			Console.log(`File ${key}.br has been created.`)

			const curTime = new Date()

			return {
				createdAt: curTime,
				updatedAt: curTime,
				requestedAt: curTime,
				status: status || options.autoCreateIfEmpty.status,
			}
		} catch (err) {
			Console.error(err)
			return
		}
	}

	await setRequestTimeInfo(file, new Date())
	const info = await getFileInfo(file)

	if (!info || info.size === 0) {
		const curTime = new Date()
		Console.log(`File ${file} is empty`)
		return {
			createdAt: info?.createdAt ?? curTime,
			updatedAt: info?.updatedAt ?? curTime,
			requestedAt: info?.requestedAt ?? curTime,
			status: status || options.autoCreateIfEmpty.status,
		}
	}

	Console.log(`File ${file} is ready!`)

	const content = (() => {
		let tmpContent: string | Buffer = fs.readFileSync(file)

		if (extension === 'br') {
			tmpContent = brotliDecompressSync(tmpContent).toString()
		} else tmpContent = tmpContent.toString('utf8')

		return JSON.parse(tmpContent as unknown as string)
	})()

	const objContent =
		!content || Array.isArray(content)
			? {
					data: content,
			  }
			: content

	return {
		createdAt: info.createdAt,
		updatedAt: info.updatedAt,
		requestedAt: info.requestedAt,
		status: status || options.autoCreateIfEmpty.status,
		...objContent,
	}
} // get

export const set = async (
	directory: string,
	key: string,
	extension: 'json' | 'br',
	content: string | Buffer | ISetCacheContent,
	options?: ISetCacheOptionsParam
): Promise<ICacheResult> => {
	if (!directory) {
		Console.error('Need provide "directory" param')
		return
	}

	if (!key) {
		Console.error('Need provide "key" param')
		return
	}

	options = {
		isCompress: true,
		status: 'ready',
		...(options ? options : {}),
	}

	const status = getStatus(directory, key, extension)
	const file = `${directory}/${key}${
		!status || status === 'ready' ? '' : '.' + status
	}.${extension}`

	// NOTE - If file is exist and isInit or not disable compress process, will be created new or updated
	const contentToSave = (() => {
		const contentToString =
			typeof content === 'string' || content instanceof Buffer
				? content
				: JSON.stringify(content)

		if (options.isCompress) {
			return Buffer.isBuffer(content)
				? content
				: brotliCompressSync(contentToString)
		}

		return contentToString
	})()

	try {
		fs.writeFileSync(file, contentToSave)
		const fileTarget = `${directory}/${key}${
			!options.status || options.status === 'ready' ? '' : '.' + options.status
		}.${extension}`

		if (file !== fileTarget) fs.renameSync(file, fileTarget)
		Console.log(`File ${file} was updated!`)
	} catch (err) {
		Console.error(err)
		return
	}

	const result =
		(await get(directory, key, extension, {
			autoCreateIfEmpty: {
				enable: false,
			},
		})) ||
		(() => {
			const curTime = new Date()
			return {
				createdAt: curTime,
				updatedAt: curTime,
				requestedAt: curTime,
				status: options.status,
				...(typeof content === 'string'
					? {
							cache: content,
					  }
					: content),
			}
		})()

	return result
} // set

export const remove = (
	directory: string,
	key: string,
	extension: 'json' | 'br'
) => {
	if (!directory) return Console.log('Key param can not empty!')
	if (!key) return Console.log('Key param can not empty!')

	const status = getStatus(directory, key, extension)
	const file = `${directory}/${key}${
		!status || status === 'ready' ? '' : '.' + status
	}.${extension}`

	if (!fs.existsSync(file)) return

	try {
		fs.unlinkSync(file)
	} catch (err) {
		Console.error(err)
	}
} // remove

export const getData = async (key: string, options?: IGetCacheOptionsParam) => {
	let result

	try {
		result = await get(dataPath, key, 'br', options)

		if (result && result.status === 200) {
			result.data = fs.readFileSync(result.response)
		}
	} catch (err) {
		Console.error(err)
	}

	return result
} // getData

export const getStore = async (
	key: string,
	options?: IGetCacheOptionsParam
) => {
	let result

	try {
		result = await get(storePath, key, 'json', options)

		if (result && result.status === 200) {
			const tmpData = fs.readFileSync(result.response) as unknown as string
			result.data = tmpData ? JSON.parse(tmpData) : tmpData
		}
	} catch (err) {
		Console.error(err)
	}

	return result
} // getStore

export const setData = async (
	key: string,
	content: string | Buffer | ISetCacheContent,
	options?: ISetCacheOptionsParam
) => {
	let result

	try {
		result = await set(dataPath, key, 'br', content, options)
	} catch (err) {
		Console.error(err)
	}

	return result
} // setData

export const setStore = async (key: string, content: any) => {
	let result

	try {
		result = await set(storePath, key, 'json', content, {
			isCompress: false,
		})
	} catch (err) {
		Console.error(err)
	}

	return result
} // setStore

export const removeData = async (key: string) => {
	let result

	try {
		result = await remove(dataPath, key, 'br')
	} catch (err) {
		Console.error(err)
	}

	return result
} // removeData

export const removeStore = async (key: string) => {
	let result

	try {
		result = await remove(storePath, key, 'json')
	} catch (err) {
		Console.error(err)
	}

	return result
} // removeStore

export const updateDataStatus = async (key: string, newStatus?: IStatus) => {
	try {
		updateStatus(dataPath, key, 'br', newStatus)
	} catch (err) {
		Console.error(err)
	}
} // updateDataStatus
