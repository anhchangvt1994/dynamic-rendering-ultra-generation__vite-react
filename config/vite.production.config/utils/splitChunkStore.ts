import splitChunkHanler from './splitChunkHandler'

const splitChunkStoreRegex = /store\/([^/]+)/
const componentsRegex = /components\/([^/]+)/
const nodeModulesRegex = /node_modules\/([^/]+)/

const splitChunk = splitChunkHanler().init()

const splitChunkStore = (pathName: string): boolean | string => {
  if (
    !pathName ||
    !splitChunkStoreRegex.test(pathName) ||
    componentsRegex.test(pathName) || nodeModulesRegex.test(pathName)
  ) {
    return false
  }

  const chunkName = splitChunk(pathName, splitChunkStoreRegex) || pathName

  return chunkName
} // splitChunkStore

export default splitChunkStore
