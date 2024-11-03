'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var _ServerConfigHandler = require('./utils/ServerConfigHandler')

const ServerConfig = _ServerConfigHandler.defineServerConfig.call(void 0, {
	crawl: {
		enable: true,
		optimize: 'deep',
		routes: {
			'/login': {
				enable: false,
			},
		},
	},
})

exports.default = ServerConfig
