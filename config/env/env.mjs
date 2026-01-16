import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import ENV_DEFINE_LIST from '../../env/env-register.mjs'
import ObjToEnvConverter from '../libs/object-to-env-converter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_PATH = __dirname.replace(/\\/g, '/')

const ENV_OBJECT_DEFAULT = {
  PORT: 0,
  IO_PORT: 0,
  LOCAL_ADDRESS: '',
  LOCAL_HOST: '',
  IPV4_ADDRESS: '',
  IPV4_HOST: '',
  IO_HOST: '',
}
const ENV_OBJ_WITH_JSON_STRINGIFY_VALUE = { ...ENV_OBJECT_DEFAULT }

const generateObjectFormatted = (obj, prefix) => {
  if (!obj || typeof obj !== 'object') return {}
  prefix = prefix ? prefix.toUpperCase() + '_' : ''

  for (const key in obj) {
    let tmpKey = `${prefix}${key.toUpperCase()}`

    if (typeof obj[key] === 'object' && !obj[key].length) {
      for (const childKey in obj[key]) {
        if (typeof obj[key][childKey] === 'function') {
          setValueForObject(
            ENV_OBJECT_DEFAULT,
            tmpKey + '_' + childKey.toUpperCase() + '_FUNCTION',
            obj[key][childKey].toString()
          )
          setValueForObject(
            ENV_OBJ_WITH_JSON_STRINGIFY_VALUE,
            tmpKey + '_' + childKey.toUpperCase() + '_FUNCTION',
            obj[key][childKey].toString()
          )
        } else {
          setValueForObject(
            ENV_OBJECT_DEFAULT,
            tmpKey + '_' + childKey.toUpperCase(),
            obj[key][childKey]
          )
          setValueForObject(
            ENV_OBJ_WITH_JSON_STRINGIFY_VALUE,
            tmpKey + '_' + childKey.toUpperCase(),
            JSON.stringify(obj[key][childKey])
          )
        }
      }

      delete obj[key]
    } else {
      setValueForObject(ENV_OBJECT_DEFAULT, tmpKey, obj[key])
      setValueForObject(
        ENV_OBJ_WITH_JSON_STRINGIFY_VALUE,
        tmpKey,
        JSON.stringify(obj[key])
      )
      delete obj[key]
    }
  }
} // getObjectWithPrefix()

const setValueForObject = (obj, key, value) => {
  if (!typeof obj === 'object' || !key) return
  obj[key] = value
} // setValueForObject()

// NOTE - First step is generate object formatted
if (ENV_DEFINE_LIST.length) {
  ENV_DEFINE_LIST.forEach(function (item) {
    generateObjectFormatted(item.data, item.prefix)
  })
}
// End Region

const promiseENVWriteFileSync = new Promise(function (resolve) {
  try {
    fs.writeFileSync(
      `${PROJECT_PATH}/.env`,
      ObjToEnvConverter(ENV_OBJECT_DEFAULT)
    )
    fs.writeFileSync(
      `${PROJECT_PATH}/env.json`,
      JSON.stringify(ENV_OBJ_WITH_JSON_STRINGIFY_VALUE)
    )

    resolve('done')
  } catch {}
})

export {
  ENV_OBJ_WITH_JSON_STRINGIFY_VALUE,
  ENV_OBJECT_DEFAULT,
  promiseENVWriteFileSync,
}
