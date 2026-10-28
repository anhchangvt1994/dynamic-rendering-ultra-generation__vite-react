import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { transform } from 'sucrase'

export const root = path.resolve(import.meta.dirname, '../..')
export const constantsFile = 'server/src/puppeteer-ssr/constants.ts'
export const utilsFile =
  'server/src/puppeteer-ssr/utils/OptimizeHtml.worker/utils.ts'
export const pipelineFile =
  'server/src/puppeteer-ssr/utils/ISRHandler.worker/worker.ts'

export function loadOptimization(sources = {}, env = {}, pipelineFlags = {}) {
  function load(file, dependencies) {
    const filename = path.join(root, file)
    const require = createRequire(filename)
    const module = { exports: {} }
    vm.runInNewContext(
      transform(sources[file] ?? fs.readFileSync(filename, 'utf8'), {
        transforms: ['typescript', 'imports'],
      }).code,
      {
        module,
        exports: module.exports,
        __dirname: path.dirname(filename),
        require: (name) => dependencies[name] ?? require(name),
        process,
        console,
        Buffer,
      },
      { filename }
    )
    return module.exports
  }
  const constants = load(constantsFile, {
    '../constants': { SERVER_LESS: false },
    '../utils/InitEnv': { PROCESS_ENV: { PLATFORM: 'linux', ...env } },
    '../utils/PathHandler': { getUserDataPath: () => '/tmp/html-optimization' },
    'puppeteer-core': {},
  })
  const api = {
    constants,
    ...load(utilsFile, {
      '../../constants': constants,
      '../../../constants': { POWER_LEVEL: 3, POWER_LEVEL_LIST: { ONE: 1 } },
      '../../../utils/InitEnv': { ENV: 'production', PROCESS_ENV: env },
    }),
  }
  const pipeline =
    sources[pipelineFile] ??
    fs.readFileSync(path.join(root, pipelineFile), 'utf8')
  const combinedStart = pipeline.indexOf('const combineShallowOptimize =')
  const start =
    combinedStart >= 0
      ? combinedStart
      : pipeline.indexOf('if (enableScriptOptimize) html =')
  const end = pipeline.indexOf(
    "// console.log('finish optimize and compress",
    start
  )
  assertPipelineBoundary(start, end)
  api.pipeline = vm.runInNewContext(
    `(async (html) => { ${pipeline.slice(start, end)}; return html })`,
    {
      ...api,
      enableScriptOptimize: true,
      enableStyleOptimize: true,
      enableLowOptimize: false,
      enableShallowOptimize: true,
      enableDeepOptimize: true,
      enableToCompress: true,
      cacheManager: { getStatus: () => 'renew' },
      WorkerPool: { workerEmit: () => {} },
      ...pipelineFlags,
    }
  )
  return api
}

function assertPipelineBoundary(start, end) {
  if (start < 0 || end < start)
    throw new Error('Could not locate ISR optimization pipeline')
}

export function htmlFixtures(count = 500) {
  const cards = Array.from(
    { length: count },
    (_, i) =>
      `<article class="card" style="color:red"><div>thomas</div><div>edition ${i}</div><img class="photo" alt="Portrait ${i}" src="/${i}.webp"><span class="material-icons">home</span><a href="/item/${i}">Details ${i}</a></article>`
  ).join('')
  return {
    cards: `<!doctype html><html lang="en"><head><title>Catalogue</title></head><body>${cards}</body></html>`,
    links: `<html><head>${Array.from({ length: count }, (_, i) => `<link rel="alternate" href="/${i}">`).join('')}<link rel="stylesheet" href="/app.css"></head><body>${cards}</body></html>`,
    media: `<html><body>${Array.from({ length: count }, (_, i) => `<video src="/${i}.mp4">fallback</video><audio src="/${i}.mp3">fallback</audio>`).join('')}<video seo-tag="true" src="/keep.mp4">keep</video>${cards}</body></html>`,
  }
}

export async function runPipeline(api, html) {
  return api.pipeline(html)
}
