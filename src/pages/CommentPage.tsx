import CommentSection from 'components/comment-page/CommentSection'
import CommentRow from 'components/comment-page/CommentRow'

const Page = styled.div``

function CommentPages() {
  return (
    <Page>
      <CommentSection>
        <CommentRow total={7} />
      </CommentSection>
    </Page>
  )
}

export default CommentPages
