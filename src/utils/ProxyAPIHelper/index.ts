import { IProxyAPIInitParams, IRequestInfo } from './types'
import { encodeRequestInfo } from './utils'

export const ProxyAPI = (() => {
  return {
    init: ({ targetBaseUrl }: IProxyAPIInitParams) => {
      if (!targetBaseUrl) {
        console.error('targetBaseUrl is required!')
        return
      }

      const _get = (
        endpoint: IRequestInfo['endpoint'],
        config?: Omit<IRequestInfo, 'endpoint' | 'baseUrl' | 'storeKey'>
      ) => {
        if (!endpoint) return ''

        config = {
          expiredTime: 0,
          renewTime: 0,
          cacheKey: endpoint,
          enableStore: false,
          relativeCacheKey: [],
          ...(config ? config : {}),
        }

        config.cacheKey = hashCode(config.cacheKey)

        if (config.relativeCacheKey.length) {
          config.relativeCacheKey = (() => {
            const arrRelativeCacheKey = []

            for (const cacheKeyItem of config.relativeCacheKey) {
              if (cacheKeyItem && cacheKeyItem !== config.cacheKey) {
                arrRelativeCacheKey.push(hashCode(cacheKeyItem))
              }
            }

            return arrRelativeCacheKey
          })()
        }

        const requestInfo: IRequestInfo = {
          endpoint,
          baseUrl: targetBaseUrl,
          storeKey: hashCode(
            `${location.pathname}${location.search}${
              config.storeInDevice
                ? location.search
                  ? '&device=' + config.storeInDevice
                  : '?device=' + config.storeInDevice
                : ''
            }`
          ),
          ...config,
        }

        console.log(requestInfo)

        return `/api?requestInfo=${encodeRequestInfo(requestInfo)}`
      } // _get

      return {
        targetBaseUrl,
        get: _get,
      }
    },
  }
})()
