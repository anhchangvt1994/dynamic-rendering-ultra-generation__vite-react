import path from 'path'

const dotenv = require('dotenv')

export const ENV = (
  ['development', 'production'].includes(process.env.ENV as string)
    ? process.env.ENV
    : 'production'
) as 'development' | 'production'
export const MODE = (
  ['development', 'preview', 'production'].includes(process.env.MODE as string)
    ? process.env.MODE
    : process.env.ENV === 'development'
      ? 'development'
      : 'production'
) as 'development' | 'preview' | 'production'

const envModeList = {
  // NOTE - This means you can debug staging and production in development environment
  development_development: 'development',
  development_preview: 'staging',
  development_production: 'production',

  // NOTE - This means your final environment you need to deploy
  production_development: 'staging',
  production_preview: 'uat',
  production_production: 'production',
}
export const ENV_MODE = envModeList[`${ENV}_${MODE}`] as
  | 'development'
  | 'staging'
  | 'uat'
  | 'production'

interface IProcessENV {
  HOST: string
  PLATFORM: string
  HOSTNAME: string
  ADDRESS: string
  IS_SERVER: string
  IS_REMOTE_CRAWLER?: boolean
  DISABLE_COMPRESS: boolean
  DISABLE_OPTIMIZE: boolean
  DISABLE_DEEP_OPTIMIZE: boolean
  CRAWLER: string
  CRAWLER_SECRET_KEY: string
  ENABLE_URL_TESTING: boolean
  [key: string]: string | boolean | undefined
}

export const PROCESS_ENV = (() => {
  dotenv.config({
    path: path.resolve(__dirname, '../../.env'),
  })

  switch (ENV_MODE) {
    case 'development':
      break
    case 'staging':
      dotenv.config({
        path: path.resolve(__dirname, '../../.env.staging'),
        override: true,
      })
      break
    case 'uat':
      dotenv.config({
        path: path.resolve(__dirname, '../../.env.uat'),
        override: true,
      })
      break
    default:
      dotenv.config({
        path: path.resolve(__dirname, '../../.env.production'),
        override: true,
      })
      break
  }

  const tmpProcessEnv = { ...(process.env as IProcessENV) }

  tmpProcessEnv.BUILD_TOOL = 'vite'
  tmpProcessEnv.RESET_RESOURCE = true

  if (process.env.IS_REMOTE_CRAWLER !== undefined) {
    tmpProcessEnv.IS_REMOTE_CRAWLER = ['false', '0', ''].includes(
      process.env.IS_REMOTE_CRAWLER as string
    )
      ? false
      : true
  }
  tmpProcessEnv.DISABLE_COMPRESS = Boolean(
    process.env.DISABLE_COMPRESS === undefined
      ? false
      : ['true', '1'].includes(
          (process.env.DISABLE_COMPRESS || '').toLowerCase()
        )
  )
  tmpProcessEnv.DISABLE_DEEP_OPTIMIZE =
    process.env.DISABLE_DEEP_OPTIMIZE === undefined
      ? false
      : ['true', '1'].includes(
          (process.env.DISABLE_DEEP_OPTIMIZE || '').toLowerCase()
        )
  tmpProcessEnv.DISABLE_OPTIMIZE =
    process.env.DISABLE_OPTIMIZE === undefined
      ? false
      : ['true', '1'].includes(
          (process.env.DISABLE_OPTIMIZE || '').toLowerCase()
        )
  tmpProcessEnv.ENABLE_URL_TESTING =
    process.env.ENABLE_URL_TESTING === undefined
      ? false
      : ['true', '1'].includes(
          (process.env.ENABLE_URL_TESTING || '').toLowerCase()
        )

  return tmpProcessEnv
})()
