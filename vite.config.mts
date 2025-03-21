import alias from '@rollup/plugin-alias'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import tailwind from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import autoprefixer from 'autoprefixer'
import fs from 'fs'
import path from 'path'
import postcssSimpleVars from 'postcss-simple-vars'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import EnvironmentPlugin from 'vite-plugin-environment'
import viteDevelopmentConfig from './config/vite.development.config'
import viteProductionConfig, {
  aliasExternal,
} from './config/vite.production.config'

import {
  ENV_OBJECT_DEFAULT,
  promiseENVWriteFileSync,
} from './config/env/env.mjs'
import { generateDTS } from './config/types/dts-generator.mjs'
import { getPort } from './config/utils/PortHandler'

const resolve = resolveTsconfigPathsToAlias()
const PUPPETEER_SSR_PORT = getPort('PUPPETEER_SSR_PORT') || 8080

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	promiseENVWriteFileSync.then(function () {
		generateDTS({
			input: ENV_OBJECT_DEFAULT as any,
			outputDir: './config/types' as any,
			filename: 'ImportMeta.d.ts' as any,
		})
	})

	const ViteConfigWithMode = getViteConfigWithMode(mode)
	const config = ViteConfigWithMode?.() ?? {}

	return {
		publicDir: 'src/assets/static',
		plugins: [
			react(),
			tailwind(),
			EnvironmentPlugin(ENV_OBJECT_DEFAULT as any, {
				defineOn: 'import.meta.env',
			}),
			nodeResolve({
				extensions: ['.mjs', '.js', '.json', '.js', '.ts', '.jsx', '.tsx'],
				modulePaths: resolve.modules,
			}),
			AutoImport({
				// targets to transform
				include: [
					/\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
					/\.md$/, // .md
				],
				imports: [
					// presets
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
						'components/Link.tsx': [['default', 'Link']],
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
				],
				dts: './config/auto-imports.d.ts',
				eslintrc: {
					enabled: true,
					filepath: './config/.eslintrc-auto-import.json',
				},
			}),
			...(mode === 'development'
				? [
						alias({
							entries: aliasExternal.entries || {},
						}),
					]
				: []),
			...(config?.plugins ?? []),
		],
		css: {
			postcss: {
				plugins: [
					autoprefixer,
					postcssSimpleVars,
					// (tailwindNesting as () => any)(),
					// tailwind('./tailwind.config.cjs'),
				],
			},
		},
		resolve: {
			alias: {
				...resolve.alias,
				...aliasExternal.entries,
			},
		},
		optimizeDeps: {
			...(mode === 'production'
				? {
						exclude: Object.keys(aliasExternal.entries || {}),
					}
				: {}),
		},
		build: {
			assetsDir: '',
			rollupOptions: {
				output: {
					chunkFileNames() {
						return `[name].[hash].js`
					},
				},
			},
			minify: 'terser',
			terserOptions: {
				format: {
					comments: false, // It will drop all the console.log statements from the final production build
				},
				compress: {
					drop_console: true, // It will stop showing any console.log statement in dev tools. Make it false if you want to see consoles in production mode.
				},
			},
		},
		server: {
			watch: {
				ignored: ['**/config/**', '**/server/**'],
			},
			proxy:
				mode === 'development'
					? {
							'/': {
								target: `http://localhost:${PUPPETEER_SSR_PORT}`,
								bypass(req) {
									if (
										/text\/html|application\/json/.test(
											req.headers['accept'] as string
										)
									) {
										req.headers['static-html-path'] = path.resolve(
											__dirname,
											'./config/templates/index.development.html'
										)
									} else if (!/.js.map|favicon.ico/g.test(req.url as string))
										return req.url
								},
							},
						}
					: {
							'/': {
								target: `http://localhost:${PUPPETEER_SSR_PORT}`,
								bypass(req) {
									if (/.js.map|favicon.ico/g.test(req.url as string))
										return req.url
								},
							},
						},
		},
	}
})

const getViteConfigWithMode = (mode) => {
	if (!mode) return

	return mode === 'development' ? viteDevelopmentConfig : viteProductionConfig
} // getViteConfigFilePathWithMode(mode?: 'development' | 'production')

function resolveTsconfigPathsToAlias(tsconfigPath = './tsconfig.json') {
	// const tsconfig = require(tsconfigPath)
	// const { paths, baseUrl } = tsconfig.compilerOptions
	// NOTE - Get json content without comment line (ignore error JSON parse some string have unexpected symbol)
	// https://stackoverflow.com/questions/40685262/read-json-file-ignoring-custom-comments
	const tsconfig = JSON.parse(
		fs
			.readFileSync(path.resolve('.', tsconfigPath))
			?.toString()
			.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) =>
				g ? '' : m
			)
	)

	const { paths, baseUrl } = tsconfig.compilerOptions

	const modules = [path.resolve(__dirname, baseUrl)]

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
				modules.push(value)
				return [key, value]
			})
	)

	return {
		alias: {
			src: path.resolve(__dirname, baseUrl),
			...alias,
		},
		modules,
	}
} // resolveTsconfigPathsToAlias()
