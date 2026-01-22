"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _workerpool = require('workerpool'); var _workerpool2 = _interopRequireDefault(_workerpool);

var _ConsoleHandler = require('../ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _FileHandler = require('../FileHandler');
var _PathHandler = require('../PathHandler');
const { workerData } = require('worker_threads')
const workerManagerPath = _PathHandler.getWorkerManagerPath.call(void 0, )













const workerOrder = _optionalChain([workerData, 'optionalAccess', _ => _.order]) || 0

const WorkerManager = (() => {
	const _createPoolWithRetry = async (
		workerPath,
		poolOptions,
		maxRetries = 5,
		delayMs = 2000
	) => {
		// Add initial delay based on worker order to stagger pool creation
		const initialDelay = workerOrder * 500
		if (initialDelay > 0) {
			await new Promise((res) => setTimeout(res, initialDelay))
		}

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				return _workerpool2.default.pool(workerPath, poolOptions)
			} catch (err) {
				const isEAGAIN = err.code === 'EAGAIN' || _optionalChain([err, 'access', _2 => _2.message, 'optionalAccess', _3 => _3.includes, 'call', _4 => _4('EAGAIN')])
				if (isEAGAIN) {
					const waitTime = delayMs * Math.pow(2, attempt) // Exponential backoff
					_ConsoleHandler2.default.log(`WorkerPool creation failed (attempt ${attempt + 1}/${maxRetries}): EAGAIN - waiting ${waitTime}ms before retry`)
					await new Promise((res) => setTimeout(res, waitTime))
				} else {
					_ConsoleHandler2.default.error('WorkerPool creation failed:', err)
					return null
				}
			}
		}
		_ConsoleHandler2.default.error(`WorkerPool creation failed after ${maxRetries} attempts`)
		return null
	}

	return {
		init: (
			workerPath,
			options,
			instanceTaskList
		) => {
			const initOptions = {
				minWorkers: 1,
				maxWorkers: 1,
				enableGlobalCounter: false,
				workerTerminateTimeout: 0,
				...(options || {}),
			}

			let rootCounter = 0

			let curPool = null
			
			// Initialize pool asynchronously with retry
			const initPool = async () => {
				curPool = await _createPoolWithRetry(workerPath, initOptions)
				if (!curPool) {
					_ConsoleHandler2.default.error('Failed to create WorkerPool for:', workerPath)
					return
				}
				
				try {
					if (instanceTaskList && instanceTaskList.length) {
						const promiseTaskList = []
						for (const task of instanceTaskList) {
							promiseTaskList.push(curPool.exec(task, []))
						}

						Promise.all(promiseTaskList).catch((err) => {
							_ConsoleHandler2.default.error('Instance task error:', err)
						})
					}
				} catch (err) {
					_ConsoleHandler2.default.error(err)
				}
			}
			
			// Start initialization
			initPool()

			let terminate




			const _getCounterIncreased = async () => {
				if (!initOptions.enableGlobalCounter) return rootCounter++

				let counter = await new Promise((res) => {
					let tmpCounter
					setTimeout(
						() => {
							tmpCounter = Number(
								_FileHandler.getTextData.call(void 0, `${workerManagerPath}/counter.txt`) || 0
							)
							tmpCounter++

							_FileHandler.setTextData.call(void 0, 
								`${workerManagerPath}/counter.txt`,
								tmpCounter.toString()
							)
							res(tmpCounter)
						},
						workerOrder > 1 ? workerOrder * 1000 : 0
					)
				})

				return counter
			} // _getCounterIncreased

			const _getCounterDecreased = async () => {
				if (!initOptions.enableGlobalCounter) return rootCounter--

				let counter = await new Promise((res) => {
					let tmpCounter
					setTimeout(
						() => {
							tmpCounter = Number(
								_FileHandler.getTextData.call(void 0, `${workerManagerPath}/counter.txt`) || 0
							)
							tmpCounter = tmpCounter ? tmpCounter - 1 : 0

							_FileHandler.setTextData.call(void 0, 
								`${workerManagerPath}/counter.txt`,
								tmpCounter.toString()
							)
							res(tmpCounter)
						},
						workerOrder > 1 ? workerOrder * 1000 : 0
					)
				})

				return counter
			} // _getCounterDecreased

			const _getTerminate = (
				pool
			


) => {
				let timeout
				return {
					run: (options) => {
						options = {
							force: false,
							delay: 10000,
							...options,
						}

						_getCounterDecreased()

						if (timeout) clearTimeout(timeout)
						timeout = setTimeout(async () => {
							const newPool = await _createPoolWithRetry(workerPath, initOptions)
							if (newPool) {
								curPool = newPool
								terminate = _getTerminate(curPool)
							}

							try {
								if (curPool && instanceTaskList && instanceTaskList.length) {
									const promiseTaskList = []
									for (const task of instanceTaskList) {
										promiseTaskList.push(curPool.exec(task, []))
									}

									await Promise.all(promiseTaskList)
								}

								let terminateWaitingCounter = 0

								const handleTerminate = (force = false) => {
									if (force || !pool.stats().activeTasks) {
										pool.terminate(options.force)
									} else {
										if (terminateWaitingCounter < 1) {
											timeout = setTimeout(handleTerminate, 5000)
											terminateWaitingCounter++
										} else {
											handleTerminate(true)
										}
									}
								}

								handleTerminate()
							} catch (err) {
								_ConsoleHandler2.default.error(err.message)
							}
						}, options.delay)
					},
					cancel: () => {
						if (timeout) clearTimeout(timeout)
					},
				}
			}

			// Initialize terminate after pool is ready (may be null initially)
			const initTerminate = () => {
				if (curPool) {
					terminate = _getTerminate(curPool)
				} else {
					// Retry later if pool not ready
					setTimeout(initTerminate, 500)
				}
			}
			setTimeout(initTerminate, 100)

			const _getFreePool

 = (() => {
				return async (options) => {
					options = {
						delay: 0,
						...options,
					}

					// Wait for pool to be initialized
					let waitAttempts = 0
					const maxWaitAttempts = 30 // 30 * 200ms = 6 seconds max wait
					while (!curPool && waitAttempts < maxWaitAttempts) {
						await new Promise((res) => setTimeout(res, 200))
						waitAttempts++
					}

					if (!curPool) {
						_ConsoleHandler2.default.error('WorkerPool not initialized after waiting')
						return null
					}

					// Wait for terminate to be initialized
					waitAttempts = 0
					while (!terminate && waitAttempts < maxWaitAttempts) {
						await new Promise((res) => setTimeout(res, 200))
						waitAttempts++
					}

					if (!terminate) {
						_ConsoleHandler2.default.error('Terminate handler not initialized')
						return null
					}

					const counter = await _getCounterIncreased()

					if (options.delay) {
						const duration =
							(options.delay ) * (counter ? counter - 1 : counter)

						await new Promise((res) => setTimeout(res, duration))

						terminate.cancel()
					} else {
						_optionalChain([terminate, 'optionalAccess', _5 => _5.cancel, 'call', _6 => _6()])
					}

					return {
						pool: curPool,
						terminate: terminate.run,
					}
				}
			})() // _getFreePool

			return {
				getFreePool: _getFreePool,
			}
		},
	}
})()

exports. default = WorkerManager
