import WorkerPool from 'workerpool'
import {
	getInternalHTML,
	getInternalScript,
	// compressInternalImage,
	// compressExternalImage,
} from './utils'

WorkerPool.worker({
	getInternalScript,
	getInternalHTML,
	// compressInternalImage,
	// compressExternalImage,
	finish: () => {
		return 'finish'
	},
})
