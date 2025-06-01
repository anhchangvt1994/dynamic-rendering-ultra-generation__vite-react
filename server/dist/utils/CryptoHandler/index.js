"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _crypto = require('crypto'); var _crypto2 = _interopRequireDefault(_crypto);




var _constants = require('./constants');

// NOTE - https://www.tutorialspoint.com/encrypt-and-decrypt-data-in-nodejs

 const encryptCrawlerKeyCache = (
	text,
	options
) => {
	if (!text) return

	const { key, iv } = {
		..._constants.CRYPTO_CRAWLER_KEY_CACHE_OPTIONS_DEFAULT,
		...(options || {}),
	}

	const cipher = _crypto2.default.createCipheriv(
		_constants.CRYPTO_CRAWLER_KEY_CACHE_ALGORITHM,
		Buffer.from(key),
		iv
	)
	const encrypted = cipher.update(text)

	return Buffer.concat([encrypted, cipher.final()]).toString('hex')
}; exports.encryptCrawlerKeyCache = encryptCrawlerKeyCache // encryptCrawlerKeyCache

 const decryptCrawlerKeyCache = (
	encrypted,
	options
) => {
	if (!encrypted) return

	const { key, iv } = {
		..._constants.CRYPTO_CRAWLER_KEY_CACHE_OPTIONS_DEFAULT,
		...(options || {}),
	}

	const encryptedText = Buffer.from(encrypted, 'hex')
	const decipher = _crypto2.default.createDecipheriv(
		_constants.CRYPTO_CRAWLER_KEY_CACHE_ALGORITHM,
		Buffer.from(key),
		iv
	)
	const decrypted = decipher.update(encryptedText)

	return Buffer.concat([decrypted, decipher.final()]).toString()
}; exports.decryptCrawlerKeyCache = decryptCrawlerKeyCache // decryptCrawlerKeyCache
