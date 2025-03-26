import { parse, parseForESLint } from '@typescript-eslint/parser'
import eslintAirBnb from 'eslint-config-airbnb'
import eslintAirBnbTs from 'eslint-config-airbnb-typescript'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettier from 'eslint-plugin-prettier'
import react from 'eslint-plugin-react'
import airBnbHooks from 'eslint-plugin-react-hooks'
import EslintAutoImportType from './config/.eslintrc-auto-import-type.json' with { type: 'json' }
import EslintAutoImport from './config/.eslintrc-auto-import.json' with { type: 'json' }

export default [
  airBnbHooks.configs['recommended-latest'],
  eslintConfigPrettier,
  {
    files: ['src/**/*.{js,ts,jsx,tsx}'],
    plugins: {
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
        project: './tsconfig.json',
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
    },
    settings: {
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
]
