'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)
var _ConsoleHandler = require('../ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)

const setJsonData = (file, data) => {
  if (!file || !file.endsWith('.json') || !data) return

  const filePath = _path2.default.dirname(file)

  if (!_fs2.default.existsSync(filePath)) {
    _fs2.default.mkdirSync(filePath)
  }

  try {
    if (typeof data === 'string') {
      try {
        JSON.parse(data)
        _fs2.default.writeFileSync(file, data)
      } catch (err) {
        throw err
      }
    } else {
      try {
        const json = JSON.stringify(data)
        _fs2.default.writeFileSync(file, json)
      } catch (err) {
        throw err
      }
    }
  } catch (err) {
    _ConsoleHandler2.default.log(err.message)
  }
}
exports.setJsonData = setJsonData // setJsonData

const setTextData = (file, data) => {
  if (!file || !file.endsWith('.txt') || !data || typeof data !== 'string')
    return

  const filePath = _path2.default.dirname(file)

  if (!_fs2.default.existsSync(filePath)) {
    try {
      _fs2.default.mkdirSync(filePath)
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }
  }

  try {
    _fs2.default.writeFileSync(file, data)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }
}
exports.setTextData = setTextData // setTextData

const getJsonData = (file) => {
  if (!_fs2.default.existsSync(file)) return

  let result

  try {
    result = _fs2.default.readFileSync(file, 'utf8')
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}
exports.getJsonData = getJsonData // getJsonData

const getTextData = (file) => {
  if (!_fs2.default.existsSync(file)) return

  let result

  try {
    result = _fs2.default.readFileSync(file, 'utf8')
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}
exports.getTextData = getTextData // getTextData

const convertJsonToObject = (json) => {
  if (!json) return

  try {
    const result = JSON.parse(json)
    return result
  } catch (err) {
    _ConsoleHandler2.default.log(err.message)
    return json
  }
}
exports.convertJsonToObject = convertJsonToObject // convertJsonToObject
