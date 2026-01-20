import path from 'path'
import { resourceExtension } from '../../../constants'
import Console from '../../../utils/ConsoleHandler'
import WorkerManager from '../../../utils/WorkerManager'

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.${resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: 3,
  },
  ['fetchData', 'refreshData']
)

export const fetchData = async (
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<{
  status: number
  data: any
  compressData: any
  cookies?: string[]
  message?: string
}> => {
  if (!input) {
    Console.error('input is required!')
    return {
      status: 500,
      data: {},
      compressData: {},
      message: 'input is required',
    }
  }

  const freePool = await workerManager.getFreePool()
  const pool = freePool.pool
  let result

  try {
    result = await pool.exec('fetchData', [input, init])
  } catch (err) {
    Console.error(err)
    result = { status: 500, data: {}, message: 'input is required' }
  }

  freePool.terminate({
    force: true,
  })

  return result
} // fetchData

export const refreshData = async (cacheKeyList: string[]) => {
  if (!cacheKeyList || !cacheKeyList.length) {
    Console.error('cacheKeyList is required!')
    return
  }

  const freePool = await workerManager.getFreePool()
  const pool = freePool.pool
  let result

  try {
    await pool.exec('refreshData', [cacheKeyList])
    result = 'finish'
  } catch (err) {
    Console.error(err)
  }

  freePool.terminate({
    force: true,
  })

  return result
} // refreshData
