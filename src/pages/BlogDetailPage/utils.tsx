import { BoldStyle, ItalicStyle, LinkStyle, UnderlineStyle } from './styles'

const generateTextFromBlock = (block: { [key: string]: any }) => {
  if (block) {
    if (block.type === 'text' && !block.text)
      return (
        <>
          <br />
          <br />
        </>
      )

    if (block.type === 'link' && block.text)
      return <LinkStyle href={block.url}>{block.text}</LinkStyle>

    if (block.type === 'link' && block.children && block.children.length > 0) {
      return (
        <LinkStyle href={block.url}>
          {block.children.map((block) => generateTextFromBlock(block))}
        </LinkStyle>
      )
    }

    if (block.bold && block.text) return <BoldStyle>{block.text}</BoldStyle>

    if (block.italic && block.text)
      return <ItalicStyle>{block.text}</ItalicStyle>

    if (block.underline && block.text)
      return <UnderlineStyle>{block.text}</UnderlineStyle>

    if (block.type === 'text' && block.text) return <span>{block.text}</span>

    if (block.children && block.children.length > 0) {
      return block.children.map((block) => generateTextFromBlock(block))
    }
  }

  return null
} // generateTextFromBlock

export const generateDescription = (content: any[] = []) => {
  return <>{content.map((block) => generateTextFromBlock(block))}</>
}
