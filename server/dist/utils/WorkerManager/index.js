'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
function _optionalChain(ops) {
	let lastAccessLHS = undefined
	let value = ops[0]
	let i = 1
	while (i < ops.length) {
		const op = ops[i]
		const fn = ops[i + 1]
		i += 2
		if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
			return undefined
		}
		if (op === 'access' || op === 'optionalAccess') {
			lastAccessLHS = value
			value = fn(value)
		} else if (op === 'call' || op === 'optionalCall') {
			value = fn((...args) => value.call(lastAccessLHS, ...args))
			lastAccessLHS = undefined
		}
	}
	return value
}
var _workerpool = require('workerpool')
var _workerpool2 = _interopRequireDefault(_workerpool)

var _ConsoleHandler = require('../ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _FileHandler = require('../FileHandler')
var _PathHandler = require('../PathHandler')
const { workerData } = require('worker_threads')
const workerManagerPath = _PathHandler.getWorkerManagerPath.call(void 0)

const workerOrder =
	_optionalChain([workerData, 'optionalAccess', (_) => _.order]) || 0

const WorkerManager = (() => {
	return {
		init: (workerPath, options, instanceTaskList) => {
			const initOptions = {
				minWorkers: 1,
				maxWorkers: 1,
				enableGlobalCounter: false,
				workerTerminateTimeout: 0,
				...(options || {}),
			}

			let rootCounter = 0

			let curPool = _workerpool2.default.pool(workerPath, initOptions)

			let terminate

			try {
				if (instanceTaskList && instanceTaskList.length) {
					const promiseTaskList = []
					for (const task of instanceTaskList) {
						promiseTaskList.push(curPool.exec(task, []))
					}

					Promise.all(promiseTaskList)
				}
			} catch (err) {
				_ConsoleHandler2.default.error(err)
			}

			const _getCounterIncreased = async () => {
				if (!initOptions.enableGlobalCounter) return rootCounter++

				let counter = await new Promise((res) => {
					let tmpCounter
					setTimeout(
						() => {
							tmpCounter = Number(
								_FileHandler.getTextData.call(
									void 0,
									`${workerManagerPath}/counter.txt`
								) || 0
							)
							tmpCounter++

							_FileHandler.setTextData.call(
								void 0,
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
								_FileHandler.getTextData.call(
									void 0,
									`${workerManagerPath}/counter.txt`
								) || 0
							)
							tmpCounter = tmpCounter ? tmpCounter - 1 : 0

							_FileHandler.setTextData.call(
								void 0,
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

			const _getTerminate = (pool) => {
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
							curPool = _workerpool2.default.pool(workerPath, initOptions)
							terminate = _getTerminate(curPool)

							try {
								if (instanceTaskList && instanceTaskList.length) {
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

			terminate = _getTerminate(curPool)

			const _getFreePool = (() => {
				return async (options) => {
					options = {
						delay: 0,
						...options,
					}

					const counter = await _getCounterIncreased()

					if (options.delay) {
						const duration = options.delay * (counter ? counter - 1 : counter)

						await new Promise((res) => setTimeout(res, duration))

						terminate.cancel()
					} else {
						terminate.cancel()
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

exports.default = WorkerManager
