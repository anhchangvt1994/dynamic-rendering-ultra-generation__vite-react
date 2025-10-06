"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _StringHelper = require('../../../utils/StringHelper');


 function aliasMap(req) {
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
} exports.aliasMap = aliasMap; // aliasMap

 function deAliasMap(a) {
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
    ] ,
  }
} exports.deAliasMap = deAliasMap; // deAliasMap

 const encodeRequestInfo = (req, secret = '') => {
  const reqAlias = aliasMap(req)
  const json = JSON.stringify(reqAlias).replace(/https:\/\//g, 'hts:/')
  const result = _StringHelper.encode.call(void 0, json, secret)

  return result
}; exports.encodeRequestInfo = encodeRequestInfo // encodeRequestInfo

 const decodeRequestInfo = (input, secret = '') => {
  const json = _StringHelper.decode.call(void 0, input, secret).replace(/hts:\//g, 'https://')

  return deAliasMap(JSON.parse(json))
}; exports.decodeRequestInfo = decodeRequestInfo // decodeRequestInfo
