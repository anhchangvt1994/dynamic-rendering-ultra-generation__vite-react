// NOTE - Third-party code in a few stable, separately cached chunks, sized
// for the 150 KB-per-file budget (build.chunkSizeWarningLimit). Packages
// that work together stay together; React, React DOM and Scheduler share
// one chunk so no chunk cycle can run Scheduler's CommonJS exports before
// they exist. Anything not listed stays with the code that imports it.
// React DOM's client is the one file over budget: it ships as a single
// ~250 KB module, which no bundler can split.
const VENDOR_GROUPS: [name: string, packages: RegExp][] = [
  [
    'react-runtime',
    /node_modules\/(react|react-dom|scheduler|react-is|use-sync-external-store)\//,
  ],
  ['router', /node_modules\/(react-router|cookie|set-cookie-parser)\//],
  [
    'redux',
    /node_modules\/(@reduxjs\/toolkit|redux|redux-thunk|react-redux|immer|reselect)\//,
  ],
  [
    'styled',
    /node_modules\/(styled-components|stylis|@emotion|shallowequal|tslib|postcss-value-parser|css-to-react-native|camelize|css-color-keywords)\//,
  ],
  ['swiper', /node_modules\/(swiper|ssr-window|dom7)\//],
]

const splitChunkVendors = (pathName: string): boolean | string => {
  if (!pathName || !pathName.includes('node_modules/')) return false
  return (
    VENDOR_GROUPS.find(([, packages]) => packages.test(pathName))?.[0] ?? false
  )
} // splitChunkVendors

export default splitChunkVendors
