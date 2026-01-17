import fs from 'fs'
import net from 'net'
import path from 'path'

const envPortPath = path.resolve(__dirname, '../../config/utils/PortHandler/.env')

interface PortInfo {
	[key: string]: string
}

const ObjectToEnvConverter = (obj: PortInfo): string => {
	if (!obj || typeof obj !== 'object') return ''

	let tmpENVContent = ''
	for (let key in obj) {
		tmpENVContent += key + '=' + (!obj[key] ? '' : obj[key] + '\n')
	}

	return tmpENVContent
}

const readFileENVSync = (): PortInfo | undefined => {
	if (!fs.existsSync(envPortPath)) {
		return
	}

	const portInfoStringify = fs.readFileSync(envPortPath, {
		encoding: 'utf8',
		flag: 'r',
	})

	if (!portInfoStringify) return

	let portInfo: PortInfo = {}
	portInfoStringify.split('\n').forEach((line) => {
		const [name, value] = line.split('=')
		if (name && value) {
			portInfo[name] = value
		}
	})

	return portInfo
} // readFileENVSync

const writeFileENVSync = (port: number, name: string): void => {
	if (!port || !name) return

	const portInfo = readFileENVSync() || {}

	portInfo[name] = String(port)

	new Promise<void>(function (resolve) {
		try {
			fs.writeFileSync(envPortPath, ObjectToEnvConverter(portInfo))

			resolve()
		} catch {}
	})
} // writeFileENVSync

const checkPort = (port: number): Promise<boolean> => {
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

const findFreePort = async (port: number): Promise<number> => {
	let tmpPort = port
	while (true) {
		const isFree = await checkPort(tmpPort)
		if (isFree) {
			return tmpPort
		}
		tmpPort++
	}
} // findFreePort

function getPort(name: string): number | undefined
function getPort(): PortInfo | undefined
function getPort(name?: string): number | PortInfo | undefined {
	const portInfo = readFileENVSync()

	if (!portInfo || (name && !portInfo[name])) return

	return name ? Number(portInfo[name]) : portInfo
} // getPort

const setPort = (() => {
	return writeFileENVSync
})()

const releasePort = (port: number): Promise<void> => {
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

export { findFreePort, getPort, releasePort, setPort }
