export type IStatus = undefined | 'fetch' | 'ready'

export interface IGetCacheOptionsParam {
  autoCreateIfEmpty?: {
    enable: boolean
    status?: IStatus
  }
  updateRequestTime?: boolean
  sizeLimit?: number
}

export interface IGetCacheOptionsNonNullableParam {
  autoCreateIfEmpty: {
    enable: boolean
    status?: IStatus
  }
  updateRequestTime: boolean
  sizeLimit?: number
}

export interface ISetCacheOptionsParam {
  isCompress: boolean
  status?: IStatus
}

export type ICacheResult =
  | {
      url?: URL | RequestInfo
      body?: BodyInit | null
      headers?: HeadersInit
      method?: string
      data?: string[]
      cache?:
        | string
        | Buffer
        | {
            expiredTime: number
            status: number
            message?: string
            data: any
            [key: string]: any
          }
      createdAt: Date
      updatedAt: Date
      requestedAt: Date
      modifiedAt: Date
      changedAt: Date
      status: IStatus
    }
  | undefined

export interface ISetCacheContent {
  url: URL | RequestInfo
  body?: BodyInit | null
  headers?: HeadersInit
  method: string
  cache?:
    | string
    | Buffer
    | {
        expiredTime: number
        status: number
        message?: string | undefined
        data: any
        [key: string]: any
      }
}

export interface ICacheSetParams {
  directory: string
  key: string
  extension: 'json' | 'br'
  content: string | ISetCacheContent
  isCompress: boolean
}

export type IFileInfo =
  | {
      size: number
      createdAt: Date
      updatedAt: Date
      modifiedAt: Date
      changedAt: Date
      requestedAt: Date
    }
  | undefined
