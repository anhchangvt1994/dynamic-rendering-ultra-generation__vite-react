import WorkerPool from 'workerpool'
import {
	compressContent,
	optimizeContent,
	scriptOptimizeContent,
	styleOptimizeContent,
	shallowOptimizeContent,
	deepOptimizeContent,
	lowOptimizeContent,
} from './utils'

WorkerPool.worker({
	compressContent,
	optimizeContent,
	shallowOptimizeContent,
	scriptOptimizeContent,
	styleOptimizeContent,
	deepOptimizeContent,
	lowOptimizeContent,
	finish: () => {
		return 'finish'
	},
})
