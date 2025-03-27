export type IUserInfo = {
  email: string
}

const INIT_USER_INFO: IUserInfo = { email: '' }

export const UserInfoContext = createContext<{
  userState: IUserInfo
  setUserState: Dispatch<SetStateAction<IUserInfo>>
}>({
  userState: INIT_USER_INFO,
  setUserState: () => null,
})

export function UserInfoProvider({ children }) {
  const [userState, setUserState] = useReducer(
    (currentData, updateData) => ({
      ...currentData,
      ...updateData,
    }),
    INIT_USER_INFO
  )

  return (
    <UserInfoContext.Provider
      value={{
        userState,
        setUserState,
      }}
    >
      {children}
    </UserInfoContext.Provider>
  )
} // UserInfoDeliver()

export function useUserInfo() {
  return useContext(UserInfoContext)
} // useUserInfo()
