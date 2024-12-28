import { defineServerConfig } from './utils/ServerConfigHandler'

const ServerConfig = defineServerConfig({
	crawl: {
		enable: true,
		optimize: 'deep',
		routes: {
			'/login': {
				enable: false,
			},
		},
	},
	routes: {
		preview: true,
		custom(url) {
			if (!url) return

			const urlInfo = new URL(url)
			const pathSlitted = urlInfo.pathname.trim().split('/')

			if (pathSlitted.length === 3 && pathSlitted[2]) {
				return {
					loader: {
						name: 'content-page-width-comment',
					},
				}
			}
			if (pathSlitted.length === 2 && pathSlitted[1]) {
				return {
					loader: {
						name: 'content-page',
					},
				}
			}
		},
	},
})

export default ServerConfig
