import fs from 'fs-extra'
import path from 'path'

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
