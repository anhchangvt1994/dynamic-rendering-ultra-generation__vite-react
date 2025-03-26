'use strict'
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}
var _fsextra = require('fs-extra')
var _fsextra2 = _interopRequireDefault(_fsextra)
var _path = require('path')
var _path2 = _interopRequireDefault(_path)

if (
  _fsextra2.default.pathExistsSync(
    _path2.default.resolve(__dirname, '../../../dist')
  )
) {
  const distPath = _path2.default.resolve(__dirname, '../../../dist')
  const targetPath = _path2.default.resolve(__dirname, '../../resources')

  try {
    _fsextra2.default.emptyDirSync(targetPath)
    _fsextra2.default.copySync(distPath, targetPath)
  } catch (err) {
    console.error(err)
  }
}
