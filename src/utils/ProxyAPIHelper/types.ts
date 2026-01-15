export interface IProxyAPIInitParams {
  targetBaseUrl: string
}

export interface IRequestInfo {
  endpoint: string
  baseUrl?: string
  storeKey?: string
  cacheKey?: string
  expiredTime?: number | 'infinite'
  renewTime?: number | 'infinite'
  enableStore?: boolean
  relativeCacheKey?: string[]
  storeInDevice?: 'mobile' | 'desktop' | 'tablet'
}

export interface IAliasMapRequestInfo {
  a: IRequestInfo['endpoint']
  b: IRequestInfo['baseUrl']
  c: IRequestInfo['storeKey']
  d: IRequestInfo['cacheKey']
  e: IRequestInfo['expiredTime']
  f: IRequestInfo['renewTime']
  g?: number
  h: IRequestInfo['relativeCacheKey']
  i: number
}
