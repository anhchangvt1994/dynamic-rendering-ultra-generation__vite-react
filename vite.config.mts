import tailwind from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import autoprefixer from 'autoprefixer'
import fs from 'fs'
import { fileURLToPath } from 'node:url'
import path from 'path'
import postcssSimpleVars from 'postcss-simple-vars'
import { defineConfig } from 'vite'
import EnvironmentPlugin from 'vite-plugin-environment'
import viteDevelopmentConfig from './config/vite.development.config'
import viteProductionConfig, {
  aliasExternal,
} from './config/vite.production.config'

import { ENV_OBJECT_DEFAULT } from './config/env/env.mjs'
import { getPort } from './config/utils/PortHandler'
import vitePrepareConfig from './config/vite.prepare.config'

const resolve = resolveTsconfigPathsToAlias()

// https://vitejs.dev/config/
// exact module names: "react" must not catch "react-redux" or "react-router"
const PREACT_ALIASES = [
  { find: /^react$/, replacement: 'preact/compat' },
  { find: /^react-dom$/, replacement: 'preact/compat' },
  { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
  { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' },
  { find: /^react\/jsx-dev-runtime$/, replacement: 'preact/jsx-dev-runtime' },
]

export default defineConfig(({ mode, command }) => {
  const ViteConfigWithMode = getViteConfigWithMode(mode)
  const config = ViteConfigWithMode?.() ?? {}
  const apiPort = Number(
    process.env.DEV_API_PORT || getPort('PUPPETEER_SSR_PORT') || 8080
  )
  const backend = {
    target: `http://127.0.0.1:${apiPort}`,
    ...(mode === 'development' ? { proxyTimeout: 15000, timeout: 15000 } : {}),
  }

  return {
    cacheDir:
      command === 'serve'
        ? fileURLToPath(
            new URL(
              `./node_modules/.cache/vite-dev/${process.env.DEV_PORT || 5173}`,
              import.meta.url
            )
          )
        : undefined,
    publicDir: 'src/assets/static',
    plugins: [
      react(),
      tailwind(),
      EnvironmentPlugin(ENV_OBJECT_DEFAULT as any, {
        defineOn: 'import.meta.env',
      }),
      ...vitePrepareConfig.plugins,
      ...(config?.plugins ?? []),
    ],
    css: {
      postcss: {
        plugins: [autoprefixer, postcssSimpleVars()],
      },
    },
    resolve: {
      alias: [
        ...Object.entries({
          ...resolve.alias,
          ...aliasExternal.entries,
        }).map(([find, replacement]) => ({ find, replacement })),
        // NOTE - Production runs on Preact (preact/compat): React DOM's
        // client is one ~180 kB module, over the 150 kB-per-file budget;
        // Preact is ~10 kB. Development keeps React for Fast Refresh.
        ...(command === 'build' ? PREACT_ALIASES : []),
      ],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom/client',
        'react-router',
        'react-redux',
        '@reduxjs/toolkit/query/react',
        'styled-components',
        'swiper/react',
        'swiper/modules',
      ],
      ...(mode === 'production'
        ? {
            exclude: Object.keys(aliasExternal.entries || {}),
          }
        : {}),
    },
    esbuild:
      command === 'build'
        ? { drop: ['console'], legalComments: 'none' }
        : undefined,
    build: {
      assetsDir: '',
      rollupOptions: {
        output: {
          chunkFileNames() {
            return `[name].[hash].js`
          },
        },
      },
      minify: 'esbuild',
      reportCompressedSize: false,
      // NOTE - Budget per file (kB): a chunk over it is reported on every
      // build (React runs as Preact in production to fit, see PREACT_ALIASES)
      chunkSizeWarningLimit: 150,
    },
    server: {
      host: '0.0.0.0',
      port: Number(process.env.DEV_PORT || 5173),
      strictPort: true,
      warmup: {
        clientFiles: [
          './src/index.tsx',
          './src/pages/HomePage/index.tsx',
          './src/pages/PokemonPage/index.tsx',
        ],
      },
      watch: {
        ignored: ['**/server/**', '**/dist/**', '**/.cache/**'],
      },
      proxy:
        mode === 'development'
          ? {
              '^/api(?:/|\\?|$)': { ...backend },
              '/': {
                ...backend,
                bypass(req) {
                  const pathname = (req.url || '/').split('?')[0]
                  // Accept headers describe the response, not which server
                  // owns it. Vite must always handle modules and public assets.
                  if (
                    /^\/(?:@|src\/|node_modules\/|scripts\/|config\/|assets\/|images\/|fonts\/)/.test(
                      pathname
                    ) ||
                    /\.[a-z0-9]+$/i.test(pathname)
                  )
                    return req.url
                  if (
                    /text\/html|application\/json/.test(
                      req.headers['accept'] as string
                    )
                  ) {
                    req.headers['static-html-path'] = path.resolve(
                      __dirname,
                      './config/templates/index.development.html'
                    )
                  } else return req.url
                },
              },
            }
          : {
              '/': {
                ...backend,
                bypass(req) {
                  if (/.js.map|favicon.ico/g.test(req.url as string))
                    return req.url
                },
              },
            },
    },
  }
})

const getViteConfigWithMode = (mode: any) => {
  if (!mode) return

  return mode === 'development' ? viteDevelopmentConfig : viteProductionConfig
} // getViteConfigFilePathWithMode(mode?: 'development' | 'production')

function resolveTsconfigPathsToAlias(tsconfigPath = 'tsconfig.json') {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  // NOTE - Get json content without comment line (ignore error JSON parse some string have unexpected symbol)
  // https://stackoverflow.com/questions/40685262/read-json-file-ignoring-custom-comments
  const tsconfig = JSON.parse(
    fs
      .readFileSync(path.resolve(__dirname, tsconfigPath))
      ?.toString()
      .replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) =>
        g ? '' : m
      )
  )

  // Without baseUrl, TypeScript resolves paths relative to the config directory.
  const { paths, baseUrl = '.' } = tsconfig.compilerOptions

  const alias = Object.fromEntries(
    Object.entries(paths)
      .filter(([, pathValues]) => (pathValues as Array<string>).length > 0)
      .map(([pathKey, pathValues]) => {
        const key = pathKey.replace('/*', '')
        const value = path.resolve(
          __dirname,
          baseUrl,
          (pathValues as Array<string>)[0].replace(/[\/|\*]+(?:$)/g, '')
        )
        return [key, value]
      })
  )

  return {
    alias: {
      src: path.resolve(__dirname, 'src'),
      ...alias,
    },
  }
} // resolveTsconfigPathsToAlias()
