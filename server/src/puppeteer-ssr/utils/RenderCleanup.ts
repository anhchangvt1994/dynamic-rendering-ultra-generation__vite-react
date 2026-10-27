import puppeteer, { Browser, CDPSession } from 'puppeteer-core'

// A Chromium target survives termination of the worker's CDP connection.
// Close it through an independent connection before returning its permit.
export const closeRenderTarget = async (
  browser: Browser,
  targetId?: string
) => {
  if (!targetId) {
    console.error(
      'Renderer failed without a target handle; restarting app worker for cleanup'
    )
    process.exit(1)
  }
  let session: CDPSession | undefined
  let recovery: Browser | undefined
  let connection: Browser | undefined
  let onDestroyed: ((target: any) => void) | undefined
  let timer: NodeJS.Timeout | undefined
  try {
    await Promise.race([
      (async () => {
        connection = browser.connected
          ? browser
          : (recovery = await puppeteer.connect({
              browserWSEndpoint: browser.wsEndpoint(),
              protocolTimeout: 3000,
            }))
        const destroyed = new Promise<void>((resolve) => {
          onDestroyed = (target) => {
            if (target._targetId === targetId) resolve()
          }
          connection!.on('targetdestroyed', onDestroyed)
        })
        session = await connection.target().createCDPSession()
        await session.send(
          'Target.closeTarget',
          { targetId },
          { timeout: 3000 }
        )
        if (
          connection
            .targets()
            .some((target) => (target as any)._targetId === targetId)
        )
          await destroyed
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Browser target cleanup timed out')),
          4000
        )
      }),
    ])
  } catch (error) {
    if (
      !/no.*target|target.*not found|target.*closed/i.test(
        String(error?.message)
      )
    ) {
      // Fail closed instead of admitting more renders while an unresponsive
      // target may still run. The acceptor supervises HTTP worker exits.
      console.error(
        'Unable to close renderer target; restarting app worker:',
        error.message
      )
      process.exit(1)
    }
  } finally {
    clearTimeout(timer)
    if (onDestroyed) connection?.off('targetdestroyed', onDestroyed)
    session?.detach().catch(() => {})
    recovery?.disconnect().catch(() => {})
  }
}
