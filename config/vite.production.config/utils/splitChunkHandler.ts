import type { IStore } from '../store';
import store from '../store';
import getFileSize from './getFileSize';

const splitChunkHandler = () => {
  let _store: IStore

  const _splitChunkHandler = (filePath: string, splitChunkRegex: RegExp) => {
    if (!filePath) return

    const { chunkList, maxSize, prefix, totalVendorFiles } = _store.get()

    const name = splitChunkRegex ? (filePath.match(splitChunkRegex)?.[0]?.split('/')[0] ?? filePath) : filePath
    let tmpChunkName = ''

    const size = getFileSize(filePath)

    for (const chunkName in chunkList) {
      if (!chunkName) continue

      const vendorInfo = chunkList[chunkName]
      const tmpSize = vendorInfo.size + size

      if (
        vendorInfo.chunks.includes(name) ||
        // vendorInfo.chunks.includes(name.split('-')[0]) ||
        tmpSize <= maxSize
      ) {
        chunkList[chunkName].size = tmpSize

        if (!vendorInfo.chunks.includes(name)) {
          // vendorInfo.chunks += `,${name}`
          vendorInfo.chunks.push(name)
        }

        tmpChunkName = chunkName
        break
      }
    }

    if (!tmpChunkName) {
      _store.set('totalVendorFiles', totalVendorFiles + 1)
      const newFileName = `${prefix}_${_store.get('totalVendorFiles')}`
      chunkList[newFileName] = {
        size: size,
        // chunks: name,
        chunks: [name],
      }
      tmpChunkName = newFileName
    }

    return tmpChunkName
  } // _splitChunkHandler

  const _init = (chunkStore: IStore = store) => {
    _store = chunkStore

    const { prefix, totalVendorFiles, chunkList } = _store.get()

    chunkList[`${prefix}_${totalVendorFiles}`] = {
      size: 0,
      chunks: []
    }

    return _splitChunkHandler
  } // _init

  return {
    init: _init
  }
} // splitChunkHandler

export default splitChunkHandler
