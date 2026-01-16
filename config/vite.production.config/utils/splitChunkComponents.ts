const splitChunkComponentsRegex = /components\/([^/]+)/
const pagesRegex = /pages\/([^/]+)/
const nodeModulesRegex = /node_modules\/([^/]+)/

const splitChunkComponents = (pathName: string): boolean | string => {
  if (
    !pathName ||
    !splitChunkComponentsRegex.test(pathName) ||
    // pagesRegex.test(pathName) ||
    nodeModulesRegex.test(pathName)
  ) {
    return false
  }

  const chunkName = pathName.match(splitChunkComponentsRegex)?.[0] ?? pathName

  return chunkName
} // splitChunkComponents

export default splitChunkComponents
