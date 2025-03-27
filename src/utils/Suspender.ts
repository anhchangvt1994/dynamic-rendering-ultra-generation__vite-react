export function Suspender() {
  let _reject: (err: any) => void
  let _resolve: (result: any) => void
  let _suspender
  let _result
  const _resetAfterFinally = (() => {
    let timeout = null
    return () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      timeout = setTimeout(() => {
        timeout = null
        _suspender = undefined
        _resolve = () => {}
        _reject = () => {}
      }, 5)
    }
  })() // _resetAfterFinally()

  const _reset = (() => {
    let timeout = null
    return () =>
      new Promise((res) => {
        if (timeout) {
          clearTimeout(timeout)
          timeout = null
        }
        timeout = setTimeout(() => {
          timeout = null
          _suspender = undefined
          _result = undefined
          _resolve = () => {}
          _reject = () => {}
          res(null)
        }, 5)
      })
  })() // _reset()

  const _start = (f?: () => void) => {
    if (!_suspender) {
      _result = undefined
      _suspender = new Promise((resolve, reject) => {
        _resolve = (data) => {
          resolve(data)
          _resetAfterFinally()
          _result = data
        }
        _reject = (err) => {
          reject(err)
          _result = err
        }

        f?.()
      })
    }
  } // _start()

  const _get = () => {
    if (_result) return _result
    if (_suspender) throw _suspender
    return
  } // _get()

  return {
    start: _start,
    reject: (err) => _reject?.(err),
    resolve: (result) => _resolve?.(result),
    get: _get,
    reset: _reset,
  }
} // Suspender
