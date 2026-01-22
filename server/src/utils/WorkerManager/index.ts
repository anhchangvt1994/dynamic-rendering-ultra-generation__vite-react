import WorkerPool from 'workerpool'
import Pool from 'workerpool/src/Pool'
import Console from '../ConsoleHandler'
import { getTextData, setTextData } from '../FileHandler'
import { getWorkerManagerPath } from '../PathHandler'
const { workerData } = require('worker_threads')
const workerManagerPath = getWorkerManagerPath()

interface IInitOptions {
	minWorkers: number
	maxWorkers: number
	enableGlobalCounter?: boolean
	workerTerminateTimeout?: number
}

interface IGetFreePool {
	pool: Pool
	terminate: (options?: { force?: boolean; delay?: number }) => void
}

const workerOrder = workerData?.order || 0

const WorkerManager = (() => {
	const _createPoolWithRetry = async (
		workerPath: string,
		poolOptions: IInitOptions,
		maxRetries = 5,
		delayMs = 2000
	): Promise<Pool | null> => {
		// Add initial delay based on worker order to stagger pool creation
		const initialDelay = workerOrder * 500
		if (initialDelay > 0) {
			await new Promise((res) => setTimeout(res, initialDelay))
		}

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				return WorkerPool.pool(workerPath, poolOptions)
			} catch (err: any) {
				const isEAGAIN = err.code === 'EAGAIN' || err.message?.includes('EAGAIN')
				if (isEAGAIN) {
					const waitTime = delayMs * Math.pow(2, attempt) // Exponential backoff
					Console.log(`WorkerPool creation failed (attempt ${attempt + 1}/${maxRetries}): EAGAIN - waiting ${waitTime}ms before retry`)
					await new Promise((res) => setTimeout(res, waitTime))
				} else {
					Console.error('WorkerPool creation failed:', err)
					return null
				}
			}
		}
		Console.error(`WorkerPool creation failed after ${maxRetries} attempts`)
		return null
	}

	return {
		init: (
			workerPath: string,
			options?: IInitOptions,
			instanceTaskList?: string[]
		) => {
			const initOptions = {
				minWorkers: 1,
				maxWorkers: 1,
				enableGlobalCounter: false,
				workerTerminateTimeout: 0,
				...(options || {}),
			}

			let rootCounter = 0

			let curPool: Pool | null = null
			
			// Initialize pool asynchronously with retry
			const initPool = async () => {
				curPool = await _createPoolWithRetry(workerPath, initOptions)
				if (!curPool) {
					Console.error('Failed to create WorkerPool for:', workerPath)
					return
				}
				
				try {
					if (instanceTaskList && instanceTaskList.length) {
						const promiseTaskList: Promise<any>[] = []
						for (const task of instanceTaskList) {
							promiseTaskList.push(curPool.exec(task, []))
						}

						Promise.all(promiseTaskList).catch((err) => {
							Console.error('Instance task error:', err)
						})
					}
				} catch (err) {
					Console.error(err)
				}
			}
			
			// Start initialization
			initPool()

			let terminate: {
				run: IGetFreePool['terminate']
				cancel: () => void
			}

			const _getCounterIncreased = async () => {
				if (!initOptions.enableGlobalCounter) return rootCounter++

				let counter = await new Promise<number>((res) => {
					let tmpCounter: number
					setTimeout(
						() => {
							tmpCounter = Number(
								getTextData(`${workerManagerPath}/counter.txt`) || 0
							)
							tmpCounter++

							setTextData(
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

				let counter = await new Promise<number>((res) => {
					let tmpCounter: number
					setTimeout(
						() => {
							tmpCounter = Number(
								getTextData(`${workerManagerPath}/counter.txt`) || 0
							)
							tmpCounter = tmpCounter ? tmpCounter - 1 : 0

							setTextData(
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
				pool: Pool
			): {
				run: IGetFreePool['terminate']
				cancel: () => void
			} => {
				let timeout: NodeJS.Timeout
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
									const promiseTaskList: Promise<any>[] = []
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
								Console.error(err.message)
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

			const _getFreePool: (options?: {
				delay?: number
			}) => Promise<IGetFreePool | null> = (() => {
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
						Console.error('WorkerPool not initialized after waiting')
						return null
					}

					// Wait for terminate to be initialized
					waitAttempts = 0
					while (!terminate && waitAttempts < maxWaitAttempts) {
						await new Promise((res) => setTimeout(res, 200))
						waitAttempts++
					}

					if (!terminate) {
						Console.error('Terminate handler not initialized')
						return null
					}

					const counter = await _getCounterIncreased()

					if (options.delay) {
						const duration =
							(options.delay as number) * (counter ? counter - 1 : counter)

						await new Promise((res) => setTimeout(res, duration))

						terminate.cancel()
					} else {
						terminate?.cancel()
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

export default WorkerManager
