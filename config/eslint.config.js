module.exports = {
	root: true,
	ignorePatterns: [
		'vite.config.ts',
		'vite.config.mts',
		'env/**/*',
		'config/**/*',
	],
	extends: [
		'.eslintrc-auto-import.json',
		'airbnb-typescript',
		'airbnb/hooks',
		'plugin:@typescript-eslint/recommended',
		// 'plugin:jest/recommended',
		'plugin:prettier/recommended',
		'eslint:recommended',
		'plugin:import/recommended',
		'plugin:import/typescript',
		'plugin:import/errors',
		'plugin:import/warnings',
		'prettier',
	],
	plugins: [
		'react',
		'@typescript-eslint',
		// 'jest'
	],
	env: {
		browser: true,
		es6: true,
		node: true,
		// jest: true,
	},
	globals: {
		Atomics: 'readonly',
		SharedArrayBuffer: 'readonly',
		NodeJS: true,
	},
	parser: '@typescript-eslint/parser',
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
	rules: {
		'linebreak-style': 'off',
		'prettier/prettier': [
			'error',
			{
				endOfLine: 'auto',
			},
		],
		'@typescript-eslint/naming-convention': 'off',
		'no-unused-vars': 'warn',
		'react-hooks/rules-of-hooks': 'warn',
		'react-hooks/exhaustive-deps': 'warn',
	},
	settings: {
		'import/resolver': {
			'eslint-import-resolver-custom-alias': {
				alias: {
					'': './src',
				},
				extensions: ['.js', '.jsx', '.ts', '.tsx'],
			},
		},
	},
}
