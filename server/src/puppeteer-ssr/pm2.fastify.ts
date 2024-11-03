import chokidar from 'chokidar'
import path from 'path'
import pm2 from 'pm2'
import { resourceExtension, resourceDirectory } from '../constants'
import Console from '../utils/ConsoleHandler'
import { PROCESS_ENV } from '../utils/InitEnv'
import { PM2_PROCESS_NAME } from './constants'

// const CLUSTER_INSTANCES =
// 	PROCESS_ENV.CLUSTER_INSTANCES === 'max'
// 		? 0
// 		: Number(PROCESS_ENV.CLUSTER_INSTANCES || 2)
const CLUSTER_INSTANCES = 1
const CLUSTER_KILL_TIMEOUT =
	PROCESS_ENV.CLUSTER_INSTANCES === 'max' ? 7000 : 2000

// connect to pm2 daemon
pm2.connect(false, (err) => {
	const selfProcess = process
	if (err) {
		Console.error(err)
		selfProcess.exit(2)
	}

	pm2.list(async function (err, processList) {
		if (err) {
			Console.error(err)
			process.exit(2)
		}

		const hasRestarted = await new Promise((resAfterCheckToRestart) => {
			const totalProcess = processList.length
			if (!totalProcess) resAfterCheckToRestart(false)

			let counter = 0
			for (const process of processList) {
				if (
					(process.name === 'start-puppeteer-ssr' ||
						process.name === PM2_PROCESS_NAME) &&
					process.pm_id !== undefined
				) {
					pm2.restart(process.pm_id, function (err) {
						counter++
						if (err) {
							console.error(err)
							selfProcess.exit(2)
						}

						if (counter === totalProcess) resAfterCheckToRestart(true)
					})
				} else {
					counter++
				}
			}
		})

		if (!hasRestarted) {
			pm2.start(
				{
					name: PM2_PROCESS_NAME,
					script: `server/${resourceDirectory}/index.fastify.${resourceExtension}`,
					instances: CLUSTER_INSTANCES,
					exec_mode: CLUSTER_INSTANCES === 1 ? 'fork' : 'cluster',
					interpreter:
						resourceExtension === 'ts' ? './node_modules/.bin/sucrase' : 'node',
					interpreter_args:
						resourceExtension === 'ts' ? '--require sucrase/register' : '',
					wait_ready: true,
					kill_timeout: CLUSTER_KILL_TIMEOUT,
					cwd: '.',
					env: {},
				},
				function (err, apps) {
					if (err) {
						Console.error(err)
						return
					}

					const watcher = chokidar.watch(
						[
							path.resolve(
								__dirname,
								`../../${resourceDirectory}/**/*.${resourceExtension}`
							),
							path.resolve(
								__dirname,
								`../../${resourceDirectory}/*.${resourceExtension}`
							),
						],
						{
							ignored: /$^/,
							persistent: true,
						}
					) // /$^/ is match nothing

					let timeout
					watcher.on('change', function (files) {
						if (timeout) clearTimeout(timeout)
						timeout = setTimeout(() => {
							pm2.reload(PM2_PROCESS_NAME, () => {})
						}, 100)
					})
				}
			)
		}
	})
})
