import { Browser, Page } from 'puppeteer-core'
import WorkerPool from 'workerpool'

export const createRenderPage = async (
  browser: Browser,
  engine = 'chromium'
): Promise<Page> => {
  // Lightpanda owns a browser per CDP connection; terminating that connection
  // disposes its targets. Chromium targets need an explicit ownership handle.
  if (engine === 'lightpanda') return browser.newPage()
  const session = await browser.target().createCDPSession()
  try {
    const { targetId } = await session.send('Target.createTarget', {
      url: 'about:blank',
    })
    // Announce ownership before Puppeteer initializes the Page. Initialization
    // itself can stall, so emitting after browser.newPage() is too late.
    WorkerPool.workerEmit({ name: 'page', value: targetId })
    const target = await browser.waitForTarget(
      (target) => (target as any)._targetId === targetId
    )
    const page = await target.page()
    if (!page) throw new Error('Render target did not initialize a page')
    return page
  } finally {
    await session.detach().catch(() => {})
  }
}
