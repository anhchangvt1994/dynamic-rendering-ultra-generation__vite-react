"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _puppeteercore = require('puppeteer-core'); var _puppeteercore2 = _interopRequireDefault(_puppeteercore);

// A Chromium target survives termination of the worker's CDP connection.
// Close it through an independent connection before returning its permit.
 const closeRenderTarget = async (
  browser,
  targetId
) => {
  if (!targetId) {
    console.error(
      'Renderer failed without a target handle; restarting app worker for cleanup'
    )
    process.exit(1)
  }
  let session
  let recovery
  let connection
  let onDestroyed
  let timer
  try {
    await Promise.race([
      (async () => {
        connection = browser.connected
          ? browser
          : (recovery = await _puppeteercore2.default.connect({
              browserWSEndpoint: browser.wsEndpoint(),
              protocolTimeout: 3000,
            }))
        const destroyed = new Promise((resolve) => {
          onDestroyed = (target) => {
            if (target._targetId === targetId) resolve()
          }
          connection.on('targetdestroyed', onDestroyed)
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
            .some((target) => (target )._targetId === targetId)
        )
          await destroyed
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Browser target cleanup timed out')),
          4000
        )
      }),
    ])
  } catch (error) {
    if (
      !/no.*target|target.*not found|target.*closed/i.test(
        String(_optionalChain([error, 'optionalAccess', _2 => _2.message]))
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
    if (onDestroyed) _optionalChain([connection, 'optionalAccess', _3 => _3.off, 'call', _4 => _4('targetdestroyed', onDestroyed)])
    _optionalChain([session, 'optionalAccess', _5 => _5.detach, 'call', _6 => _6(), 'access', _7 => _7.catch, 'call', _8 => _8(() => {})])
    _optionalChain([recovery, 'optionalAccess', _9 => _9.disconnect, 'call', _10 => _10(), 'access', _11 => _11.catch, 'call', _12 => _12(() => {})])
  }
}; exports.closeRenderTarget = closeRenderTarget
