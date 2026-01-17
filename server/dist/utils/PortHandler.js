"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _net = require('net'); var _net2 = _interopRequireDefault(_net);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);

const envPortPath = _path2.default.resolve(__dirname, '../../config/utils/PortHandler/.env')





const ObjectToEnvConverter = (obj) => {
	if (!obj || typeof obj !== 'object') return ''

	let tmpENVContent = ''
	for (let key in obj) {
		tmpENVContent += key + '=' + (!obj[key] ? '' : obj[key] + '\n')
	}

	return tmpENVContent
}

const readFileENVSync = () => {
	if (!_fs2.default.existsSync(envPortPath)) {
		return
	}

	const portInfoStringify = _fs2.default.readFileSync(envPortPath, {
		encoding: 'utf8',
		flag: 'r',
	})

	if (!portInfoStringify) return

	let portInfo = {}
	portInfoStringify.split('\n').forEach((line) => {
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

	portInfo[name] = String(port)

	new Promise(function (resolve) {
		try {
			_fs2.default.writeFileSync(envPortPath, ObjectToEnvConverter(portInfo))

			resolve()
		} catch (e) {}
	})
} // writeFileENVSync

const checkPort = (port) => {
	return new Promise((resolve) => {
		const server = _net2.default.createServer()
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



function getPort(name) {
	const portInfo = readFileENVSync()

	if (!portInfo || (name && !portInfo[name])) return

	return name ? Number(portInfo[name]) : portInfo
} // getPort

const setPort = (() => {
	return writeFileENVSync
})()

const releasePort = (port) => {
	return new Promise((resolve, reject) => {
		const server = _net2.default.createServer()
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

exports.findFreePort = findFreePort; exports.getPort = getPort; exports.releasePort = releasePort; exports.setPort = setPort;
