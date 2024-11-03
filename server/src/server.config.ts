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
})

export default ServerConfig
