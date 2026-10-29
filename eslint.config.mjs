import { parse, parseForESLint } from '@typescript-eslint/parser'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import eslintAirBnb from 'eslint-config-airbnb'
import eslintAirBnbTs from 'eslint-config-airbnb-typescript'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettier from 'eslint-plugin-prettier'
import react from 'eslint-plugin-react'
import airBnbHooks from 'eslint-plugin-react-hooks'
import fs from 'fs'
import { fileURLToPath } from 'node:url'

const EslintAutoImportType = JSON.parse(
  fs.readFileSync(
    new URL('./config/.eslintrc-auto-import-type.json', import.meta.url),
    'utf-8'
  )
)
const EslintAutoImport = JSON.parse(
  fs.readFileSync(
    new URL('./config/.eslintrc-auto-import.json', import.meta.url),
    'utf-8'
  )
)

export default [
  {
    ignores: ['admin/**', 'server/admin/**', '**/dist/**'],
  },
  airBnbHooks.configs['recommended-latest'],
  eslintConfigPrettier,
  {
    files: [
      'src/**/*.{js,mjs,cjs,ts,jsx,tsx}',
      'server/src/**/*.{js,mjs,cjs,ts,jsx,tsx}',
    ],
    plugins: {
      '@typescript-eslint': typescriptEslint,
      ...react.configs.flat.recommended.plugins,
      'eslint-config-airbnb': eslintAirBnb,
      'eslint-config-airbnb-typescript': eslintAirBnbTs,
      prettier: eslintPluginPrettier.configs,
      eslintAutoImport: EslintAutoImport,
      eslintAutoImportType: EslintAutoImportType,
    },
    languageOptions: {
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        NodeJS: true,
        browser: true,
        es6: true,
        node: true,
        ...EslintAutoImportType.globals,
        ...EslintAutoImport.globals,
      },
      parser: {
        parse,
        parseForESLint,
      },
      parserOptions: {
        parser: {
          js: 'espree',
          jsx: 'espree',
          '<template>': 'espree',
        },
        ecmaFeatures: {
          jsx: true,
          tsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...eslintAirBnb.rules,
      ...eslintAirBnbTs.rules,
      ...eslintPluginPrettier.configs.rules,
      'linebreak-style': 'off',
      '@typescript-eslint/naming-convention': 'off',
      'no-unused-vars': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react/jsx-no-undef': ['error', { allowGlobals: true }],
      'react/prop-types': 'off',
      'react/display-name': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        'eslint-import-resolver-custom-alias': {
          alias: {
            '@': './src',
            assets: './src/assets',
            layouts: './src/layouts',
            hooks: './src/hooks',
            pages: './src/pages',
            components: './src/components',
            utils: './src/utils',
            store: './src/store',
            app: './src/app',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'server/src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { ignoreRestSiblings: true },
      ],
    },
  },
]
