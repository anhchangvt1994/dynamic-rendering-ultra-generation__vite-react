import fs from 'fs'
import mime from 'mime-types'
import path from 'path'
import sharp from 'sharp'
import Console from '../ConsoleHandler'
import { getResourcePath } from '../PathHandler'
import { IMAGE_MIME_TYPE_LIST_WITHOUT_SVG } from './constants'

const ImageManager = (
  url: string,
  options?: {
    enableOptimize?: boolean
  }
) => {
  const _options = {
    enableOptimize: false,
    ...options,
  }

  const enableOptimize = _options.enableOptimize

  const pathname = (() => {
    switch (true) {
      case url.startsWith('http'):
        return new URL(url).pathname
      case url.startsWith('/'):
        return url
      default:
        return `/${url}`
    }
  })()

  const _distPath = path.resolve(__dirname, '../../../dist')
  const _resourcePath = getResourcePath()

  const distPathName = path.join(_distPath, pathname)
  const resourcePathName = path.join(_resourcePath, pathname)

  const get = () => {
    if (!url) {
      Console.error('Need provide "url" param!')
      return null
    }

    const resourceOptimizePathName = path.join(
      _resourcePath,
      'optimize',
      pathname
    )

    if (enableOptimize && fs.existsSync(resourceOptimizePathName)) {
      try {
        const content = fs.readFileSync(resourceOptimizePathName)

        return content
      } catch (error) {
        Console.error(`Failed to read optimized file: ${error.message}`)
      }
    }

    const correctPathName = distPathName || resourcePathName

    if (fs.existsSync(correctPathName)) {
      try {
        const content = fs.readFileSync(correctPathName)
        return content
      } catch (error) {
        Console.error(`Failed to read file: ${error.message}`)
      }
    }

    return null
  } // get

  const set = (content: NonSharedBuffer) => {
    if (!content) {
      Console.error('Need to provide "content" param!')
      return
    }

    const _targetPath = resourcePathName

    const targetPathName = path.join(
      _targetPath,
      pathname.replace('.', '_optimized.')
    )

    try {
      fs.writeFileSync(targetPathName, content)
    } catch (error) {
      Console.error(`Failed to write file: ${error.message}`)
    }
  } // set

  const remove = () => {
    const _targetPath = resourcePathName

    const targetPathName = path.join(
      _targetPath,
      pathname.replace('.', '_optimized.')
    )

    if (!fs.existsSync(targetPathName)) return

    try {
      fs.unlinkSync(targetPathName)
    } catch (error) {
      Console.error(`Failed to remove file: ${error.message}`)
    }
  } // remove

  const optimize = () => {} // optimize

  const isExist = () => {} // isExist
} // ImageManager

export default ImageManager

export const optimizeImage = async (path: string): Promise<File> => {
  if (!path) {
    throw new Error('Path is required to optimize the image.')
  }

  const mimeType = mime.lookup(path) || ''

  try {
    let optimizedImage: Buffer
    let fileName = 'optimized-image'
    let fileType = mimeType

    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      optimizedImage = await sharp(path)
        .resize(200)
        .jpeg({ mozjpeg: true, quality: 80 })
        .toBuffer()
      fileName += '.jpg'
      fileType = 'image/jpeg'
    } else if (mimeType === 'image/png') {
      optimizedImage = await sharp(path)
        .resize(200)
        .png({ quality: 80, compressionLevel: 9 })
        .toBuffer()
      fileName += '.png'
      fileType = 'image/png'
    } else if (mimeType === 'image/webp') {
      optimizedImage = await sharp(path)
        .resize(200)
        .webp({ quality: 80 })
        .toBuffer()
      fileName += '.webp'
      fileType = 'image/webp'
    } else if (mimeType === 'image/gif') {
      optimizedImage = await sharp(path).resize(200).gif().toBuffer()
      fileName += '.gif'
      fileType = 'image/gif'
    }

    return new File([new Uint8Array(optimizedImage)], fileName, {
      type: fileType,
    })
  } catch (error) {
    throw new Error(`Failed to optimize image: ${error.message}`)
  }
} // optimizeImage

export const isImage = (mimeType: string): boolean => {
  return IMAGE_MIME_TYPE_LIST_WITHOUT_SVG.includes(mimeType)
} // isImage
