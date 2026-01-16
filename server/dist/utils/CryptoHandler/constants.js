"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _crypto = require('crypto'); var _crypto2 = _interopRequireDefault(_crypto);


 const CRYPTO_CRAWLER_KEY_CACHE_ALGORITHM = 'aes-128-cbc'; exports.CRYPTO_CRAWLER_KEY_CACHE_ALGORITHM = CRYPTO_CRAWLER_KEY_CACHE_ALGORITHM
 const CRYPTO_CRAWLER_KEY_CACHE_OPTIONS_DEFAULT =
	(() => {
		const hash = _crypto2.default
			.createHash('sha256')
			.update('puppeteer-ssr-key')
			.digest()

		const key = hash.toString('hex').slice(0, 16) // 32 bytes cho key
		const iv = hash.toString('hex').slice(16, 32) // 16 bytes cho iv
		return {
			key,
			iv,
		}
	})(); exports.CRYPTO_CRAWLER_KEY_CACHE_OPTIONS_DEFAULT = CRYPTO_CRAWLER_KEY_CACHE_OPTIONS_DEFAULT
