import path from 'path'
import { resourceExtension } from '../../src/constants'
import Console from '../../src/utils/ConsoleHandler'
import WorkerManager from '../../src/utils/WorkerManager'
import { ICrawlHandlerParams } from './types'
import { saveUrlToSitemap } from './utils'

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.${resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: 2,
  },
  ['crawlHandler']
)

export { saveUrlToSitemap }

export const crawlWorker = async (params: ICrawlHandlerParams) => {
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
    console.log('params.url', params.url)
    // Pass params without wsEndpoint since worker launches its own browser
    result = await pool.exec('crawlHandler', [{ url: params.url }])
  } catch (err) {
    Console.error(err)
    result = {
      data: [],
    }
  }

  freePool.terminate({
    force: true,
  })

  return result
}
