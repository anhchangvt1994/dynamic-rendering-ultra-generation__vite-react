interface IWorkerInfo {
  counter: number
}

export interface IWorkerInfoList {
  [key: string]: IWorkerInfo
}

export interface IStores {
  browser: {
    userDataPath?: string
    reserveUserDataPath?: string
    wsEndpoint?: string
  }
  outdateBrowser: Set<string>
  threadAdvanceInfo: {
    order: number
  }
  totalRequestToCrawl: number
  headers: {
    botInfo?: string
    deviceInfo?: string
    localeInfo?: string
    accept?: string
  }
  promise: {
    executablePath?: Promise<string>
  }
  api: {
    cache: Map<
      string,
      {
        fetch: () => Promise<any>
        controller?: AbortController
        destroy: NodeJS.Timeout
        updateAt: number
        createAt: number
      }
    >
    store: Map<
      string,
      {
        list: string[]
        destroy: NodeJS.Timeout
        updateAt: number
      }
    >
  }
}
