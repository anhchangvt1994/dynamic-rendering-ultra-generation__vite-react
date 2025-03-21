export default (obj) => {
	if (!obj || typeof obj !== 'object') return

	let tmpENVContent = ''
	for (let key in obj) {
		tmpENVContent += key + '=' + (!obj[key] ? '' : obj[key] + '\n')
	}

	return tmpENVContent
}
