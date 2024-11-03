import WorkerPool from 'workerpool'
import { get, remove, renew, rename, set, isExist, getStatus } from './utils'

WorkerPool.worker({
	get,
	set,
	renew,
	remove,
	rename,
	isExist,
	getStatus,
	finish: () => {
		return 'finish'
	},
})
