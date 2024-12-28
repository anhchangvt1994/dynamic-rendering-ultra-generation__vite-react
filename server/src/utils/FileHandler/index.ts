import path from 'path'
import fs from 'fs'
import Console from '../ConsoleHandler'

export const setJsonData = (file: string, data: any) => {
	if (!file || !file.endsWith('.json') || !data) return

	const filePath = path.dirname(file)

	if (!fs.existsSync(filePath)) {
		fs.mkdirSync(filePath)
	}

	try {
		if (typeof data === 'string') {
			try {
				JSON.parse(data)
				fs.writeFileSync(file, data)
			} catch (err) {
				throw err
			}
		} else {
			try {
				const json = JSON.stringify(data)
				fs.writeFileSync(file, json)
			} catch (err) {
				throw err
			}
		}
	} catch (err) {
		Console.log(err.message)
	}
} // setJsonData

export const setTextData = (file: string, data: string) => {
	if (!file || !file.endsWith('.txt') || !data || typeof data !== 'string')
		return

	const filePath = path.dirname(file)

	if (!fs.existsSync(filePath)) {
		try {
			fs.mkdirSync(filePath)
		} catch (err) {
			Console.error(err)
		}
	}

	try {
		fs.writeFileSync(file, data)
	} catch (err) {
		Console.error(err)
	}
} // setTextData

export const getJsonData = (file: string) => {
	if (!fs.existsSync(file)) return

	let result

	try {
		result = fs.readFileSync(file, 'utf8')
	} catch (err) {
		Console.error(err)
	}

	return result
} // getJsonData

export const getTextData = (file: string) => {
	if (!fs.existsSync(file)) return

	let result

	try {
		result = fs.readFileSync(file, 'utf8')
	} catch (err) {
		Console.error(err)
	}

	return result
} // getTextData

export const convertJsonToObject = (json: string) => {
	if (!json) return

	try {
		const result = JSON.parse(json)
		return result
	} catch (err) {
		Console.log(err.message)
		return json
	}
} // convertJsonToObject
