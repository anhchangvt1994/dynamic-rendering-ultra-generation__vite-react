export interface ISitemapInfo {
  file: string
  mainFile: string
  loc: string
  mainLoc: string
  lastmod: string
  changefreq:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority: number
}
