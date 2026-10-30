import fs from 'fs-extra'
import path from 'path'
import {
  handleAutoImport,
  handleImportMetaENV,
} from '../../../config/vite.prepare.config'

// NOTE - Reset types
Promise.all([handleAutoImport(true), handleImportMetaENV()])

// NOTE - Same list as RUNTIME_RESOURCES in config/utils/AutoDeploy.mjs
const KEEP_IN_RESOURCES = ['lightpanda']

// NOTE - Reset resource
if (
  !process.env.DEPLOY_STAGING_DIR &&
  fs.pathExistsSync(path.resolve(__dirname, '../../../dist'))
) {
  const distPath = path.resolve(__dirname, '../../../dist')
  const targetPath = path.resolve(__dirname, '../../resources')

  try {
    // NOTE - Empty it but keep the crawler's browser (no build makes it):
    // without it no page is rendered, so no ISR view nor skeleton is written
    fs.ensureDirSync(targetPath)
    for (const entry of fs.readdirSync(targetPath))
      if (!KEEP_IN_RESOURCES.includes(entry))
        fs.removeSync(path.join(targetPath, entry))
    fs.copySync(distPath, targetPath)
  } catch (err) {
    console.error(err)
  }
}
