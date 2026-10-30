import { execFileSync, spawnSync } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

export const LIGHTPANDA_VERSION = '1.0.2'

/**
 * NOTE - Lightpanda linux builds need a recent glibc (x86_64: 2.35, aarch64:
 * 2.38), older than what CentOS / RHEL / Rocky 9 (2.34) or 7 (2.17) ship.
 * On those systems a pinned glibc runtime (Debian trixie libc6, only
 * libc / libm / the loader) is put next to lightpanda and lightpanda is
 * started through its loader by a wrapper script. The system glibc is not
 * touched. Files are content addressed on snapshot.debian.org (sha1).
 */
const GLIBC_RUNTIME = {
  version: '2.41-12+deb13u4',
  x64: {
    sha1: '27904cc1b58dd79f0768ba6aa6dd993edc411b97',
    triplet: 'x86_64-linux-gnu',
    loader: 'ld-linux-x86-64.so.2',
  },
  arm64: {
    sha1: '6ee536e6a461ca319776fac983202946f4d3dce8',
    triplet: 'aarch64-linux-gnu',
    loader: 'ld-linux-aarch64.so.1',
  },
}

export const getLightpandaPath = (customPath) =>
  path.resolve(
    customPath ||
      process.env.LIGHTPANDA_PATH ||
      'server/resources/lightpanda/lightpanda'
  )

const runVersion = (binaryPath) => {
  const result = spawnSync(binaryPath, ['version'], { encoding: 'utf8' })

  return {
    version: result.status === 0 ? result.stdout.trim() : undefined,
    needsNewerGlibc: /GLIBC_[\d.]+' not found/.test(result.stderr || ''),
  }
} // runVersion

// NOTE - Installed version, or undefined when missing / not runnable
export const getLightpandaVersion = (lightpandaPath) => {
  if (!fs.existsSync(lightpandaPath)) return

  return runVersion(lightpandaPath).version
} // getLightpandaVersion

const getAssetName = () => {
  const arch = { x64: 'x86_64', arm64: 'aarch64' }[process.arch]
  const platform = { linux: 'linux', darwin: 'macos' }[process.platform]

  if (!arch || !platform) return

  return `lightpanda-${arch}-${platform}`
} // getAssetName

// NOTE - A download never hangs silently: it gives up when the server does
// not answer, or when no byte arrives for a while, logs its progress (the
// binary is ~90 MB, a slow VPS link takes minutes) and retries
const CONNECT_TIMEOUT_MS =
  Number(process.env.LIGHTPANDA_CONNECT_TIMEOUT_MS) || 30000
const STALL_TIMEOUT_MS =
  Number(process.env.LIGHTPANDA_STALL_TIMEOUT_MS) || 30000
const ATTEMPTS = Number(process.env.LIGHTPANDA_DOWNLOAD_ATTEMPTS) || 3
const PROGRESS_EVERY_MS = 3000

