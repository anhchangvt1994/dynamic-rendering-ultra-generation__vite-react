import path from 'path'
import { LaunchOptions } from 'puppeteer-core'
import { SERVER_LESS } from '../constants'
import { PROCESS_ENV } from '../utils/InitEnv'
import { getUserDataPath } from '../utils/PathHandler'

const userDataPath = getUserDataPath()

export const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
export const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
// NOTE - Browser Options
export const WINDOW_VIEWPORT_WIDTH = 1920
// export const WINDOW_VIEWPORT_HEIGHT = 2160
export const WINDOW_VIEWPORT_HEIGHT = 99999
export const optionArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  // `--window-size=${WINDOW_VIEWPORT_WIDTH},${WINDOW_VIEWPORT_HEIGHT}`,
  // `--ozone-override-screen-size=${WINDOW_VIEWPORT_WIDTH},${WINDOW_VIEWPORT_HEIGHT}`,
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
  //// '--chrome-flags',
  '--ignore-certificate-errors',
  '--ignore-certificate-errors-spki-list',
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
  //// '--use-gl=angle',
  //// '--use-angle=gl',
  //// '--enable-unsafe-webgpu',
  //// '--use-angle=disabled',
  //// "--shm-size=4gb",
  //// '--incognito',
  //// '--no-experiments',
  // '--disable-features=site-per-process',
  // '--disable-features=UsePasswordManager',
  '--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure,IsolateOrigins,site-per-process,BlockInsecurePrivateNetworkRequests,AudioServiceOutOfProcess,UsePasswordManager',
  '--disable-geolocation',
  '--disable-save-password-bubble',
  '--enable-automation',
]

export const defaultBrowserOptions: LaunchOptions = {
  headless: 'shell',
  // defaultViewport: {
  //   width: WINDOW_VIEWPORT_WIDTH,
  //   height: WINDOW_VIEWPORT_HEIGHT,
  // },
  userDataDir: `${userDataPath}/user_data`,
  args: optionArgs,
  protocolTimeout: 240000, // NOTE - Handle for error protocol timeout (can test adidas site to got detail of this issue)
  ignoreDefaultArgs: false,
  // ignoreHTTPSErrors: true,
}

// NOTE - Regex Handler
// Quoted values are indivisible: a ">" or markup inside an attribute is not
// a tag boundary. Avoid overlapping repeats such as (\s[^>]+)*.
const htmlTagAttributes = String.raw`[^"'<>]*(?:(?:"[^"]*"|'[^']*')[^"'<>]*)*`
const htmlTagBoundary = String.raw`(?=[\s/>])`
const htmlOpeningTag = String.raw`<[a-z][\w:-]*${htmlTagBoundary}${htmlTagAttributes}>`
const htmlQuotedMarkupTag = String.raw`<[a-z][\w:-]*${htmlTagBoundary}(?=${htmlTagAttributes}(?:"[^"]*<[^"]*"|'[^']*<[^']*'))${htmlTagAttributes}>`
const htmlDivTags = String.raw`(?:<\/?div${htmlTagBoundary}${htmlTagAttributes}>)+`
const htmlPairedTag = (tag: string) =>
  String.raw`<${tag}${htmlTagBoundary}${htmlTagAttributes}(?:\/>|>[\s\S]*?<\/${tag}\s*>)`

// Scan attributes in this opening tag only, skipping complete quoted values.
const htmlAttribute = (name: string, value: string, contains = false) => {
  const quoted = (quote: string) =>
    contains ? `[^${quote}]*\\b(?:${value})[^${quote}]*` : `(?:${value})`
  const unquoted = contains
    ? String.raw`[^\s"'=<>\x60]*\b(?:${value})[^\s"'=<>\x60]*`
    : `(?:${value})`
  return String.raw`\s${name}\s*=\s*(?:"${quoted('"')}"|'${quoted("'")}'|${unquoted}(?=[\s/>]))`
}
const hasHtmlAttribute = (name: string, value: string, contains = false) =>
  `${htmlTagAttributes}${htmlAttribute(name, value, contains)}`

const htmlStructuredData = hasHtmlAttribute(
  'type',
  String.raw`application/(?:ld\+json|xml|rdf\+xml)`
)
const htmlScript = String.raw`<script${htmlTagBoundary}(?!${htmlStructuredData})${htmlTagAttributes}(?:\/>|>[\s\S]*?<\/script\s*>)`
const htmlResourceLink = String.raw`<link${htmlTagBoundary}(?=${hasHtmlAttribute('rel', String.raw`(?:dns-prefetch|preconnect|modulepreload|preload|prefetch)\b`, true)})${htmlTagAttributes}>`
const htmlStyleLink = String.raw`<link${htmlTagBoundary}(?=${hasHtmlAttribute('rel', String.raw`(?:stylesheet|shortcut icon)\b`, true)}|${hasHtmlAttribute('href', '(?:css|style)', true)})${htmlTagAttributes}>`
const htmlScriptRemovals = [
  htmlScript,
  htmlResourceLink,
  htmlPairedTag('iframe'),
]
const htmlStyleRemovals = [htmlPairedTag('style'), htmlStyleLink]
const htmlBaseRemovals = [...htmlScriptRemovals, ...htmlStyleRemovals]

