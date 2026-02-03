export interface IBotInfo {
  isBot: boolean
  name: string
  nickName?: string
}

export interface IDeviceInfo {
  type: string
  isMobile: string | boolean
  os: string
}

export interface ILocaleInfo {
  lang: string
  country: string
  clientLang: string
  clientCountry: string
  defaultLang: string
  defaultCountry: string
  langSelected: string
  countrySelected: string
  hideDefaultLocale: boolean
  range: [number, number]
  region: string
  eu: string
  timezone: string
  city: string
  ll: [number, number]
  metro: number
  area: number
}

export interface IRequestHeadersOptional {
  // Authentication & Authorization
  authorization?: string
  'proxy-authorization'?: string

  // Content Negotiation
  accept?: string
  'accept-charset'?: string
  'accept-encoding'?: string
  'accept-language'?: string

  // Request Modifiers
  'cache-control'?: string
  pragma?: string
  expect?: string

  // Conditional Requests
  'if-match'?: string
  'if-modified-since'?: string
  'if-none-match'?: string
  'if-unmodified-since'?: string
  'if-range'?: string

  // Content Headers
  'content-type'?: string
  'content-length'?: string
  'content-md5'?: string
  'content-encoding'?: string
  'content-language'?: string
  'content-location'?: string

  // CORS
  origin?: string
  'access-control-request-method'?: string
  'access-control-request-headers'?: string

  // Connection Management
  connection?: string
  'keep-alive'?: string
  'upgrade-insecure-requests'?: string

  // Proxy / Networking
  via?: string
  forwarded?: string
  'x-forwarded-for'?: string
  'x-forwarded-host'?: string
  'x-forwarded-proto'?: string
  'x-real-ip'?: string

  // Client Info
  'user-agent'?: string
  referer?: string
  host?: string
  cookie?: string
  date?: string

  // Security
  dnt?: string // Do Not Track
  te?: string
  upgrade?: string

  // Custom/Common headers
  'x-request-id'?: string
  'x-api-key'?: string
  'x-xsrf-token'?: string
  'x-csrf-token'?: string

  // Cloudflare / CDN / Load Balancer
  'cf-ray'?: string
  'cf-connecting-ip'?: string
  'cdn-loop'?: string
}

export interface IRequestBodyOptional {
  // Auth & Security
  username?: string
  password?: string
  email?: string
  token?: string

  // User Info
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
  birthday?: string

  // Pagination / Filtering
  page?: number
  limit?: number
  sortBy?: string
  order?: 'asc' | 'desc'

  // Data submission
  title?: string
  description?: string
  content?: string
  imageUrl?: string

  // Flags / State
  isActive?: boolean
  isVerified?: boolean

  // Nested or complex objects
  metadata?: Record<string, any>
  preferences?: {
    theme?: 'dark' | 'light'
    notifications?: boolean
  }

  // Custom ID fields
  userId?: string
  productId?: string
}
