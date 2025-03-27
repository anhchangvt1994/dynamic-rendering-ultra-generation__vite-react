import { hashCode } from 'utils/StringHelper'

const API_STORE_CLONED = JSON.parse(JSON.stringify(API_STORE || {}))

export const getAPIStore = (key?: string) => {
  if (!key) return API_STORE_CLONED

  key = hashCode(key)

  if (!API_STORE_CLONED[key]) return

  return API_STORE_CLONED[key]
} // getAPIStore
