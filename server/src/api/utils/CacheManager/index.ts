import fs from 'fs'
import path from 'path'
import { resourceExtension } from '../../../constants'
import Console from '../../../utils/ConsoleHandler'
import { getDataPath, getStorePath } from '../../../utils/PathHandler'
import WorkerManager from '../../../utils/WorkerManager'
import {
	IGetCacheOptionsParam,
	ISetCacheContent,
	ISetCacheOptionsParam,
	IStatus,
} from './types'

const dataPath = getDataPath()
const storePath = getStorePath()

const workerManager = WorkerManager.init(
	path.resolve(__dirname, `./worker.${resourceExtension}`),
	{
		minWorkers: 1,
		maxWorkers: 2,
	},
	['get', 'set', 'remove', 'updateStatus']
)

export const getData = async (key: string, options?: IGetCacheOptionsParam) => {
	const freePool = await workerManager.getFreePool({
		delay: 150,
	})
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('get', [dataPath, key, 'br', options])

		if (result && result.status === 200) {
			result.data = fs.readFileSync(result.response)
		}
	} catch (err) {
		Console.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
} // getData

export const getStore = async (
	key: string,
	options?: IGetCacheOptionsParam
) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('get', [storePath, key, 'json', options])

		if (result && result.status === 200) {
			const tmpData = fs.readFileSync(result.response) as unknown as string
			result.data = tmpData ? JSON.parse(tmpData) : tmpData
		}
	} catch (err) {
		Console.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
} // getStore

export const setData = async (
	key: string,
	content: string | Buffer | ISetCacheContent,
	options?: ISetCacheOptionsParam
) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('set', [dataPath, key, 'br', content, options])
	} catch (err) {
		Console.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
} // setData

export const setStore = async (key: string, content: any) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('set', [
			storePath,
			key,
			'json',
			content,
			{
				isCompress: false,
			},
		])
	} catch (err) {
		Console.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
} // setStore

export const removeData = async (key: string) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('remove', [dataPath, key, 'br'])
	} catch (err) {
		Console.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
} // removeData

export const removeStore = async (key: string) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('remove', [storePath, key])
	} catch (err) {
		Console.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
} // removeStore

export const updateDataStatus = async (key: string, newStatus?: IStatus) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool

	try {
		pool.exec('updateStatus', [dataPath, key, 'br', newStatus])
	} catch (err) {
		Console.error(err)
	}

	freePool.terminate({
		force: true,
	})
} // updateDataStatus
