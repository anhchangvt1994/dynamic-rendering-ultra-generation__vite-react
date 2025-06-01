"use strict";Object.defineProperty(exports, "__esModule", {value: true});
var _constants = require('../constants');

























const Console = (() => {
	if (_constants.ENABLE_CONSOLE_DEBUGGER) return console
	const consoleFormatted = {}
	for (const key in console) {
		consoleFormatted[key] = () => {}
	}

	return consoleFormatted 
})()

exports. default = Console
