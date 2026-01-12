import { writeFile } from 'fs'
import { resolve } from 'path'
import {
  InputData,
  jsonInputForTargetLanguage,
  quicktype,
} from 'quicktype-core'

async function quicktypeJSON(targetLanguage, jsonString) {
  const jsonInput = jsonInputForTargetLanguage(targetLanguage)

  // We could add multiple samples for the same desired
  // type, or many sources for other types. Here we're
  // just making one type from one piece of sample JSON.
  await jsonInput.addSource({
    name: 'ImportMeta',
    samples: [jsonString],
  })

  const inputData = new InputData()
  inputData.addInput(jsonInput)

  return await quicktype({
    inputData,
    lang: targetLanguage,
    rendererOptions: { 'just-types': 'true' },
  })
} // quicktypeJSON()

export const generateDTS = async function (
  config = {
    input: undefined,
    outputDir: undefined,
    filename: undefined,
  }
) {
  if (
    typeof config.input !== 'object' ||
    typeof config.outputDir !== 'string' ||
    typeof config.filename !== 'string'
  )
    return

  const { lines: tdsGroup } = await quicktypeJSON(
    'typescript',
    JSON.stringify({ env: config.input })
  )

  // for (const idx in tdsGroup) {
  //   const type = tdsGroup[idx]
  //   const key = type.split(':')[0]
  //   if (!key) continue

  //   const keyTrimFormatted = key.trim()

  //   if (
  //     keyTrimFormatted.endsWith('_FUNCTION') &&
  //     config.input[keyTrimFormatted]
  //   ) {
  //     tdsGroup[idx] = `${key}: ${config.input[keyTrimFormatted]}`
  //   }
  // }

  writeFile(
    resolve(config.outputDir, config.filename),
    tdsGroup.join('\n').replace(/export\s/g, ''),
    function (err) {}
  )
} // generateDTS()
