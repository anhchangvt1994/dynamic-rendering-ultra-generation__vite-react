import ImageItem, { Outer as ImageOuter } from 'components/ImageItem'

const Section = styled.section`
	${ImageOuter} {
		height: 200px;
		max-width: 320px;
		margin: 0 auto;
		border: 1px solid ${import.meta.env.STYLE_COLOR_DARK};
	}
`
const Caption = styled.div`
	font-size: 12px;
	color: ${rgba(import.meta.env.STYLE_COLOR_DARK, 0.5)};
	margin-top: 8px;
`
const Content = styled.div`
	margin-top: 16px;
`

const NameLabel = styled.p`
	width: 25%;
	height: 18px;
	background: ${rgba(import.meta.env.STYLE_COLOR_DARK, 0.1)};
	margin-bottom: 8px;
`
const ContentLabel = styled.div`
	width: 100%;
	height: 16px;
	margin-bottom: 8px;
	background: ${rgba(import.meta.env.STYLE_COLOR_DARK, 0.1)};

	&:last-child {
		margin-bottom: 0;
	}
`

export default function ModuleContentSection({
	src,
	caption,
	content,
}: {
	src?: string
	caption: string
	content: string
}) {
	return (
		<Section>
			<ImageItem src={src || ''} alt={caption} />
			{RenderingInfo.loader ? (
				<NameLabel style={{ marginBottom: '26px' }} />
			) : (
				<Caption>{caption}</Caption>
			)}
			{RenderingInfo.loader ? (
				[<ContentLabel />, <ContentLabel style={{ width: '50%' }} />]
			) : (
				<Content>{content}</Content>
			)}
		</Section>
	)
}
