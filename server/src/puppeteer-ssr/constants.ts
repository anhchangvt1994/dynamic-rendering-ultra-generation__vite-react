import { PuppeteerLaunchOptions } from 'puppeteer-core'
import { SERVER_LESS } from '../constants'
import { PROCESS_ENV } from '../utils/InitEnv'
import { getUserDataPath } from '../utils/PathHandler'

const userDataPath = getUserDataPath()

// NOTE - Browser Options
export const WINDOW_VIEWPORT_WIDTH = 1920
// export const WINDOW_VIEWPORT_HEIGHT = 2160
export const WINDOW_VIEWPORT_HEIGHT = 99999
export const optionArgs = [
	'--no-sandbox',
	'--disable-setuid-sandbox',
	`--window-size=${WINDOW_VIEWPORT_WIDTH},${WINDOW_VIEWPORT_HEIGHT}`,
	`--ozone-override-screen-size=${WINDOW_VIEWPORT_WIDTH},${WINDOW_VIEWPORT_HEIGHT}`,
	'--disable-gpu',
	'--disable-infobars',
	'--disable-software-rasterizer',
	'--hide-scrollbars',
	'--disable-translate',
	'--disable-extensions',
	'--disable-plugins',
	'--disable-web-security',
	'--no-first-run',
	'--disable-notifications',
	// '--chrome-flags',
	'--ignore-certificate-errors',
	'--ignore-certificate-errors-spki-list ',
	'--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure,IsolateOrigins,site-per-process,BlockInsecurePrivateNetworkRequests',
	'--disable-site-isolation-trials',
	'--no-zygote',
	'--disable-accelerated-2d-canvas',
	'--disable-speech-api', // 	Disables the Web Speech API (both speech recognition and synthesis)
	'--disable-background-networking', // Disable several subsystems which run network requests in the background. This is for use 									  // when doing network performance testing to avoid noise in the measurements. ↪
	'--disable-background-timer-throttling', // Disable task throttling of timer tasks from background pages. ↪
	'--disable-backgrounding-occluded-windows',
	'--disable-breakpad',
	'--disable-client-side-phishing-detection',
	'--disable-component-update',
	'--disable-default-apps',
	'--disable-dev-shm-usage',
	'--disable-domain-reliability',
	'--disable-features=AudioServiceOutOfProcess',
	'--disable-hang-monitor',
	'--disable-ipc-flooding-protection',
	'--disable-offer-store-unmasked-wallet-cards',
	'--disable-popup-blocking',
	'--disable-print-preview',
	'--disable-prompt-on-repost',
	'--disable-renderer-backgrounding',
	'--disable-sync',
	'--ignore-gpu-blacklist',
	'--metrics-recording-only',
	'--mute-audio',
	'--no-default-browser-check',
	'--no-pings',
	'--password-store=basic',
	'--use-gl=swiftshader',
	'--use-mock-keychain',
	// '--use-gl=angle',
	// '--use-angle=gl',
	// '--enable-unsafe-webgpu',
	// '--use-angle=disabled',
	// "--shm-size=4gb",
	// '--incognito',
	'--no-experiments',
	'--disable-features=site-per-process',
]

export const defaultBrowserOptions: PuppeteerLaunchOptions = {
	headless: 'shell',
	defaultViewport: {
		width: WINDOW_VIEWPORT_WIDTH,
		height: WINDOW_VIEWPORT_HEIGHT,
	},
	userDataDir: `${userDataPath}/user_data`,
	args: optionArgs,
	protocolTimeout: 240000, // NOTE - Handle for error protocol timeout (can test adidas site to got detail of this issue)
	ignoreDefaultArgs: false,
	// ignoreHTTPSErrors: true,
}

