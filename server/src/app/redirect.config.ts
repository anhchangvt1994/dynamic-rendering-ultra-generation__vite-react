import ServerConfig from '../server.config'
import ValidateLocaleCode from './services/ValidateLocaleCode'

export interface IRedirectResult {
	originPath: string
	path: string
	search: string | undefined
	status: number
}
export interface IRedirectInfoItem {
	path: string
	targetPath: string
	statusCode: number
}

// NOTE - Declare redirects
export const REDIRECT_INFO: IRedirectInfoItem[] = [
	{
		path: '/test',
		targetPath: '/',
		statusCode: 302,
	},
]

// NOTE - Declare redirect middleware
export const REDIRECT_INJECTION = (
	redirectResult: IRedirectResult,
	req,
	res
): IRedirectResult => {
	// NOTE - Check Redirect for common case
	redirectResult.path = redirectResult.path.replace(/\/{2,}/, '/')

	// NOTE - Check redirect for locale case
	const enableLocale =
		ServerConfig.locale.enable &&
		Boolean(
			!ServerConfig.locale.routes ||
				!ServerConfig.locale.routes[redirectResult.originPath] ||
				ServerConfig.locale.routes[redirectResult.originPath].enable
		)

	if (enableLocale) {
		const localeCodeValidationResult = ValidateLocaleCode(redirectResult, res)

		if (localeCodeValidationResult.status !== 200) {
			redirectResult.status =
				redirectResult.status === 301
					? redirectResult.status
					: localeCodeValidationResult.status
			redirectResult.path = localeCodeValidationResult.path
		}
	}

	if (
		redirectResult.status === 200 &&
		redirectResult.path !== '' &&
		redirectResult.originPath !== redirectResult.path
	) {
		redirectResult.status = 301
	}

	return redirectResult
} // REDIRECT_INJECTION
