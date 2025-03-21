import { ReactElement } from 'react'

export type ILoadingInfo = {
	isShow: boolean
	element: ReactElement
}

export const INIT_LOADING_INFO: ILoadingInfo = {
	isShow: false,
	element: <></>,
}

export const LoadingInfoContext = createContext<{
	loadingState: ILoadingInfo
	setLoadingState: Dispatch<SetStateAction<ILoadingInfo>>
}>({
	loadingState: INIT_LOADING_INFO,
	setLoadingState: () => null,
})

export function LoadingInfoProvider({ children }) {
	const [loadingState, setLoadingState] = useReducer(
		(currentData, updateData) => ({
			...currentData,
			...updateData,
		}),
		INIT_LOADING_INFO
	)

	return (
		<LoadingInfoContext.Provider
			value={{
				loadingState,
				setLoadingState,
			}}
		>
			{children}
		</LoadingInfoContext.Provider>
	)
} // LoadingInfoProvider

export function useLoadingInfo() {
	return useContext(LoadingInfoContext)
} // useLoadingInfo
