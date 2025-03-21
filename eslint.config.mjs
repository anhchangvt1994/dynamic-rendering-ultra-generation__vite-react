import eslintAirBnb from 'eslint-config-airbnb'
import eslintAirBnbTs from 'eslint-config-airbnb-typescript'
import eslintConfigPrettier from 'eslint-config-prettier'
import react from 'eslint-plugin-react'
import airBnbHooks from 'eslint-plugin-react-hooks'

export default [
	{
		files: ['src/**/*.{js,ts,jsx,tsx}'],
		plugins: {
			'eslint-config-airbnb': eslintAirBnb,
			'eslint-config-airbnb-typescript': eslintAirBnbTs,
		},
		rules: {
			...eslintAirBnb.rules,
			...eslintAirBnbTs.rules,
			'linebreak-style': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'no-unused-vars': 'warn',
			'react-hooks/rules-of-hooks': 'warn',
			'react-hooks/exhaustive-deps': 'warn',
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
	react.configs.all,
	airBnbHooks.configs['recommended-latest'],
	eslintConfigPrettier,
	// eslintPluginPrettier,
]
