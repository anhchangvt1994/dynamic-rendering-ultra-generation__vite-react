import { initStore } from '../store'
import splitChunkHanler from './splitChunkHandler'

const splitChunkRoutesRegex = /routes\/([^/]+)/
const nodeModulesRegex = /node_modules\/([^/]+)/

const routesStore = initStore({
  prefix: 'routes',
})
const splitChunk = splitChunkHanler().init(routesStore)

const splitChunkRoutes = (pathName: string): boolean | string => {
  if (
    !pathName ||
    !splitChunkRoutesRegex.test(pathName) || nodeModulesRegex.test(pathName)
  ) {
    return false
  }

  const chunkName = splitChunk(pathName, splitChunkRoutesRegex) || pathName

  return chunkName
} // splitChunkRoutes

export default splitChunkRoutes
