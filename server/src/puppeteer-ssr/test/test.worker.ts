import { resolve } from 'path'
import puppeteer from 'puppeteer'
import WorkerPool from 'workerpool'
import { resourceExtension } from '../../constants'

const _deleteUserDataDir = async (path: string) => {
  if (path) {
    try {
      await WorkerPool.pool(
        resolve(
          __dirname,
          `../utils/FollowResource.worker/index.${resourceExtension}`
        )
      )?.exec('deleteResource', [path])
    } catch (err) {
      console.error(err)
    }
  }
} // _deleteUserDataDir

const loadCapacityTest = async (url) => {
  const userDataDir = `server/dist/puppeteer-ssr/test/browsers/user_data_${Date.now()}`
  const browser = await puppeteer.launch({
    // ...defaultBrowserOptions,
    // headless: 'new',
    userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--headless',
      // '--disable-gpu',
      '--disable-software-rasterizer',
      '--hide-scrollbars',
      '--disable-translate',
      '--disable-extensions',
      '--disable-web-security',
      '--no-first-run',
      '--disable-notifications',
      // '--chrome-flags',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list ',
      '--disable-features=IsolateOrigins,SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure',
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
      // '--use-angle=gl-egl',
      '--user-agent=Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      // "--headless",
    ],
  })

  if (browser.isConnected()) {
    const page = await browser.newPage()
    console.log('start to crawl: ', url)
    const response = await page.goto(url)
    console.log('-------------')
    if (response?.status() === 200) {
      console.log('\x1b[32m', 'Success!')
      console.log('url :', url)
    } else {
      console.log('\x1b[31m', 'Fail!')
      console.log('url :', url)
    }
    console.log('-------------')
    await browser.close()
    _deleteUserDataDir(userDataDir)
  }
}

WorkerPool.worker({
  loadCapacityTest,
})
