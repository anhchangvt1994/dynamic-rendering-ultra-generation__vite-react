import fs from 'fs'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'

// NOTE - If you are using ESM, uncomment the following lines
// import { fileURLToPath } from 'node:url'
// const __filename = fileURLToPath?.(import.meta.url)
// const __dirname = path.dirname(__filename)

// NOTE - This is path of auto-import type declaration
const dtsAutoImportLibsPath = path.resolve(__dirname, './auto-imports.d.ts')
const dtsAutoImportTypesPath = path.resolve(
  __dirname,
  './auto-imports-type.d.ts'
)

// NOTE - This is path of auto-import eslint
const eslintAutoImportLibsPath = path.join(
  __dirname,
  './.eslintrc-auto-import.json'
)
const eslintAutoImportTypesPath = path.join(
  __dirname,
  './.eslintrc-auto-import-type.json'
)

const getAutoImportLibs = () =>
  AutoImport({
    // targets to transform
    include: [
      /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      /\.md$/, // .md
    ],
    imports: [
      'react',
      {
        react: [
          ['*', 'React'],
          'Suspense',
          'componentDidCatch',
          'StrictMode',
          'createContext',
        ],
      },
      {
        from: 'yup',
        imports: [['*', 'yup']],
      },
      {
        'react-dom/client': ['createRoot'],
      },
      'react-router-dom',
      {
        'react-router-dom': [
          'createBrowserRouter',
          'RouterProvider',
          'BrowserRouter',
          'useMatches',
          'generatePath',
        ],
      },
      {
        'styled-components': [
          ['default', 'styled'],
          'createGlobalStyle',
          'StyleSheetManager',
          'keyframes',
        ],
      },
      {
        polished: ['rgba'],
      },
      {
        'app/router/context/InfoContext': ['useRoute'],
        'app/router/context/LocaleInfoContext': ['useLocaleInfo'],
        'utils/StringHelper.ts': [
          'getSlug',
          'getSlugWithoutDash',
          'getUnsignedLetters',
          'getCustomSlug',
          'generateTitleCase',
          'generateSentenceCase',
          'getLocale',
          'encode',
          'decode',
          'hashCode',
        ],
        'hooks/useStringHelper.ts': [
          'useSlug',
          'useSlugWithoutDash',
          'useUnsignedLetters',
          'useTitleCase',
          'useSentenceCase',
        ],
        'utils/SeoHelper/index.ts': [
          'setTitleTag',
          'setMetaDescriptionTag',
          'setMetaKeywordsTag',
          'setMetaRobotsTag',
          'setLinkCanonicalTag',
          'setMetaViewportTag',
          'setMetaOgTitleTag',
          'setMetaOgDescriptionTag',
          'setMetaOgImageTag',
          'setMetaOgUrlTag',
          'setMetaOgTypeTag',
          'setMetaOgSiteNameTag',
          'setMetaAuthorTag',
          'setMetaGoogleBotTag',
          'setMetaGoogleSiteVerificationTag',
          'setLinkAlternateTag',
          'setMetaGeoRegionTag',
          'setMetaGeoPositionTag',
          'setMetaICBMTag',
          'setLinkNextTag',
          'setLinkPrevTag',
          'setLinkAuthorTag',
          'setLinkAmphtmlTag',
          'setLinkTwitterTitleTag',
          'setMetaTwitterDescriptionTag',
          'setMetaTwitterImageTag',
          'setMetaTwitterCardTag',
          'setSeoTag',
        ],
        'store/ServerStore.ts': [
          'EnvironmentInfo',
          'BotInfo',
          'DeviceInfo',
          'LocaleInfo',
          'RenderingInfo',
        ],
        'store/APIStore.ts': ['getAPIStore'],
        'utils/ProxyAPIHelper/index.ts': ['ProxyAPI'],
        'utils/CookieHelper.ts': ['getCookie', 'setCookie', 'deleteCookie'],
        'components/Link.tsx': [['default', 'LinkCustom']],
      },
    ],
    dts: dtsAutoImportLibsPath,
    eslintrc: {
      enabled: true,
      filepath: eslintAutoImportLibsPath,
    },
    enforce: 'pre',
  }) // getAutoImportLibs

const getAutoImportTypes = () =>
  AutoImport({
    // targets to transform
    include: [
      /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      /\.md$/, // .md
    ],
    imports: [
      {
        from: 'yup',
        imports: [['*', 'yup']],
        type: true,
      },
      {
        from: 'react',
        imports: [['*', 'React']],
        type: true,
      },
      {
        from: 'react',
        imports: [
          'Dispatch',
          'SetStateAction',
          'HTMLProps',
          'HTMLAttributes',
          'ComponentType',
          'ReactNode',
        ],
        type: true,
      },
    ],
    dts: dtsAutoImportTypesPath,
    eslintrc: {
      enabled: true,
      filepath: eslintAutoImportTypesPath,
    },
    enforce: 'pre',
  }) // getAutoImportTypes

export const handleAutoImport = (enable = false) => {
  // NOTE - generate the types files if NODE_ENV === 'production', ELSE it will be generated using plugins in vite.config.ts
  if (!enable) return

  // NOTE - clean the auto import files and recreate to ensure that types are not accidentally
  // NOTE - clean step
  if (fs.existsSync(dtsAutoImportLibsPath)) {
    try {
      fs.unlinkSync(dtsAutoImportLibsPath)
    } catch (err) {
      console.error(err)
    }
  }
  if (fs.existsSync(dtsAutoImportTypesPath)) {
    try {
      fs.unlinkSync(dtsAutoImportTypesPath)
    } catch (err) {
      console.error(err)
    }
  }
  if (fs.existsSync(eslintAutoImportLibsPath)) {
    try {
      fs.unlinkSync(eslintAutoImportLibsPath)
    } catch (err) {
      console.error(err)
    }
  }
  if (fs.existsSync(eslintAutoImportTypesPath)) {
    try {
      fs.unlinkSync(eslintAutoImportTypesPath)
    } catch (err) {
      console.error(err)
    }
  }

  // NOTE - recreate step
  Promise.all([
    getAutoImportLibs()?.buildStart?.(),
    getAutoImportTypes()?.buildStart?.(),
  ])
} // handleAutoImport

if (process.env.NODE_ENV === 'development') {
  handleAutoImport(true)
}

// NOTE - export the prepare configuration
export default {
  plugins: [getAutoImportLibs(), getAutoImportTypes()],
}
