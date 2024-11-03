export interface IServerConfigOptional {
	rootCache?: string
	locale?: {
		enable: boolean
		defaultLang?: string | undefined
		defaultCountry?: string | undefined
		hideDefaultLocale?: boolean

		routes?: {
			[key: string]: Omit<
				NonNullable<IServerConfigOptional['locale']>,
				'enable' | 'routes' | 'custom'
			> & {
				enable?: boolean
			}
		}

		custom?: (url: string) =>
			| (Omit<
					NonNullable<IServerConfigOptional['locale']>,
					'enable' | 'routes' | 'custom'
			  > & {
					enable?: boolean
			  })
			| void
	}

	isRemoteCrawler?: boolean

	crawl?: {
		enable: boolean

		limit?: 2 | 3 | 4

		speed?: 3000 | 8000 | 15000

		content?: 'all' | Array<'desktop' | 'mobile'>

		optimize?: 'low' | 'shallow' | 'deep' | Array<'script' | 'style'>

		compress?: boolean

		cache?: {
			enable: boolean
			time?: number | 'infinite'
			renewTime?: number | 'infinite'
		}

		routes?: {
			[key: string]: Omit<
				NonNullable<IServerConfigOptional['crawl']>,
				'enable' | 'routes' | 'custom' | 'cache' | 'content' | 'limit'
			> & {
				enable?: boolean
				cache?: Omit<
					NonNullable<NonNullable<IServerConfigOptional['crawl']>['cache']>,
					'enable' | 'path'
				> & {
					enable?: boolean
				}
			}
		}

		custom?: (url: string) =>
			| (Omit<
					NonNullable<IServerConfigOptional['crawl']>,
					'enable' | 'routes' | 'custom' | 'cache' | 'content' | 'limit'
			  > & {
					enable?: boolean
					cache?: Omit<
						NonNullable<NonNullable<IServerConfigOptional['crawl']>>['cache'],
						'path'
					>
					onContentCrawled?: (payload: { html: string }) => string | void
			  })
			| undefined
	}
	routes?: {
		[key: string]: {
			pointsTo?: string
		}
	}
	crawler?: string
	crawlerSecretKey?: string

	api?: {
		list?: {
			[key: string]:
				| string
				| {
						secretKey: string
						headerSecretKeyName?: string
				  }
		}
	}
}

export interface IServerConfig extends IServerConfigOptional {
	locale: {
		enable: boolean
		defaultLang?: string | undefined
		defaultCountry?: string | undefined
		hideDefaultLocale?: boolean

		routes: {
			[key: string]: Omit<
				NonNullable<IServerConfig['locale']>,
				'routes' | 'custom'
			>
		}

		custom?: (url: string) =>
			| (Omit<
					NonNullable<IServerConfig['locale']>,
					'enable' | 'routes' | 'custom'
			  > & {
					enable?: boolean
			  })
			| undefined
	}

	isRemoteCrawler: boolean

	crawl: {
		enable: boolean

		limit: 2 | 3 | 4

		speed: 3000 | 8000 | 15000

		content: 'all' | Array<'desktop' | 'mobile'>

		optimize: 'low' | 'shallow' | 'deep' | Array<'script' | 'style'>

		compress: boolean

		cache: {
			enable: boolean
			time: number | 'infinite'
			renewTime: number | 'infinite'
		}

		routes: {
			[key: string]: Omit<
				IServerConfig['crawl'],
				'routes' | 'custom' | 'cache' | 'content' | 'limit'
			> & {
				cache: Omit<IServerConfig['crawl']['cache'], 'path'>
			}
		}

		custom?: (url: string) =>
			| (Omit<
					IServerConfig['crawl'],
					'routes' | 'custom' | 'cache' | 'content' | 'limit'
			  > & {
					cache: Omit<IServerConfig['crawl']['cache'], 'path'>
					onContentCrawled?: (payload: { html: string }) => string | void
			  })
			| undefined
	}

	api: {
		list: {
			[key: string]: {
				secretKey: string
				headerSecretKeyName: string
			}
		}
	}
}
