export interface IServerConfigOptional {
	rootCache?: string
	isRemoteCrawler?: boolean

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
		preview?:
			| boolean
			| {
					content?: 'all' | Array<'desktop' | 'mobile'>
					time: number | 'infinite'
					renewTime: number | 'infinite'
			  }
		list?: {
			[key: string]: {
				pointsTo?:
					| string
					| {
							url: string
							content?: 'all' | Array<'desktop' | 'mobile'>
					  }
			} & Omit<NonNullable<IServerConfigOptional['routes']>, 'list' | 'custom'>
		}
		custom?: (url: string) =>
			| ({
					pointsTo?:
						| string
						| {
								url: string
								content?: 'all' | Array<'desktop' | 'mobile'>
						  }
					loader?: {
						enable?: boolean
						name: string
					}
			  } & Omit<
					NonNullable<IServerConfigOptional['routes']>,
					'list' | 'custom'
			  >)
			| undefined
			| void
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
	rootCache?: string
	isRemoteCrawler: boolean

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

	routes: {
		preview?: {
			content?: 'all' | Array<'desktop' | 'mobile'>
			time: number | 'infinite'
			renewTime: number | 'infinite'
		}
		list?: {
			[key: string]: {
				pointsTo?: {
					url: string
					content?: 'all' | Array<'desktop' | 'mobile'>
				}
			} & Omit<IServerConfig['routes'], 'list' | 'custom'>
		}
		custom?: (url: string) =>
			| ({
					pointsTo?: {
						url: string
						content?: 'all' | Array<'desktop' | 'mobile'>
					}
					loader?: {
						enable: boolean
						name: string
					}
			  } & Omit<IServerConfig['routes'], 'list' | 'custom'>)
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
