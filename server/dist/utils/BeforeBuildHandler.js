"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _fsextra = require('fs-extra'); var _fsextra2 = _interopRequireDefault(_fsextra);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);



var _viteprepareconfig = require('../../../config/vite.prepare.config');

// NOTE - Reset types
Promise.all([_viteprepareconfig.handleAutoImport.call(void 0, true), _viteprepareconfig.handleImportMetaENV.call(void 0, )])

// NOTE - Same list as RUNTIME_RESOURCES in config/utils/AutoDeploy.mjs
const KEEP_IN_RESOURCES = ['lightpanda']

// NOTE - Reset resource
if (
  !process.env.DEPLOY_STAGING_DIR &&
  _fsextra2.default.pathExistsSync(_path2.default.resolve(__dirname, '../../../dist'))
) {
  const distPath = _path2.default.resolve(__dirname, '../../../dist')
  const targetPath = _path2.default.resolve(__dirname, '../../resources')

  try {
    // NOTE - Empty it but keep the crawler's browser (no build makes it):
    // without it no page is rendered, so no ISR view nor skeleton is written
    _fsextra2.default.ensureDirSync(targetPath)
    for (const entry of _fsextra2.default.readdirSync(targetPath))
      if (!KEEP_IN_RESOURCES.includes(entry))
        _fsextra2.default.removeSync(_path2.default.join(targetPath, entry))
    _fsextra2.default.copySync(distPath, targetPath)
  } catch (err) {
    console.error(err)
  }
}
