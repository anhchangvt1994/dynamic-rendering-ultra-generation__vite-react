import crypto from 'crypto'
import type { OutputOptions } from 'rollup'
import type { Plugin } from 'vite'

export default (
  splitChunkConfig: Array<
    string | RegExp | ((pathName: string) => boolean | string)
  >
): Plugin => {
  return {
    name: 'normal-split-chunks',
    config(config) {
      if (
        !splitChunkConfig ||
        typeof splitChunkConfig !== 'object' ||
        !splitChunkConfig.length
      )
        return

      const output = config.build?.rollupOptions?.output as OutputOptions
      output.manualChunks = function (pathName, meta) {
        /**
         * NOTE - refer to
         * https://stackoverflow.com/questions/2912894/how-to-match-any-character-in-regular-expression
         */
        for (const splitChunkCondition of splitChunkConfig) {
          const moduleInfo = meta.getModuleInfo(pathName)

          if (!moduleInfo?.isIncluded) continue

          let name = ''

          if (
            splitChunkCondition instanceof RegExp &&
            splitChunkCondition.test(pathName)
          ) {
            name = pathName.match(splitChunkCondition)?.[0] ?? pathName
          } else if (
            typeof splitChunkCondition === 'string' &&
            pathName.indexOf(splitChunkCondition) !== -1
          )
            return splitChunkCondition
          else if (typeof splitChunkCondition === 'function') {
            name = (splitChunkCondition(pathName) || '') as string
          }

          if (!name) continue

          return crypto
            .createHash('sha1')
            .update(name)
            .digest('hex')
            .slice(0, 8)
          // return name
        }
      }
    },
  }
}
