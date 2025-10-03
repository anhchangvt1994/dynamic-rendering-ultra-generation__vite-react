import { initStore } from '../store'
import splitChunkHanler from './splitChunkHandler'

const splitChunkSchemasRegex = /schemas\/([^/]+)/
const splitChunkSchemasRegexToIgnore = /components\/([^/]+)/

const routesStore = initStore({
  prefix: 'schemas',
})
const splitChunk = splitChunkHanler().init(routesStore)

const splitChunkSchemas = (pathName: string): boolean | string => {
  if (
    !pathName ||
    !splitChunkSchemasRegex.test(pathName) ||
    splitChunkSchemasRegexToIgnore.test(pathName)
  ) {
    return false
  }

  const chunkName = splitChunk(pathName, splitChunkSchemasRegex) || pathName

  return chunkName
} // splitChunkSchemas

export default splitChunkSchemas
