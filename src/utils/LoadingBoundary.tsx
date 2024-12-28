import type { ReactElement, ReactNode, MutableRefObject } from 'react'

function useWithDelay(delay: number, fallback: ReactNode): ReactNode {
	const [isShow, setIsShow] = useState(delay === 0 ? true : false)

	const timeout: MutableRefObject<NodeJS.Timeout | null> = useRef(null)

	useEffect(() => {
		if (!isShow) {
			timeout.current = setTimeout(function () {
				setIsShow(true)
			}, delay)
		}
	}, [delay])

	return isShow ? fallback : ''
}

export default function LoadingBoundary({
	children,
	delay,
	fallback,
}: {
	children?: ReactNode | undefined
	delay?: number
	fallback?: ReactNode
}): ReactElement {
	const delayTime: number = Number(delay) || 0
	const timestamp = Date.now()

	const Component: ReactNode = useWithDelay(delayTime, fallback)

	return (
		<Suspense fallback={Component} key={timestamp}>
			{children}
		</Suspense>
	)
} // LoadingBoundary