// NOTE - Regex Handler
export const regexRemoveScriptTag: RegExp =
	/(<script(?![\s\S]type="application\/(ld\+json|xml|rdf\+xml)")(\s[^>]+)*>(.|[\r\n])*?<\/script>|<script(?![\s\S]type="application\/(ld\+json|xml|rdf\+xml)")(\s[^>]+)*\/>)|(<link\s+(?=.*(rel=["']?(dns-prefetch|preconnect|modulepreload|preload|prefetch)["']?).*?(\/|)?)(?:.*?\/?>))|<iframe\s+(?:[^>]*?\s+)?((src|id)=["']?[^"]*\b((partytown|insider-worker)(?:-[a-z]+)?)\b[^"]*["']|\bvideo\b)?[^>]*>(?:[^<]*|<(?!\/iframe>))*<\/iframe>/g
export const regexRemoveStyleTag: RegExp =
	/(<style(\s[^>]+)*>(.|[\r\n])*?<\/style>|<style(\s[^>]+)*\/>|<link\s+(?=.*(rel=["']?(stylesheet|shortcut icon)["']?|href=["']?.*?(css|style).*?["']?).*?(\/|)?)(?:.*?\/?>)|style=(?:("|'|)([^"']+)("|'|\s)[^>\s]*))/g
// const regexRemoveDivTag =
// 	/<div(>|[\s\S](?!only-dev)[\s\S]*?(>))[\s\S]*?<\/div>(?:[\s\S]*?|$)/g
// export const regexRemoveDivTag: RegExp = /(<div(>|[\s\S]*?(>))|<\/div>)(?:[\s\S]*?|$)/g
export const regexLowOptimize: RegExp =
	/(<div(>|[\s\S]*?(>))|<\/div>)(?:[\s\S]*?|$)|class=(?:("|'|)([^"']+)("|'|\s)[^>\s]*)/g
export const regexShallowOptimize: RegExp =
	/<img\s+(?=.*alt=["']?.*?\b(icon(-\w*)*(?:-[a-z]+)?)\b.*?["']?.*?(\/|)?)(?:.*?\/?>)|<img\s+(?=.*class=["']?.*?\b(fa-|material-icons|icon(-\w*)|ri-).*?["']?.*?(\/|)?)(?:.*?\/?>)|<svg(\s[^>]+)*>(.|[\r\n])*?<\/svg>|<span\s+(?:[^>]*?\s+)?class=["']?[^"]*\b((fa-|material-icons|icon(-\w*)*|ri-)(?:-[a-z]+)?)\b[^"]*["']?[^>]*>(?:[^<]*|<(?!\/span>))*<\/span>|<i\s+(?:[^>]*?\s+)?class=["']?[^"]*\b((fa-|material-icons|icon(-\w*)*|ri-)(?:-[a-z]+)?)\b[^"]*["']?[^>]*>(?:[^<]*|<(?!\/i>))*<\/i>|<video(?![\s\S]*seo-tag=("|'|)true("|'|\s))(\s[^>]+)*>(.|[\r\n])*?<\/video>|<audio(?![\s\S]*seo-tag=("|'|)true("|'|\s))(\s[^>]+)*>(.|[\r\n])*?<\/audio>|<(video|audio)(?![\s\S]*seo-tag=("|'|)true("|'|\s))(\s[^>]+)*\/>|<form(\s[^>]+)*>(.|[\r\n])*?<\/form>|<input(?![^>]*\b(?:type=['"](?:button|submit)['"]|type=(?:button|submit)\b)[^>]*>)[^>]*>|<textarea(\s[^>]+)*\/>|<textarea(\s[^>]+)*>(.|[\r\n])*?<\/textarea>|<label\s+(?=.*(for=["']?.*?["']?).*?(\/|)?)(?:.*?\/?>)|(<div(>|[\s\S]*?(>))|<\/div>)(?:[\s\S]*?|$)/g

export const regexRemoveSpecialTag: RegExp =
	/(<link\s+(?=.*(rel=["']?(dns-prefetch|preconnect|modulepreload|preload|prefetch)["']?).*?(\/|)?)(?:.*?\/?>))|<iframe\s+(?:[^>]*?\s+)?((src|id)=["']?[^"]*\b((partytown|insider-worker)(?:-[a-z]+)?)\b[^"]*["']|\bvideo\b)?[^>]*>(?:[^<]*|<(?!\/iframe>))*<\/iframe>|(<style(\s[^>]+)*>(.|[\r\n])*?<\/style>|<style(\s[^>]+)*\/>|<link\s+(?=.*(rel=["']?(stylesheet|shortcut icon)["']?|href=["']?.*?(css|style).*?["']?).*?(\/|)?)(?:.*?\/?>))/g
export const regexFullOptimizeBody: RegExp =
	/<video(?![\s\S]*seo-tag=("|'|)true("|'|\s))(\s[^>]+)*>(.|[\r\n])*?<\/video>|<audio(?![\s\S]*seo-tag=("|'|)true("|'|\s))(\s[^>]+)*>(.|[\r\n])*?<\/audio>|<(video|audio)(?![\s\S]*seo-tag=("|'|)true("|'|\s))(\s[^>]+)*\/>|<form(\s[^>]+)*>(.|[\r\n])*?<\/form>|<input(?![^>]*\b(?:type=['"](?:button|submit)['"]|type=(?:button|submit)\b)[^>]*>)[^>]*>|<textarea(\s[^>]+)*\/>|<textarea(\s[^>]+)*>(.|[\r\n])*?<\/textarea>|<label\s+(?=.*(for=["']?.*?["']?).*?(\/|)?)(?:.*?\/?>)|<svg(\s[^>]+)*>(.|[\r\n])*?<\/svg>|<span\s+(?:[^>]*?\s+)?class=["']?[^"]*\b((fa-|material-icons|icon(-\w*)*|ri-)(?:-[a-z]+)?)\b[^"]*["']?[^>]*>(?:[^<]*|<(?!\/span>))*<\/span>|<i\s+(?:[^>]*?\s+)?class=["']?[^"]*\b((fa-|material-icons|icon(-\w*)*|ri-)(?:-[a-z]+)?)\b[^"]*["']?[^>]*>(?:[^<]*|<(?!\/i>))*<\/i>|<img\s+(?=.*class=["']?.*?\b(fa-|material-icons|icon(-\w*)|ri-).*?["']?.*?(\/|)?)(?:.*?\/?>)|<img\s+(?=.*alt=["']?.*?\b(icon(-\w*)*(?:-[a-z]+)?)\b.*?["']?.*?(\/|)?)(?:.*?\/?>)|style=(?:("|'|)([^"']+)("|'|\s)[^>\s]*)|class=(?:("|'|)([^"']+)("|'|\s)[^>\s]*)|(<div(>|[\s\S]*?(>))|<\/div>)(?:[\s\S]*?|$)/g
export const regexRemoveIconTagFirst: RegExp =
	/<img\s+(?=.*alt=["']?.*?\b(icon(-\w*)*(?:-[a-z]+)?)\b.*?["']?.*?(\/|)?)(?:.*?\/?>)/g
export const regexRemoveIconTagSecond: RegExp =
	/<img\s+(?=.*class=["']?.*?\b(fa-|material-icons|icon(-\w*)|ri-).*?["']?.*?(\/|)?)(?:.*?\/?>)/g
export const regexRemoveClassAndStyleAttrs: RegExp =
	/style=(?:("|'|)([^"']+)("|'|\s)[^>\s]*)|class=(?:("|'|)([^"']+)("|'|\s)[^>\s]*)/g
export const regexHandleAttrsImageTag: RegExp = /<(source|img)([^>]*)(\/|)>/g
export const regexHandleAttrsHtmlTag: RegExp = /<(html)([^>]*)>/g
export const regexHalfOptimizeBody: RegExp =
	/<video(?![\s\S]*seo-tag=("|'|)true("|'|\s))(\s[^>]+)*>(.|[\r\n])*?<\/video>|<audio(?![\s\S]*seo-tag=("|'|)true("|'|\s))(\s[^>]+)*>(.|[\r\n])*?<\/audio>|<(video|audio)(?![\s\S]*seo-tag=("|'|)true("|'|\s))(\s[^>]+)*\/>|<form(\s[^>]+)*>(.|[\r\n])*?<\/form>|<input(?![^>]*\b(?:type=['"](?:button|submit)['"]|type=(?:button|submit)\b)[^>]*>)[^>]*>|<textarea(\s[^>]+)*\/>|<textarea(\s[^>]+)*>(.|[\r\n])*?<\/textarea>|<label\s+(?=.*(for=["']?.*?["']?).*?(\/|)?)(?:.*?\/?>)|<svg(\s[^>]+)*>(.|[\r\n])*?<\/svg>|<span\s+(?:[^>]*?\s+)?class=["']?[^"]*\b((fa-|material-icons|icon(-\w*)*|ri-)(?:-[a-z]+)?)\b[^"]*["']?[^>]*>(?:[^<]*|<(?!\/span>))*<\/span>|<i\s+(?:[^>]*?\s+)?class=["']?[^"]*\b((fa-|material-icons|icon(-\w*)*|ri-)(?:-[a-z]+)?)\b[^"]*["']?[^>]*>(?:[^<]*|<(?!\/i>))*<\/i>|(<div(>|[\s\S]*?(>))|<\/div>)(?:[\s\S]*?|$)/g
// export const regexHandleAttrsInteractiveTag: RegExp =
// 	/<(a|button|input)(?![^>]*rel="nofollow")([^>]*)(\/|)>([\s\S]*?)<\/(a|button)>/g
export const regexHandleAttrsInteractiveTag: RegExp =
	/<(a|button|input)([^>]*)(\/|)>([\s\S]*?)<\/(a|button)>/g
export const regexQueryStringSpecialInfo =
	/botInfo=(?<botInfo>[^&]*)&deviceInfo=(?<deviceInfo>[^&]*)&localeInfo=(?<localeInfo>[^&]*)&environmentInfo=(?<environmentInfo>[^&]*)/

export const MAX_WORKERS = PROCESS_ENV.MAX_WORKERS
	? Number(PROCESS_ENV.MAX_WORKERS)
	: 7
export const DURATION_TIMEOUT = SERVER_LESS
	? 5000
	: PROCESS_ENV.DURATION_TIMEOUT
	? Number(PROCESS_ENV.DURATION_TIMEOUT)
	: 20000

export const DISABLE_COMPRESS_HTML = !!PROCESS_ENV.DISABLE_COMPRESS_HTML
export const DISABLE_DEEP_OPTIMIZE = !!PROCESS_ENV.DISABLE_DEEP_OPTIMIZE
export const DISABLE_OPTIMIZE = !!PROCESS_ENV.DISABLE_OPTIMIZE

export const NOT_FOUND_PAGE_ID = PROCESS_ENV.NOT_FOUND_PAGE_ID || '404-page'
export const regexNotFoundPageID = new RegExp(
	`id=["']?${NOT_FOUND_PAGE_ID}["']?`
)

export const CACHEABLE_STATUS_CODE = { 200: true, 302: true }

export const chromiumPath =
	'https://github.com/Sparticuz/chromium/releases/download/v130.0.0/chromium-v130.0.0-pack.tar'

export const canUseLinuxChromium =
	PROCESS_ENV.PLATFORM.toLowerCase() === 'linux' ||
	['true', 'TRUE', '1'].includes(process.env.USE_CHROME_AWS_LAMBDA || '')

export const puppeteer = (() => {
	if (canUseLinuxChromium) return require('puppeteer-core')
	return require('puppeteer')
})()

export const DISABLE_SSR_CACHE = Boolean(PROCESS_ENV.DISABLE_SSR_CACHE)
export const PM2_PROCESS_NAME = 'puppeteer-ssr'
