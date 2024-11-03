'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

const defaultServerConfig = {
	locale: {
		enable: false,
		hideDefaultLocale: true,
		routes: {},
	},
	isRemoteCrawler: false,
	crawl: {
		enable: true,
		limit: 3,
		speed: 3000,
		content: ['desktop', 'mobile'],
		cache: {
			enable: true,
			time: 4 * 3600, // 4 hours (second unit)
			renewTime: 3 * 60, // 3 minutes (second unit)
		},
		compress: true,
		optimize: ['script'],
		routes: {},
	},
	api: {
		list: {},
	},
}
exports.defaultServerConfig = defaultServerConfig
