import fs from 'fs-extra'
import path from 'path'
import {
  handleAutoImport,
  handleImportMetaENV,
} from '../../../config/vite.prepare.config'

// NOTE - Reset types
Promise.all([handleAutoImport(true), handleImportMetaENV()])

// NOTE - Reset resource
if (fs.pathExistsSync(path.resolve(__dirname, '../../../dist'))) {
  const distPath = path.resolve(__dirname, '../../../dist')
  const targetPath = path.resolve(__dirname, '../../resources')

  try {
    fs.emptyDirSync(targetPath)
    fs.copySync(distPath, targetPath)
  } catch (err) {
    console.error(err)
  }
}
