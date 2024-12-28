export function getCookie(cname) {
	let name = cname + '='
	let decodedCookie = decodeURIComponent(document.cookie)
	let ca = decodedCookie.split(';')
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i]
		while (c.charAt(0) == ' ') {
			c = c.substring(1)
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length)
		}
	}
	return ''
} // getCookie

export function setCookie(cname, cvalue, exdays?) {
	let d
	let expires

	if (exdays) {
		d = new Date()
		d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000)
		expires = 'expires=' + d.toUTCString()
	}

	document.cookie =
		cname + '=' + cvalue + (expires ? ';' + expires : '') + ';path=/'
} // setCookie

export function deleteCookie(cname) {
	// document.cookie = cname + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
} // deleteCookie