const megabytes = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`

// NOTE - Streams `url`, handing each chunk to `onChunk`
const fetchChunks = async (url, onChunk) => {
  const controller = new AbortController()
  const abort = (message) => controller.abort(new Error(message))
  let timer = setTimeout(
    () =>
      abort(
        `no answer from ${new URL(url).host} after ${CONNECT_TIMEOUT_MS / 1000}s`
      ),
    CONNECT_TIMEOUT_MS
  )

  let received = 0
  try {
    const res = await fetch(url, { signal: controller.signal })

    if (!res.ok) throw new Error(`status ${res.status}`)

    const total = Number(res.headers.get('content-length')) || 0
    const startedAt = Date.now()
    let loggedAt = startedAt
    const armStallTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(
        () =>
          abort(
            `stalled: no data for ${STALL_TIMEOUT_MS / 1000}s at ${megabytes(received)}`
          ),
        STALL_TIMEOUT_MS
      )
    }
    armStallTimer()

    for await (const chunk of res.body) {
      armStallTimer()
      received += chunk.length
      onChunk(chunk)

      const now = Date.now()
      if (now - loggedAt >= PROGRESS_EVERY_MS) {
        loggedAt = now
        const speed = received / ((now - startedAt) / 1000)
        console.log(
          `  ${megabytes(received)}${total ? ` / ${megabytes(total)} (${Math.floor((received / total) * 100)}%)` : ''}, ${megabytes(speed)}/s`
        )
      }
    }

    if (total && received !== total)
      throw new Error(
        `incomplete: ${megabytes(received)} of ${megabytes(total)}`
      )
  } catch (err) {
    throw controller.signal.aborted ? controller.signal.reason : err
  } finally {
    clearTimeout(timer)
  }

  return received
} // fetchChunks

const withRetry = async (url, attempt) => {
  for (let tried = 1; ; tried++) {
    try {
      return await attempt()
    } catch (err) {
      if (tried >= ATTEMPTS)
        throw new Error(`Download ${url} failed: ${err.message}`)

      const wait = tried * 3
      console.log(
        `  ${err.message}; retrying in ${wait}s (${tried + 1}/${ATTEMPTS})`
      )
      await new Promise((resolve) => setTimeout(resolve, wait * 1000))
    }
  }
} // withRetry

// NOTE - Small files (the glibc package): kept in memory
const download = (url) => {
  console.log(`Download ${url}`)

  return withRetry(url, async () => {
    const chunks = []
    await fetchChunks(url, (chunk) => chunks.push(chunk))
    return Buffer.concat(chunks)
  })
} // download

// NOTE - The binary: written to disk as it arrives, not held in memory
const downloadToFile = (url, file) => {
  console.log(`Download ${url}`)

  return withRetry(url, async () => {
    const fd = fs.openSync(file, 'w')
    try {
      const size = await fetchChunks(url, (chunk) => fs.writeSync(fd, chunk))
      console.log(`  done, ${megabytes(size)}`)
    } finally {
      fs.closeSync(fd)
    }
  })
} // downloadToFile

// NOTE - Extract one member of an ar archive (.deb)
const extractArMember = (buffer, prefix) => {
  let offset = 8 // "!<arch>\n"
  while (offset < buffer.length) {
    const name = buffer.toString('ascii', offset, offset + 16).trim()
    const size = Number(
      buffer.toString('ascii', offset + 48, offset + 58).trim()
    )
    const start = offset + 60
    if (name.startsWith(prefix))
      return { name, data: buffer.subarray(start, start + size) }
    offset = start + size + (size % 2)
  }
} // extractArMember

const installGlibcRuntime = async (targetDir) => {
  const runtime = GLIBC_RUNTIME[process.arch]

  if (!runtime) throw new Error(`No glibc runtime for ${process.arch}`)

  const deb = await download(`https://snapshot.debian.org/file/${runtime.sha1}`)
  const sha1 = crypto.createHash('sha1').update(deb).digest('hex')

  if (sha1 !== runtime.sha1)
    throw new Error(`glibc runtime checksum mismatch (${sha1})`)

  const member = extractArMember(deb, 'data.tar')

  if (!member) throw new Error('glibc runtime package has no data archive')

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lightpanda-glibc-'))
  const archivePath = path.join(tmpDir, member.name)
  fs.writeFileSync(archivePath, member.data)

  const libDir = `./usr/lib/${runtime.triplet}`
  const files = ['libc.so.6', 'libm.so.6', runtime.loader]
  execFileSync('tar', [
    '-xf',
    archivePath,
    '-C',
    tmpDir,
    ...files.map((file) => `${libDir}/${file}`),
  ])

  fs.rmSync(targetDir, { recursive: true, force: true })
  fs.mkdirSync(targetDir, { recursive: true })
  for (const file of files)
    fs.copyFileSync(path.join(tmpDir, libDir, file), path.join(targetDir, file))
  fs.chmodSync(path.join(targetDir, runtime.loader), 0o755)
  fs.rmSync(tmpDir, { recursive: true, force: true })

  console.log(
    `glibc ${GLIBC_RUNTIME.version} runtime installed at ${targetDir}`
  )

  return runtime.loader
} // installGlibcRuntime

export const installLightpanda = async (targetPath = getLightpandaPath()) => {
  const assetName = getAssetName()

  if (!assetName)
    throw new Error(
      `Lightpanda does not support ${process.platform}-${process.arch}`
    )

  const url = `https://github.com/lightpanda-io/browser/releases/download/${LIGHTPANDA_VERSION}/${assetName}`
  const targetDir = path.dirname(targetPath)
  const binPath = `${targetPath}-bin`
  const glibcDir = path.join(targetDir, 'glibc')
  const tmpPath = `${targetPath}.download`

  fs.mkdirSync(targetDir, { recursive: true })
  try {
    await downloadToFile(url, tmpPath)
  } catch (err) {
    fs.rmSync(tmpPath, { force: true })
    throw new Error(
      [
        err.message,
        'Install it by hand (or check that this machine can reach github.com):',
        `  curl -fL --retry 3 -o ${targetPath} ${url} && chmod +x ${targetPath}`,
        'or point LIGHTPANDA_PATH to a lightpanda binary you already have.',
      ].join('\n')
    )
  }
  fs.chmodSync(tmpPath, 0o755)

  const { version, needsNewerGlibc } = runVersion(tmpPath)

  if (version || !needsNewerGlibc) {
    fs.renameSync(tmpPath, targetPath)
    fs.rmSync(binPath, { force: true })
    fs.rmSync(glibcDir, { recursive: true, force: true })
  } else {
    console.log('System glibc is too old for lightpanda, use a glibc runtime')
    const loader = await installGlibcRuntime(glibcDir)
    fs.renameSync(tmpPath, binPath)
    fs.writeFileSync(
      targetPath,
      [
        '#!/bin/sh',
        '# NOTE - Generated by config/utils/LightpandaInstaller.mjs: run lightpanda',
        '# with the glibc runtime next to it (the system glibc is too old)',
        'DIR="$(cd "$(dirname "$0")" && pwd)"',
        `exec "$DIR/glibc/${loader}" --library-path "$DIR/glibc" "$DIR/${path.basename(binPath)}" "$@"`,
        '',
      ].join('\n')
    )
    fs.chmodSync(targetPath, 0o755)
  }

  console.log(`Lightpanda ${LIGHTPANDA_VERSION} installed at ${targetPath}`)
} // installLightpanda
