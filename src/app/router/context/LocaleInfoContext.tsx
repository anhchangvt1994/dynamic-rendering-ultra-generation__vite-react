export type ILocaleInfo = {
  lang?: string
  country?: string
}

const INIT_LOCALE_INFO: ILocaleInfo = {}

export const LocaleInfoContext = createContext<{
  localeState: ILocaleInfo
  setLocaleState: Dispatch<SetStateAction<ILocaleInfo>>
}>({
  localeState: INIT_LOCALE_INFO,
  setLocaleState: () => null,
})

export function LocaleInfoProvider({ children }) {
  const [localeState, setLocaleState] = useReducer(
    (curData, newData) => ({
      ...curData,
      ...newData,
    }),
    INIT_LOCALE_INFO
  )

  return (
    <LocaleInfoContext.Provider
      value={{
        localeState,
        setLocaleState,
      }}
    >
      {children}
    </LocaleInfoContext.Provider>
  )
}

export function useLocaleInfo() {
  return useContext(LocaleInfoContext)
}
