import { IRequestInfo } from './types'

export const DEFAULT_REQUEST_INFO: IRequestInfo = {
  endpoint: '',
  baseUrl: '',
  storeKey: '',
  cacheKey: '',
  expiredTime: 0,
  renewTime: 0,
  enableStore: false,
  relativeCacheKey: [],
}
