import splitChunkHanler from './splitChunkHandler'

const splitChunkUtilsRegex = /utils\/([^/]+)/
const componentsRegex = /components\/([^/]+)/
const nodeModulesRegex = /node_modules\/([^/]+)/

const splitChunk = splitChunkHanler().init()

const splitChunkUtils = (pathName: string): boolean | string => {
  if (
    !pathName ||
    !splitChunkUtilsRegex.test(pathName) ||
    componentsRegex.test(pathName) || nodeModulesRegex.test(pathName)
  ) {
    return false
  }

  const chunkName = splitChunk(pathName, splitChunkUtilsRegex) || pathName

  return chunkName
} // splitChunkUtils

export default splitChunkUtils
