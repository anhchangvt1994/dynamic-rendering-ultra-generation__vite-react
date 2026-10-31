import FieldIcon from 'components/common/FieldIcon'
import { AccountPageStyle } from 'pages/AccountPage/styles'
import { boneCss } from './bone'

// The page's own Poké Ball card (AccountPageStyle), with only what every step
// shares: sign in, forgot password, code, new password and signed in all show
// a title and a lead in the cap, then one block, the main button and a line
// of small text. The words wait, since they depend on the step and on a
// session the snapshot can not know. The band's button does the catch wobble
// the page shows while a request runs.
const AccountSkeletonStyle = styled(AccountPageStyle)`
  ${boneCss}

  .cap .bone {
    --bone: rgba(255, 255, 255, 0.2);
    --shine: rgba(255, 255, 255, 0.38);
  }
  /* each line keeps the height of the text it stands for */
  .line {
    display: flex;
    align-items: center;
  }
  /* the page's line-height wins over the h1's 1.2: lines are 1.5× */
  .title {
    height: calc(26px * 1.5);
    margin: 6px 0;
  }
  .title .bone {
    width: 52%;
    height: 24px;
  }
  .lead {
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-around;
    height: 21px;
  }
  .lead .bone {
    width: 88%;
    height: 12px;
  }
  .lead .bone + .bone {
    display: none;
    width: 46%;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .label {
    height: 18px;
  }
  .label .bone {
    width: 64px;
    height: 12px;
  }
  .input {
    height: 48px;
    border-radius: 12px;
  }
  .button {
    height: 50px;
    border-radius: 14px;
  }
  .text {
    height: 44px;
  }
  .text .bone {
    width: 46%;
    height: 12px;
  }

  /* the leads wrap to two lines on phones */
  @media (max-width: 480px) {
    .lead {
      height: 42px;
    }
    .lead .bone + .bone {
      display: block;
    }
  }
  @media (max-width: 400px) {
    .title {
      height: calc(23px * 1.5);
    }
    .title .bone {
      height: 21px;
    }
  }
`

export default function AccountSkeleton() {
  return (
    <AccountSkeletonStyle role="status" aria-busy="true" data-page-skeleton>
      <span className="sr-only">Đang mở sổ tay…</span>
      <div className="card" aria-hidden="true">
        <div className="cap">
          <span className="eyebrow">POKÉDEX · FIELD NOTES</span>
          <div className="line title">
            <span className="bone" />
          </div>
          <div className="line lead">
            <span className="bone" />
            <span className="bone" />
          </div>
        </div>
        <div className="seam">
          <span className="knob is-busy">
            <FieldIcon name="user" size={22} />
          </span>
        </div>
        <div className="body stack">
          <div className="field">
            <div className="line label">
              <span className="bone" />
            </div>
            <span className="bone input" />
          </div>
          <span className="bone button" />
          <div className="line text">
            <span className="bone" />
          </div>
        </div>
      </div>
    </AccountSkeletonStyle>
  )
}
