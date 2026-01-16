import splitChunkHanler from './splitChunkHandler'

const splitChunkHooksRegex = /hooks\/([^/]+)/
const componentsRegex = /components\/([^/]+)/
const nodeModulesRegex = /node_modules\/([^/]+)/

const splitChunk = splitChunkHanler().init()

const splitChunkHooks = (pathName: string): boolean | string => {
  if (
    !pathName ||
    !splitChunkHooksRegex.test(pathName) ||
    componentsRegex.test(pathName) || nodeModulesRegex.test(pathName)
  ) {
    return false
  }

  const chunkName = splitChunk(pathName, splitChunkHooksRegex) || pathName

  return chunkName
} // splitChunkHooks

export default splitChunkHooks
