import { HttpRequest } from 'uWebSockets.js'
import {
  COUNTRY_CODE_DEFAULT,
  LANGUAGE_CODE_DEFAULT,
  LOCALE_LIST_WITH_COUNTRY,
  LOCALE_LIST_WITH_LANGUAGE,
} from '../constants'
import ServerConfig from '../server.config'
import { ILocaleInfo } from '../types'
import { getCookieFromRequest } from './CookieHandler.uws'

let geoip
;(async () => {
  if (
    ['true', 'TRUE', '1'].includes(process.env.DISABLE_DETECT_LOCALE as string)
  )
    return

  geoip = await import('geoip-lite')
})()

const LOCALE_INFO_DEFAULT: ILocaleInfo = {
  lang: LANGUAGE_CODE_DEFAULT,
  country: COUNTRY_CODE_DEFAULT,
  clientLang: LANGUAGE_CODE_DEFAULT,
  clientCountry: COUNTRY_CODE_DEFAULT,
  defaultLang: LANGUAGE_CODE_DEFAULT,
  defaultCountry: COUNTRY_CODE_DEFAULT,
  langSelected: LANGUAGE_CODE_DEFAULT,
  countrySelected: COUNTRY_CODE_DEFAULT,
  hideDefaultLocale: Boolean(ServerConfig.locale.hideDefaultLocale),
  range: [1984292864, 1984294911],
  region: 'SC',
  eu: '0',
  timezone: 'America/New_York',
  city: 'Charleston',
  ll: [32.7795, -79.9371],
  metro: 519,
  area: 1000,
}

export default function detectLocale(req: HttpRequest): ILocaleInfo {
  if (
    ['true', 'TRUE', '1'].includes(
      process.env.DISABLE_DETECT_LOCALE as string
    ) ||
    !geoip ||
    !req
  )
    return {
      ...LOCALE_INFO_DEFAULT,
      langSelected: ServerConfig.locale.enable
        ? LOCALE_INFO_DEFAULT.langSelected
        : '',
      countrySelected: ServerConfig.locale.enable
        ? LOCALE_INFO_DEFAULT.countrySelected
        : '',
    }

  const { lookup } = geoip
  const clientIp = (req.getHeader('x-forwarded-for') || '')
    .toString()
    .replace(/::ffff:|::1/, '')

  const localInfo = lookup(clientIp) || LOCALE_INFO_DEFAULT

  const acceptLanguage = req.getHeader('accept-language')
  let clientLang = LOCALE_INFO_DEFAULT.lang
  let clientCountry = LOCALE_INFO_DEFAULT.country

  if (acceptLanguage) {
    const acceptLanguageCommaSplitted = acceptLanguage
      .replace(/([0-9])\,/g, '$1|')
      .split('|')
    const maxIndex = acceptLanguageCommaSplitted.length - 1
    let favoriteAcceptLanguageIndex = maxIndex

    for (let i = maxIndex; i >= 0; i--) {
      if (!acceptLanguageCommaSplitted[i]) continue
      else if (acceptLanguageCommaSplitted[i].includes('q=')) {
        const acceptLanguageItemQualityValueSplitted =
          acceptLanguageCommaSplitted[i].split(';q=')
        const qualityValue = Number(acceptLanguageItemQualityValueSplitted[1])
        favoriteAcceptLanguageIndex = qualityValue >= 0.5 && i > 0 ? i - 1 : i

        if (favoriteAcceptLanguageIndex === i) break
      }
    }

    ;[clientLang, clientCountry] = (() => {
      let favoriteAcceptLanguage =
        acceptLanguageCommaSplitted[favoriteAcceptLanguageIndex]

      if (
        favoriteAcceptLanguage &&
        acceptLanguageCommaSplitted[favoriteAcceptLanguageIndex].includes(';q=')
      ) {
        const acceptLanguageItemQualityValueSplitted =
          acceptLanguageCommaSplitted[favoriteAcceptLanguageIndex].split(';q=')
        const qualityValue = Number(acceptLanguageItemQualityValueSplitted[1])

        const acceptLanguageSplitted =
          acceptLanguageItemQualityValueSplitted[0].split(',')

        if (qualityValue >= 0.5)
          favoriteAcceptLanguage = acceptLanguageSplitted[0]
        else favoriteAcceptLanguage = acceptLanguageSplitted[1]
      }

      // Safety check to ensure favoriteAcceptLanguage is defined
      if (!favoriteAcceptLanguage) {
        return [LOCALE_INFO_DEFAULT.lang, LOCALE_INFO_DEFAULT.country]
      }

      const favoriteAcceptLanguageSplitted = favoriteAcceptLanguage.split('-')

      return [
        favoriteAcceptLanguageSplitted[0],
        favoriteAcceptLanguageSplitted[1] || LOCALE_INFO_DEFAULT.country,
      ]
    })()
  }

  const defaultCountry = ServerConfig.locale.defaultCountry?.toUpperCase()
  const defaultLang = ServerConfig.locale.defaultLang
    ? ServerConfig.locale.defaultLang
    : !defaultCountry
      ? clientCountry
      : undefined

  const url = req.getUrl()
  const pathSplitted = url.split('/')
  const firstDispatcherParam = pathSplitted[1]

  let langSelected
  let countrySelected

  if (ServerConfig.locale.enable) {
    const cookies = getCookieFromRequest(req)
    const path = url

    if (
      ServerConfig.locale.routes &&
      ServerConfig.locale.routes[path] &&
      !ServerConfig.locale.routes[path].enable
    ) {
      if (cookies && (cookies['lang'] || cookies['country'])) {
        ;[langSelected, countrySelected] = [
          cookies['lang'] || defaultLang,
          cookies['country'] || defaultCountry,
        ]
      }
    } else {
      ;[langSelected, countrySelected] = _getArrLocaleSelected(
        firstDispatcherParam,
        {
          defaultLang,
          defaultCountry,
        },
        cookies
      )
    }
  }

  return {
    ...localInfo,
    defaultLang,
    defaultCountry,
    langSelected,
    countrySelected,
    clientCountry,
    clientLang,
  } as ILocaleInfo
}

