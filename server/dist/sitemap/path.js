"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _nodepath = require('node:path'); var _nodepath2 = _interopRequireDefault(_nodepath);

// Root-scoped sitemap URLs can describe every path on the site. Keep the
// legacy /sitemaps/*.xml route for existing callers and prerender file layout.
 const resolveSitemapFile = (root, url, query = '') => {
  if (url === '/sitemap.xml') {
    const files = new URLSearchParams(query).getAll('file')
    if (!files.length) return _nodepath2.default.join(root, 'sitemap.xml')
    if (files.length !== 1 || !/^[a-zA-Z0-9_-]+\.xml$/.test(files[0]))
      throw new Error('Invalid sitemap filename')
    return _nodepath2.default.join(root, 'sitemaps', files[0])
  }
  const name = url.startsWith('/sitemaps/')
    ? url.slice('/sitemaps/'.length)
    : ''
  if (!/^[a-zA-Z0-9_-]+\.xml$/.test(name))
    throw new Error('Invalid sitemap filename')
  return _nodepath2.default.join(root, 'sitemaps', name)
}; exports.resolveSitemapFile = resolveSitemapFile
