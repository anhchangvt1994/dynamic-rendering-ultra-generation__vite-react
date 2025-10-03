interface IStateOptional {
  totalVendorFiles?: number,
  maxSize?: number,
  prefix?: string,
  chunkList?: {
    [key: string]: {
      size: number,
      chunks: string[]
    }
  }
}

type IState = Required<IStateOptional>

export interface IStore {
  state: IState & { [key: string]: any }

  get(key?: string): NonNullable<IState>
  set(key: string, value: any): void
} // IStore

export const initStore = (initState?: IStateOptional): IStore => ({
  state: {
    totalVendorFiles: 0,
    maxSize: 200000,
    prefix: 'global',
    chunkList: {},
    ...(initState || {})
  },
  get(key) {
    if (!key) return this.state

    return this.state[key]
  },
  set(key, value) {
    this.state[key] = value
  }
}) // initStore

const store = initStore()

export default store
