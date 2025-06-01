"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

const BOT_LIST = new Map([
	['google', /[Gg]ooglebot/],
	['yahoo', /[Yy]ahoo! [Ss]lurp/],
	['bing', /[Bb]ingbot/],
	['yandex', /[Yy]andex/],
	['baiduspider', /[Bb]aiduspider/],
	['facebook', /[Ff]acebookexternalhit/],
	['twitter', /[Tt]witterbot/],
	['roger', /[Rr]ogerbot/],
	['linkedin', /[Ll]inkedinbot/],
	['embedly', /[Ee]mbedly/],
	['quora', /[Qq]uora [Ll]ink [Pp]review/],
	['showyou', /[Ss]howyoubot/],
	['outbrain', /[Oo]utbrain/],
	['pinterest', /[Pp]interest\/0./],
	['developers.google.com', /developers.google.com\/\+\/web\/snippet/],
	['slack', /[Ss]lackbot/],
	['vkShare', /[Vv]kShare/],
	['w3c', /[Ww]3[Cc]_[Vv]alidator/],
	['reddit', /[Rr]edditbot/],
	['apple', /[Aa]pplebot/],
	['WhatsApp', /[Ww]hats[Aa]pp/],
	['flipboard', /[Ff]lipboard/],
	['tumblr', /[Tt]umblr/],
	['bitly', /[Bb]itlybot/],
	['skype', /[Ss]kype[Uu]ri[Pp]review/],
	['nuzzel', /[Nn]uzzel/],
	['discord', /[Dd]iscordbot/],
	['Google Page Speed', /[Gg]oogle [Pp]age [Ss]peed/],
	['qwantify', /[Qq]wantify/],
	['pinterest', /[Pp]interestbot/],
	['bitrix', /[Bb]itrix [Ll]ink [Pp]review/],
	['xing', /[XING|xing]-contenttabreceiver/],
	['chrome-lighthouse', /[Cc]hrome\-[Ll]ighthouse/],
	['lighthouse', /[Ll]ighthouse/],
	['telegram', /[Tt]elegram[Bb]ot/],
	['seznam', /[Ss]eznam[Bb]ot/],
]) // BOT_LIST

const detectBot = (req) => {
	const userAgent = (_optionalChain([req, 'access', _ => _.headers, 'optionalAccess', _2 => _2.get, 'call', _3 => _3('user-agent')]) || '') 
	const secCHUA = (_optionalChain([req, 'access', _4 => _4.headers, 'optionalAccess', _5 => _5.get, 'call', _6 => _6('sec-ch-ua')]) || '') 
	if (!userAgent && !secCHUA) {
		return {
			isBot: false,
			name: '',
		}
	}

	const tmpBotInfo = {
		isBot: false,
		name: '',
	}

	for (const [botName, botPattern] of BOT_LIST.entries()) {
		if (userAgent.match(botPattern) || secCHUA.match(botPattern)) {
			tmpBotInfo.isBot = true
			tmpBotInfo.name = botName || ''
			break
		}
	}

	return tmpBotInfo
}

exports. default = detectBot
