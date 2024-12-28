import path from 'path'
import { resourceExtension } from '../../../../constants'
import WorkerManager from '../../../../utils/WorkerManager'
import Console from '../../../../utils/ConsoleHandler'
import { IGetInternalHTMLParams, IGetInternalScriptParams } from './types'

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
