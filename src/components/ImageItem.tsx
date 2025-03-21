const Image = styled.img`
	display: block;
	background-color: #fdfffc;
	width: 100%;
	height: 100%;
	object-fit: contain;

	&[src=''] {
		display: none;
	}
`

export const Outer = styled.div`
	height: 100px;
	width: 100%;
	&.--is-error {
		background: url('/images/icons/image-loading-icon.png') center/24px 24px
			no-repeat;

		& ${Image} {
			display: none;
		}
	}
`

function ImageItem(props) {
	const [isError, setIsError] = useState(false)

	const onErrorHandler = () => {
		setIsError(true)
	}

	return (
		<Outer className={isError ? '--is-error' : ''}>
			<Image {...props} onError={onErrorHandler} />
		</Outer>
	)
}

// const ImageItem = memo(Component)

export default ImageItem
