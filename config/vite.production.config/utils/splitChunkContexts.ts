import { initStore } from '../store'
import splitChunkHanler from './splitChunkHandler'

const splitChunkContextsRegex = /contexts\/([^/]+)/
const componentsRegex = /components\/([^/]+)/
const nodeModulesRegex = /node_modules\/([^/]+)/

const contextsStore = initStore({
  prefix: 'contexts',
})
const splitChunk = splitChunkHanler().init(contextsStore)

const splitChunkContexts = (pathName: string): boolean | string => {
  if (!pathName ||
    !splitChunkContextsRegex.test(pathName) ||
    componentsRegex.test(pathName) || nodeModulesRegex.test(pathName)
  ) {
    return false
  }

  const chunkName = splitChunk(pathName, splitChunkContextsRegex) || pathName

  return chunkName
} // splitChunkContexts

export default splitChunkContexts
