import fs from 'fs-extra'
import Console from '../ConsoleHandler'

export const deleteResource = (path: string) => {
	if (!path || !fs.existsSync(path)) {
		Console.log('Path can not empty!')
		return
	}

	try {
		fs.emptyDirSync(path)
		fs.remove(path)
	} catch (err) {
		Console.error(err)
	}
}