const _getArrLocaleSelected = (
  firstDispatcherParam,
  params: {
    defaultLang: string | undefined
    defaultCountry: string | undefined
  },
  cookies?: { [key: string]: any }
) => {
  if (
    !firstDispatcherParam ||
    !/^[a-z-0-9]{2}(|-[A-Za-z]{2})(?:$)/.test(firstDispatcherParam)
  )
    return [
      params.defaultLang
        ? cookies && cookies['lang']
          ? cookies['lang']
          : params.defaultLang
        : undefined,
      params.defaultCountry
        ? cookies && cookies['country']
          ? cookies['country']
          : params.defaultCountry
        : undefined,
    ]

  const arrLocale = firstDispatcherParam.toLowerCase().split('-')

  const tmpArrLocale: (string | undefined)[] = [undefined, undefined]

  if (!params.defaultLang) tmpArrLocale[0] = undefined
  else if (!arrLocale[0])
    tmpArrLocale[0] =
      cookies && cookies['lang'] ? cookies['lang'] : params.defaultLang
  else if (LOCALE_LIST_WITH_LANGUAGE[arrLocale[0]])
    tmpArrLocale[0] = arrLocale[0]
  else if (LOCALE_LIST_WITH_COUNTRY[arrLocale[0]])
    tmpArrLocale[1] = arrLocale[0]
  else
    tmpArrLocale[0] =
      cookies && cookies['lang'] ? cookies['lang'] : params.defaultLang

  if (!params.defaultCountry) tmpArrLocale[1] = undefined
  else if (!arrLocale[1])
    tmpArrLocale[1] =
      cookies && cookies['country'] ? cookies['country'] : params.defaultCountry
  else if (LOCALE_LIST_WITH_LANGUAGE[arrLocale[1]])
    tmpArrLocale[0] = arrLocale[1]
  else if (LOCALE_LIST_WITH_COUNTRY[arrLocale[1]])
    tmpArrLocale[1] = arrLocale[1]
  else
    tmpArrLocale[1] =
      cookies && cookies['country'] ? cookies['country'] : params.defaultCountry

  return tmpArrLocale
} // _getArrLocaleSelected
