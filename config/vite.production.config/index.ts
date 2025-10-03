import type { RollupAliasOptions } from '@rollup/plugin-alias'
import type { UserConfig } from 'vite'
import NormalSplitChunks from '../plugins/NormalSplitChunks'
import splitChunkConstants from './utils/splitChunkConstants'
import splitChunkContexts from './utils/splitChunkContexts'
import splitChunkHooks from './utils/splitChunkHooks'
import splitChunkNodeModules from './utils/splitChunkNodeModules'
import splitChunkRoutes from './utils/splitChunkRoutes'
import splitChunkSchemas from './utils/splitChunkSchemas'
import splitChunkStore from './utils/splitChunkStore'
import splitChunkUtils from './utils/splitChunkUtils'

export default (): UserConfig => {
  return {
    // NOTE - If you want to use Regex please use /...\/([^/]+)/ to split chunks right way
    plugins: [
      NormalSplitChunks([
        splitChunkNodeModules,
        splitChunkConstants,
        splitChunkContexts,
        splitChunkSchemas,
        splitChunkUtils,
        splitChunkHooks,
        splitChunkStore,
        splitChunkRoutes,
        // splitChunkComponents,
      ]),
    ],
  }
}

export const aliasExternal: RollupAliasOptions = {
  entries: process.env.ESM
    ? {
        // react: 'https://esm.sh/react@18',
        // 'react-dom': 'https://esm.sh/react-dom@18',
        // 'react-router-dom': 'https://esm.sh/react-router-dom@7',
        // 'styled-components': 'https://esm.sh/styled-components@5.3.6',
        // polished: 'https://esm.sh/polished@4.2.2',
      }
    : {},
}
