"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _os = require('os'); var _os2 = _interopRequireDefault(_os);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _ConsoleHandler = require('../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);

// NOTE - Upstream API hosts that just timed out (ex: a down API answers after
// the 10s fetch timeout): while marked, the requests get a 503 at once instead
// of waiting for it again (a browser has 6 connections per host: a few
// requests waiting for a down API block the other API requests, a render
// waits for its pending requests).
// The mark lasts DOWN_HOST_DURATION, doubled on each failure in a row (the
// host is tried again when it ends) up to DOWN_HOST_MAX_DURATION, a success
// removes it.
// Marked with a file (content: failures in a row), shared by every render
// worker and server process
const DOWN_HOST_DURATION = 30000
const DOWN_HOST_MAX_DURATION = 5 * 60 * 1000
// NOTE - The file is checked at most once per CHECK_INTERVAL by a process
const CHECK_INTERVAL = 1000
const downHostsPath = _path2.default.join(_os2.default.tmpdir(), 'api-down-hosts')
const checks = new Map()

const _getDownHostFile = (host) =>
  _path2.default.join(downHostsPath, encodeURIComponent(host))

const _getDuration = (failures) =>
  Math.min(
    DOWN_HOST_DURATION * 2 ** Math.max(0, failures - 1),
    DOWN_HOST_MAX_DURATION
  )

 const isHostDown = (host) => {
  const now = Date.now()
  const check = checks.get(host)

  if (check && now - check.checkedAt < CHECK_INTERVAL) return check.isDown

  let isDown = false
  try {
    const file = _getDownHostFile(host)
    const failures = Number(_fs2.default.readFileSync(file, 'utf8')) || 1
    isDown = now - _fs2.default.statSync(file).mtimeMs < _getDuration(failures)
  } catch (e) {}

  checks.set(host, { checkedAt: now, isDown })

  return isDown
}; exports.isHostDown = isHostDown // isHostDown

 const setHostDown = (host, isDown) => {
  checks.set(host, { checkedAt: Date.now(), isDown })

  const file = _getDownHostFile(host)

  try {
    if (isDown) {
      let failures = 0
      try {
        failures = Number(_fs2.default.readFileSync(file, 'utf8')) || 0
      } catch (e2) {}

      _fs2.default.mkdirSync(downHostsPath, { recursive: true })
      _fs2.default.writeFileSync(file, String(failures + 1))
    } else if (_fs2.default.existsSync(file)) _fs2.default.rmSync(file, { force: true })
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }
}; exports.setHostDown = setHostDown // setHostDown

 const HOST_DOWN_RESULT = {
  status: 503,
  message: 'Service Unavailable',
  data: {},
  cookies: undefined,
}; exports.HOST_DOWN_RESULT = HOST_DOWN_RESULT
