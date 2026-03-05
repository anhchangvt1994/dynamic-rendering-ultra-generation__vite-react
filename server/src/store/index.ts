import LRUCache from 'lru-cache'
import { IStores } from './types'

export const BrowserStore: IStores['browser'] = {}
export const OutdateBrowser: IStores['outdateBrowser'] = new Set([])
export const HeadersStore: IStores['headers'] = {}
export const PromiseStore: IStores['promise'] = {}
export const APICacheStore: IStores['api']['cache'] = new Map()
export const APIStoreStore: IStores['api']['store'] = new Map()
export const APIStore: IStores['api'] = {
  cache: APICacheStore,
  store: APIStoreStore,
  lruCache: new LRUCache<string, any>({
    max: 500,
    maxSize: 5000,
    ttl: 1000 * 60 * 5,
  }),
}

export const store: IStores = {
  browser: BrowserStore,
  outdateBrowser: OutdateBrowser,
  threadAdvanceInfo: {
    order: 0,
  },
  totalRequestToCrawl: 0,
  headers: HeadersStore,
  promise: PromiseStore,
  api: APIStore,
}

export const getStoreList = () => {
  return store
} // getStoreList

export const getStore = (key: keyof IStores) => {
  if (!key) return
  if (
    !store[key] ||
    store[key] === null ||
    Array.isArray(store[key]) ||
    typeof store[key] !== 'object'
  )
    return store[key]

  return store[key] as any
} // getStore

export const setStore = (key: keyof IStores, value) => {
  if (!key || !value) return

  store[key] = value
} // getStores
