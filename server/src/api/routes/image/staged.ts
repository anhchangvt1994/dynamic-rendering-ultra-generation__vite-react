import fs from 'fs'

export const stagedFile = (webp: string) => webp.replace(/\.webp$/, '.gif')

export const writeAtomic = async (file: string, body: Buffer) => {
  const tmp = `${file}.${process.pid}.tmp`
  await fs.promises.writeFile(tmp, body)
  await fs.promises.rename(tmp, file)
}

export const removeFile = (file: string) =>
  fs.promises.rm(file, { force: true })
