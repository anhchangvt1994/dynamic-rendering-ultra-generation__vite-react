import path from 'path'
import Console from '../../src/utils/ConsoleHandler'
import WorkerManager from '../../src/utils/WorkerManager'

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.ts`),
  {
    minWorkers: 1,
    maxWorkers: 2,
  },
  ['saveUrlToSitemap']
)

export const saveUrlToSitemapWorker = async (params: {
  file: string
  loc: string
  lastmod?: string
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority?: number
}) => {
  if (!params) {
    Console.error('Need provide `params`!')
    return
  }

  if (!params.loc) {
    Console.error('Need provide `loc`')
    return
  }

  const freePool = await workerManager.getFreePool()

  const pool = freePool.pool

  try {
    await pool.exec('saveUrlToSitemap', [params])
  } catch (err) {
    Console.error(err)
  }

  freePool.terminate({
    force: true,
  })
} // saveUrlToSitemapWorker
