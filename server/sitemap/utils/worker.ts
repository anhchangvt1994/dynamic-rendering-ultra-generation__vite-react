import WorkerPool from 'workerpool'
import { saveUrlToSitemap } from './utils'

WorkerPool.worker({
  saveUrlToSitemap,
  finish: () => {
    return 'finish'
  },
})
