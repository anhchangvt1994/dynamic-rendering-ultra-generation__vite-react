import fs from 'fs'

const splitChunkNodeModulesRegex = /node_modules\/([^/]+)/g

let totalVendorFile = 1
const chunkList: {
  [key: string]: {
    size: number
    chunks: string[]
  }
} = {
  vendor_1: {
    size: 0,
    chunks: [],
  },
}

const splitChunkNodeModules = (pathName: string): boolean | string => {
  if (!pathName || !splitChunkNodeModulesRegex.test(pathName)) {
    return false
  }

  const name = pathName.match(splitChunkNodeModulesRegex)?.[0] ?? pathName

  switch (true) {
    // case name.includes('@mui') && pathName.includes('@mui/material'):
    //   return '@mui/material'
    // case name.includes('@mui') && pathName.includes('@mui/x-data-grid'):
    //   return '@mui/x-data-grid'
    // case name.includes('@mui') && pathName.includes('@mui/x-internals'):
    //   return '@mui/x-internals'
    // case name.includes('@mui') && pathName.includes('@mui/private-theming'):
    //   return '@mui/private-theming'
    // case name.includes('@mui') && pathName.includes('@mui/system'):
    //   return '@mui/system'
    // case name.includes('@mui') && pathName.includes('@mui/icons-material'):
    //   return '@mui/icons-material'
    // case name.includes('@mui') && pathName.includes('@mui/utils'):
    //   return '@mui/utils'
    // case name.includes('@mui') && pathName.includes('@mui/styled-engine'):
    //   return '@mui/styled-engine'
    // case name.includes('@mui') && pathName.includes('@mui/styled-engine-sc'):
    //   return '@mui/styled-engine-sc'
    // case name.includes('@mui') && pathName.includes('@mui/lab'):
    //   return '@mui/lab'
    case name.includes('@mui'):
      return pathName.match(/@mui\/([^/]+)/g)?.[0] ?? '@mui'
    default: {
      if (
        (name.includes('react') &&
          !/node_modules\/(react-transition-group|react-i18next|react-router|react-redux|react-toastify|react-html-parser|react-hook-form)$/g.test(
            name
          )) ||
        /^(prosemirror)/.test(name.replace('node_modules/', ''))
      )
        return name

      // if (/node_modules\/(@emotion|@headlessui|@heroicons|@hookform|@reduxjs|@testing-library|axios|dompurify|i18next|styled-components|yup|react-transition-group|hoist-non-react-statics|react-is)$/g.test(name)) return name
      // if (/node_modules\/(react|react-dom|react-transition-group|hoist-non-react-statics|react-is)$/g.test(name)) return name

      const correctPath = pathName
        .split('?')[0]
        .replace(/[\x00-\x1F\x7F-\xA0]+/g, '')
      let tmpChunkName = ''

      try {
        const stats = fs.statSync(correctPath)

        for (const chunkName in chunkList) {
          if (!chunkName) continue

          const vendorInfo = chunkList[chunkName]

          const tmpSize = vendorInfo.size + stats.size

          if (
            vendorInfo.chunks.includes(name) ||
            // vendorInfo.chunks.includes(name.split('-')[0]) ||
            tmpSize <= 250000
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
          totalVendorFile += 1
          const newFileName = `vendor_${totalVendorFile}`
          chunkList[newFileName] = {
            size: stats.size,
            // chunks: name,
            chunks: [name],
          }
          tmpChunkName = newFileName
        }
      } catch (err) {
        console.log(err)
      }

      return tmpChunkName
    }
  }
} // splitChunkNodeModules

export default splitChunkNodeModules
