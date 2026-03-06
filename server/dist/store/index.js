"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _lrucache = require('lru-cache'); var _lrucache2 = _interopRequireDefault(_lrucache);


 const BrowserStore = {}; exports.BrowserStore = BrowserStore
 const OutdateBrowser = new Set([]); exports.OutdateBrowser = OutdateBrowser
 const HeadersStore = {}; exports.HeadersStore = HeadersStore
 const PromiseStore = {}; exports.PromiseStore = PromiseStore
 const APICacheStore = new Map(); exports.APICacheStore = APICacheStore
 const APIStoreStore = new Map(); exports.APIStoreStore = APIStoreStore
 const APIStore = {
  cache: exports.APICacheStore,
  store: exports.APIStoreStore,
  lruCache: new _lrucache2.default({
    max: 500,
    maxSize: 5000,
    ttl: 1000 * 60 * 5,
  }),
}; exports.APIStore = APIStore

 const store = {
  browser: exports.BrowserStore,
  outdateBrowser: exports.OutdateBrowser,
  threadAdvanceInfo: {
    order: 0,
  },
  totalRequestToCrawl: 0,
  headers: exports.HeadersStore,
  promise: exports.PromiseStore,
  api: exports.APIStore,
}; exports.store = store

 const getStoreList = () => {
  return exports.store
}; exports.getStoreList = getStoreList // getStoreList

 const getStore = (key) => {
  if (!key) return
  if (
    !exports.store[key] ||
    exports.store[key] === null ||
    Array.isArray(exports.store[key]) ||
    typeof exports.store[key] !== 'object'
  )
    return exports.store[key]

  return exports.store[key] 
}; exports.getStore = getStore // getStore

 const setStore = (key, value) => {
  if (!key || !value) return

  exports.store[key] = value
}; exports.setStore = setStore // getStores