const htmlIconClass = String.raw`(?:fa-|material-icons\b|icon(?:-[\w-]+)?\b|ri-)`
const htmlIconAlt = String.raw`icon(?:-[\w-]+)?\b`
const htmlIconImageAlt = String.raw`<img${htmlTagBoundary}(?=${hasHtmlAttribute('alt', htmlIconAlt, true)})${htmlTagAttributes}>`
const htmlIconImageClass = String.raw`<img${htmlTagBoundary}(?=${hasHtmlAttribute('class', htmlIconClass, true)})${htmlTagAttributes}>`
const htmlIconElement = (tag: string) =>
  String.raw`<${tag}${htmlTagBoundary}(?=${hasHtmlAttribute('class', htmlIconClass, true)})${htmlTagAttributes}>[\s\S]*?<\/${tag}\s*>`
const htmlMedia = (tag: string) =>
  String.raw`<${tag}${htmlTagBoundary}(?!${hasHtmlAttribute('seo-tag', 'true')})${htmlTagAttributes}(?:\/>|>[\s\S]*?<\/${tag}\s*>)`
// Empty i tags have no text to preserve. Allow class-only variants too: class
// is removed by low/shallow optimization anyway. Keep aria/id/style attributes.
const htmlEmptyIcon = String.raw`<i(?:\s+class\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>\x60]+))*\s*(?:\/>|>\s*<\/i\s*>)`
const htmlBodyRemovals = [
  htmlEmptyIcon,
  htmlMedia('video'),
  htmlMedia('audio'),
  htmlPairedTag('form'),
  String.raw`<input${htmlTagBoundary}(?!${hasHtmlAttribute('type', '(?:button|submit)')})${htmlTagAttributes}>`,
  htmlPairedTag('textarea'),
  String.raw`<label${htmlTagBoundary}(?=${hasHtmlAttribute('for', String.raw`[^\s"'<>]+`)})${htmlTagAttributes}>`,
  htmlPairedTag('svg'),
  htmlIconElement('span'),
  htmlIconElement('i'),
  htmlIconImageClass,
  htmlIconImageAlt,
]

// Earlier alternatives consume raw text/comments before their contents can be
// mistaken for tags. Removal alternatives still take priority for each mode.
const htmlRawText = [
  String.raw`<!--[\s\S]*?-->`,
  ...['script', 'style', 'pre', 'code', 'textarea', 'title'].map(htmlPairedTag),
].join('|')
const htmlPreserved = `${htmlRawText}|${htmlQuotedMarkupTag}`
export const regexHasPreservedHtml = new RegExp(htmlPreserved, 'i')
export const regexHtmlTransformSegments = new RegExp(
  `(${htmlPreserved})|${htmlOpeningTag}`,
  'gi'
)
const htmlOptimizationRegex = (removals: string[], stripDiv = false) =>
  new RegExp(
    `(${removals.length ? removals.join('|') : '(?!)'})|(${htmlRawText})|(${stripDiv ? htmlDivTags : '(?!)'})|(${htmlOpeningTag})`,
    'gi'
  )

// Four capture groups: removed element, preserved content, div boundary, tag.
export const regexRemoveScriptTag = htmlOptimizationRegex(htmlScriptRemovals)
export const regexRemoveStyleTag = htmlOptimizationRegex(htmlStyleRemovals)
export const regexRemoveSpecialTag = htmlOptimizationRegex(htmlBaseRemovals)
export const regexLowOptimize = htmlOptimizationRegex([htmlEmptyIcon], true)
export const regexShallowOptimize = htmlOptimizationRegex(
  htmlBodyRemovals,
  true
)
export const regexFullOptimizeBody = htmlOptimizationRegex(
  [...htmlBaseRemovals, ...htmlBodyRemovals],
  true
)
// Cheap non-global probes avoid building a replacement string for documents
// which have no matching removals. False positives in raw text are harmless:
// the actual replacement pass still protects it.
export const regexHasScriptRemoval = new RegExp(
  htmlScriptRemovals.join('|'),
  'i'
)
export const regexHasStyleRemoval = new RegExp(
  [...htmlStyleRemovals, String.raw`\sstyle\s*=`].join('|'),
  'i'
)
export const regexHasShallowOptimization = new RegExp(
  [...htmlBodyRemovals, htmlDivTags, String.raw`\sclass\s*=`].join('|'),
  'i'
)
export const regexHasFullOptimization = new RegExp(
  [
    ...htmlBaseRemovals,
    ...htmlBodyRemovals,
    htmlDivTags,
    String.raw`\s(?:class|style)\s*=`,
  ].join('|'),
  'i'
)
export const regexHalfOptimizeBody = regexShallowOptimize
export const regexRemoveDivTag = new RegExp(htmlDivTags, 'gi')
export const regexRemoveIconTagFirst = new RegExp(htmlIconImageAlt, 'gi')
export const regexRemoveIconTagSecond = new RegExp(htmlIconImageClass, 'gi')

// Use only within an opening tag. The quoted alternatives protect values of
// other attributes (e.g. title=" class='literal'") from being edited.
const htmlRemovableAttrs = (names: string) =>
  new RegExp(
    String.raw`"[^"]*"|'[^']*'|\s+(?:${names})\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>\x60]+)`,
    'gi'
  )
export const regexRemoveClassAttrs = htmlRemovableAttrs('class')
export const regexRemoveStyleAttrs = htmlRemovableAttrs('style')
export const regexRemoveClassAndStyleAttrs = htmlRemovableAttrs('class|style')
export const regexHandleAttrsImageTag = new RegExp(
  String.raw`<(source|img)${htmlTagBoundary}(${htmlTagAttributes}?)\s*\/?>`,
  'gi'
)
export const regexHandleAttrsHtmlTag = new RegExp(
  String.raw`<(html)${htmlTagBoundary}(${htmlTagAttributes})>`,
  'gi'
)
export const regexHandleAttrsInteractiveTag = new RegExp(
  // input is void: pairing it with a later </a> would discard sibling content.
  String.raw`<(a|button)${htmlTagBoundary}(${htmlTagAttributes}?)(\/?)>([\s\S]*?)<\/(\1)\s*>`,
  'gi'
)
export const regexQueryStringSpecialInfo =
  /botInfo=(?<botInfo>[^&]*)&deviceInfo=(?<deviceInfo>[^&]*)&localeInfo=(?<localeInfo>[^&]*)&environmentInfo=(?<environmentInfo>[^&]*)/
export const regexQueryStringSpecialInfoWithoutDeviceInfo =
  /botInfo=(?<botInfo>[^&]*)&localeInfo=(?<localeInfo>[^&]*)&environmentInfo=(?<environmentInfo>[^&]*)/

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

// NOTE - Retry-After (seconds) of the 503 page sent while a page renders. A
// render takes a few seconds now (it was 120)
export const ISR_RETRY_AFTER_SECONDS = String(
  Number(PROCESS_ENV.ISR_RETRY_AFTER_SECONDS) || 10
)

export const chromiumPath = `https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.${
  process.arch === 'arm64' ? 'arm64' : 'x64'
}.tar`

export const canUseLinuxChromium =
  PROCESS_ENV.PLATFORM.toLowerCase() === 'linux' ||
  ['true', 'TRUE', '1'].includes(process.env.USE_CHROME_AWS_LAMBDA || '')

export const puppeteer = (() => {
  if (canUseLinuxChromium) return require('puppeteer-core')
  return require('puppeteer')
})()

// NOTE - Browser engine used to render pages for ISR/SSR/sitemap
// - chromium (default): headless Chromium launched by puppeteer
// - lightpanda: Lightpanda headless browser (no rendering engine, low memory),
//   puppeteer connects to it through CDP. Lighthouse always uses chromium.
export type TBrowserEngine = 'chromium' | 'lightpanda'

export const BROWSER_ENGINE: TBrowserEngine =
  String(PROCESS_ENV.BROWSER_ENGINE || '').toLowerCase() === 'lightpanda'
    ? 'lightpanda'
    : 'chromium'

// NOTE - Install with `npm run install:lightpanda`
export const lightpandaPath =
  (PROCESS_ENV.LIGHTPANDA_PATH as string) ||
  path.resolve(__dirname, '../../resources/lightpanda/lightpanda')

// NOTE - Re-render with chromium when lightpanda fails to render a page
export const LIGHTPANDA_FALLBACK_TO_CHROMIUM = ['true', 'TRUE', '1'].includes(
  String(PROCESS_ENV.LIGHTPANDA_FALLBACK_TO_CHROMIUM || '')
)

export const getWsEndpointFilePath = (engine: TBrowserEngine) =>
  engine === 'lightpanda'
    ? `${userDataPath}/wsEndpoint.lightpanda.txt`
    : `${userDataPath}/wsEndpoint.txt`

export const DISABLE_SSR_CACHE = Boolean(PROCESS_ENV.DISABLE_SSR_CACHE)
export const PM2_PROCESS_NAME = 'puppeteer-ssr'
