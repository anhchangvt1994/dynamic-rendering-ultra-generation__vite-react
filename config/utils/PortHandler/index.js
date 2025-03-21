import net from 'net'
import fs from 'fs'
import path from 'path'
import ObjectToEnvConverter from '../ObjectToEnvConverter'

const envPortPath = path.resolve(__dirname, './.env')

const readFileENVSync = () => {
	if (!fs.existsSync(envPortPath)) {
		return
	}

	const portInfoStringity = fs.readFileSync(envPortPath, {
		encoding: 'utf8',
		flag: 'r',
	})

	if (!portInfoStringity) return

	let portInfo = {}
	portInfoStringity.split('\n').forEach((line) => {
		const [name, value] = line.split('=')
		if (name && value) {
			portInfo[name] = value
		}
	})

	return portInfo
} // readFileENVSync

const writeFileENVSync = (port, name) => {
	if (!port || !name) return

	const portInfo = readFileENVSync() || {}

	portInfo[name] = port

	new Promise(function (resolve) {
		try {
			fs.writeFileSync(envPortPath, ObjectToEnvConverter(portInfo))

			resolve('done')
		} catch {}
	})
} // writeFileENVSync

const checkPort = (port) => {
	return new Promise((resolve) => {
		const server = net.createServer()
		server.unref()
		server.on('error', () => {
			resolve(false)
		})
		server.listen(port, () => {
			server.close(() => {
				resolve(true)
			})
		})
	})
} // checkPort

const findFreePort = async (port) => {
	let tmpPort = port
	while (true) {
		const isFree = await checkPort(tmpPort)
		if (isFree) {
			return tmpPort
		}
		tmpPort++
	}
} // findFreePort

const getPort = (name) => {
	const portInfo = readFileENVSync()

	if (!portInfo || (name && !portInfo[name])) return

	return name ? portInfo[name] : portInfo
} // getPort

const setPort = (() => {
	return writeFileENVSync
})()

const releasePort = (port) => {
	return new Promise((resolve, reject) => {
		const server = net.createServer()
		server.unref()
		server.on('error', (err) => {
			reject(err)
		})
		server.listen(port, () => {
			server.close(() => {
				resolve()
			})
		})
	})
}

export { findFreePort, releasePort, setPort, getPort }
