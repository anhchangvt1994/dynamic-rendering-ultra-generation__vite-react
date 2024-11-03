import path from 'path'
import { resourceExtension } from '../../../../constants'
import WorkerManager from '../../../../utils/WorkerManager'
import Console from '../../../../utils/ConsoleHandler'
import { IGetInternalHTMLParams, IGetInternalScriptParams } from './types'
import // compressInternalImage,
// compressExternalImage,
'./utils'

const workerManager = WorkerManager.init(
	path.resolve(__dirname, `./worker.${resourceExtension}`),
	{
		minWorkers: 1,
		maxWorkers: 2,
	},
	['getInternalScript', 'getInternalHTML']
)

export const getInternalScriptWorker = async (
	params: IGetInternalScriptParams
) => {
	if (!params) {
		Console.error('Need provide `params`!')
		return
	}

	if (!params.url) {
		Console.error('Need provide `params.url`!')
		return
	}

	const freePool = await workerManager.getFreePool()

	let result
	const pool = freePool.pool

	try {
		result = await pool.exec('getInternalScript', [params])
	} catch (err) {
		Console.error(err)
		result = {
			body: 'File not found!',
			status: 404,
		}
	}

	freePool.terminate({
		force: true,
		// delay: 30000,
	})

	return result
} // getInternalScript

export const getInternalHTMLWorker = async (params: IGetInternalHTMLParams) => {
	if (!params) {
		Console.error('Need provide `params`!')
		return
	}

	if (!params.url) {
		Console.error('Need provide `params.url`!')
		return
	}

	const freePool = await workerManager.getFreePool()

	let result
	const pool = freePool.pool

	try {
		result = await pool.exec('getInternalHTML', [params])
	} catch (err) {
		Console.error(err)
		result = {
			body: 'File not found!',
			status: 404,
		}
	}

	freePool.terminate({
		force: true,
		// delay: 30000,
	})

	return result
} // getInternalHTML

// export const compressInternalImageWorker = async (image: Buffer | string) => {
// 	if (!image) {
// 		Console.error('Need provide `image`!')
// 		return
// 	}

// 	const freePool = await workerManager.getFreePool()

// 	let result
// 	const pool = freePool.pool

// 	try {
// 		result = await pool.exec('compressInternalImage', [image])
// 	} catch (err) {
// 		throw new Error(err)
// 	}

// 	freePool.terminate({
// 		force: true,
// 		// delay: 30000,
// 	})

// 	return result
// } // compressInternalImageWorker

// export const compressExternalImageWorker = async (params: {
// 	image: string
// 	delay?: number
// }) => {
// 	if (!params.image) {
// 		Console.error('Need provide `image`!')
// 		return
// 	}

// 	params = {
// 		delay: 0,
// 		...params,
// 	}

// 	const freePool = await workerManager.getFreePool({
// 		delay: params.delay,
// 	})

// 	let result
// 	const pool = freePool.pool

// 	try {
// 		result = await pool.exec('compressExternalImage', [params.image])
// 	} catch (err) {
// 		throw new Error(err)
// 	}

// 	freePool.terminate({
// 		force: true,
// 		// delay: 30000,
// 	})

// 	return result
// } // compressExternalImageWorker
