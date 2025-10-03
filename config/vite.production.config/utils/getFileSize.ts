import fs from 'fs'

const getFileSize = (filePath: string) => {
  if (!filePath) return 0
  const correctPath = filePath.split('?')[0].replace(/[\x00-\x1F\x7F-\xA0]+/g, '')

  try {
    const stats = fs.statSync(correctPath)

    return stats.size / 5
  } catch (error) {
    console.error(error)
    return 0
  }
} // getFileSize


export default getFileSize
