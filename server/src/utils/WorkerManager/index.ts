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

			let curPool = WorkerPool.pool(workerPath, initOptions)

			let terminate: {
				run: IGetFreePool['terminate']
				cancel: () => void
			}

			try {
				if (instanceTaskList && instanceTaskList.length) {
					const promiseTaskList: Promise<any>[] = []
					for (const task of instanceTaskList) {
						promiseTaskList.push(curPool.exec(task, []))
					}

					Promise.all(promiseTaskList)
				}
			} catch (err) {
				Console.error(err)
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
							curPool = WorkerPool.pool(workerPath, initOptions)
							terminate = _getTerminate(curPool)

							try {
								if (instanceTaskList && instanceTaskList.length) {
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

			terminate = _getTerminate(curPool)

			const _getFreePool: (options?: {
				delay?: number
			}) => Promise<IGetFreePool> = (() => {
				return async (options) => {
					options = {
						delay: 0,
						...options,
					}

					const counter = await _getCounterIncreased()

					if (options.delay) {
						const duration =
							(options.delay as number) * (counter ? counter - 1 : counter)

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

export default WorkerManager
