import splitChunkHanler from './splitChunkHandler'

const splitChunkConstantsRegex = /constants\/([^/]+)/
const componentsRegex = /components\/([^/]+)/
const nodeModulesRegex = /node_modules\/([^/]+)/

const splitChunk = splitChunkHanler().init()

const splitChunkConstants = (pathName: string): boolean | string => {
  if (
    !pathName ||
    !splitChunkConstantsRegex.test(pathName) || componentsRegex.test(pathName) || nodeModulesRegex.test(pathName)
  ) {
    return false
  }

  const chunkName = splitChunk(pathName, splitChunkConstantsRegex) || pathName

  return chunkName
} // splitChunkConstants

export default splitChunkConstants
