import WorkerPool from 'workerpool'
import {
  compressData,
  get,
  getStatus,
  remove,
  set,
  updateStatus,
} from './utils'

WorkerPool.worker({
  getStatus,
  updateStatus,
  get,
  set,
  remove,
  compressData,
  finish: () => {
    return 'finish'
  },
})
