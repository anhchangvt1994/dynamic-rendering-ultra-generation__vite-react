import { IAliasMapRequestInfo, IRequestInfo } from './types'

export function aliasMap(req: IRequestInfo): IAliasMapRequestInfo {
  return {
    a: req.endpoint,
    b: req.baseUrl,
    c: req.storeKey,
    d: req.cacheKey,
    e: req.expiredTime,
    f: req.renewTime,
    g: req.enableStore ? 1 : 0,
    h: req.relativeCacheKey,
    i: { mobile: 1, desktop: 2, tablet: 3 }[req.storeInDevice],
  }
} // aliasMap

export function deAliasMap(a: IAliasMapRequestInfo): IRequestInfo {
  return {
    endpoint: a.a,
    baseUrl: a.b,
    storeKey: a.c,
    cacheKey: a.d,
    expiredTime: a.e,
    renewTime: a.f,
    enableStore: !!a.g,
    relativeCacheKey: a.h,
    storeInDevice: { 1: 'mobile', 2: 'desktop', 3: 'tablet' }[
      a.i
    ] as IRequestInfo['storeInDevice'],
  }
} // deAliasMap

export const encodeRequestInfo = (req: IRequestInfo, secret = ''): string => {
  const reqAlias = aliasMap(req)
  const json = JSON.stringify(reqAlias).replace(/https:\/\//g, 'hts:/')
  const result = encode(json, secret)

  return result
} // encodeRequestInfo

export const decodeRequestInfo = (input: string, secret = ''): IRequestInfo => {
  const json = decode(input, secret).replace(/hts:\//g, 'https://')

  return deAliasMap(JSON.parse(json))
} // decodeRequestInfo
