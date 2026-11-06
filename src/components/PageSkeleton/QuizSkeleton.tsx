import { ACCOUNTS_ENABLED, hasStoredSession } from 'app/supabase/client'
import QuickLinks from 'pages/QuizPage/QuickLinks'
import ReadyScreen from 'pages/QuizPage/ReadyScreen'
import { modeFor } from 'pages/QuizPage/engine/mode'
import { QuizStyle } from 'pages/QuizPage/styles'

// The page's first screen (QuizStyle, data-phase="ready") with its own
// pieces, so the two can not drift: the ready card in its loading state, the
// settings panel at its size, the guest's call when there will be one, the
// bag and collection links.
const QuizSkeletonStyle = styled(QuizStyle)`
  .settings .bone {
    height: 50px;
    border-radius: 12px;
  }
  .settings .bone + .bone {
    height: 54px;
    border-radius: 14px;
  }
  @media (max-width: 680px) {
    .settings .bone:first-child {
      height: 44px;
    }
  }
`

// who will play as a guest (no rewards): a stored session plays the account's
const guestPlay = () =>
  ACCOUNTS_ENABLED &&
  modeFor(hasStoredSession() ? 'signed-in' : 'signed-out') === 'guest'

export default function QuizSkeleton() {
  const guest = guestPlay()
  return (
    <QuizSkeletonStyle
      className="quiz-page"
      data-phase="ready"
      data-tone="dark"
      data-page-skeleton
    >
      <div className="arena">
        <ReadyScreen action="loading" rewards={!guest} />
        <div className="settings" data-open aria-hidden="true">
          <span className="bone" />
          <span className="bone" />
          <p className="settings-note">Áp dụng khi bạn bấm Sẵn sàng.</p>
        </div>
        {guest && (
          <LinkCustom className="guest-call" to="/dang-nhap">
            Đăng nhập để chơi kèm phần thưởng
          </LinkCustom>
        )}
        <QuickLinks bagCount={0} />
      </div>
    </QuizSkeletonStyle>
  )
}
