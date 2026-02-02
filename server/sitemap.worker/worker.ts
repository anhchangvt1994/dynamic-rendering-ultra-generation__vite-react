import { Page } from 'puppeteer'
import WorkerPool from 'workerpool'
import { puppeteer, regexNotFoundPageID } from '../src/puppeteer-ssr/constants'
import Console from '../src/utils/ConsoleHandler'

const _getSafePage = (page: Page) => {
  const SafePage = page

  return () => {
    if (SafePage && SafePage.isClosed()) return
    return SafePage
  }
} // _getSafePage

const waitResponse = (() => {
  return async (page: Page, url: string, duration: number) => {
    const waitUntil = 'domcontentloaded'

    // console.log(url.split('?')[0])
    let hasRedirected = false
    const safePage = _getSafePage(page)
    safePage()?.on('response', (response) => {
      const status = response.status()
      //[301, 302, 303, 307, 308]
      if (status >= 300 && status <= 399) {
        hasRedirected = true
      }
    })

    let response
    try {
      response = await new Promise(async (resolve, reject) => {
        let pendingRequests = 0

        const result = await new Promise<any>((resolveAfterPageLoad) => {
          safePage()
            ?.goto(url, {
              waitUntil,
              timeout: 30000,
            })
            .then((res) => resolveAfterPageLoad(res))
            .catch((err) => {
              reject(err)
            })
        })

        // console.log(`finish page load: `, url.split('?')[0])

        // WorkerPool.workerEmit('waitResponse_01')
        const waitForNavigate = (() => {
          let counter = 0
          return async () => {
            if (hasRedirected) {
              if (counter < 3) {
                counter++
                hasRedirected = false
                return new Promise(async (resolveAfterNavigate) => {
                  try {
                    await safePage()?.waitForSelector('body')
                    // await new Promise((resWaitForNavigate) =>
                    // 	setTimeout(resWaitForNavigate, 2000)
                    // )
                    const navigateResult = await waitForNavigate()

                    resolveAfterNavigate(navigateResult)
                  } catch (err) {
                    Console.error(err.message)
                    resolveAfterNavigate('fail')
                  }
                })
              } else {
                return 'fail'
              }
            } else return 'finish'
          }
        })()

        const navigateResult = await waitForNavigate()

        // console.log(`finish page navigate: `, url.split('?')[0])

        // WorkerPool.workerEmit('waitResponse_02')

        if (navigateResult === 'fail') return resolve(result)

        safePage()?.removeAllListeners('response')

        const html = (await safePage()?.content()) ?? ''

        if (regexNotFoundPageID.test(html)) return resolve(result)

        // console.log(`finish all page: `, url.split('?')[0])

        setTimeout(() => {
          resolve(pendingRequests > 3 ? { status: () => 503 } : result)
        }, 500)
      })
    } catch (err) {
      // console.log(err.message)
      // console.log('-------')
      throw err
    }

    return response
  }
})() // waitResponse

const crawlHandler = async (params) => {
  const { url, wsEndpoint } = params

  if (!url || !wsEndpoint) return

  let html = ''
  let status = 200
  let browser
  try {
    browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint })
  } catch (err) {
    Console.error('Failed to connect to browser:', err.message)
    return { status: 500 }
  }

  if (browser && browser.connected) {
    const page = await browser.newPage()
    const safePage = _getSafePage(page)
  }
} // crawlHandler

WorkerPool.worker({
  crawlHandler,
  finish: () => {
    return 'finish'
  },
})
