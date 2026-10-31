import type { SupabaseClient } from '@supabase/supabase-js'
import { connectAccount, signOut, useAccount } from 'app/supabase/account'
import { authMessage } from 'app/supabase/messages'
import FieldIcon, { Pokeball } from 'components/common/FieldIcon'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { getCaught } from 'utils/caught.mjs'
import { AccountPageStyle } from './styles'

type CodeType = 'signup' | 'email' | 'recovery'
type Step =
  | { name: 'form' }
  | { name: 'forgot' }
  | { name: 'verify'; email: string; type: CodeType }
  | { name: 'new-password' }

const RESEND_SECONDS = 60
const CODE = /^\d{6}$/
// the rule of supabase/config.toml: 8+ characters, letters and digits
const strongEnough = (password: string) =>
  password.length >= 8 && /[a-z]/i.test(password) && /\d/.test(password)

/** Where a code is sent, what it does, how to ask for another */
const CODES: Record<
  CodeType,
  {
    title: string
    action: string
    resend: (
      supabase: SupabaseClient,
      email: string
    ) => Promise<{ error: unknown }>
  }
> = {
  signup: {
    title: 'Xác nhận email',
    action: 'Kích hoạt tài khoản',
    resend: (supabase, email) =>
      supabase.auth.resend({ type: 'signup', email }),
  },
  email: {
    title: 'Nhập mã đăng nhập',
    action: 'Đăng nhập',
    resend: (supabase, email) =>
      supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      }),
  },
  recovery: {
    title: 'Đặt lại mật khẩu',
    action: 'Tiếp tục',
    resend: (supabase, email) => supabase.auth.resetPasswordForEmail(email),
  },
}

/**
 * /dang-nhap: sign in with a password or a 6-digit code sent by email,
 * create an account, reset a password; signed in, the account itself.
 * Every email carries a code typed here, never a link: a link opens in the
 * mail app's own browser, away from this page and its session.
 */
export default function AccountPage() {
  setSeoTag({
    title: 'Đăng nhập | Pokédex',
    description:
      'Đăng nhập để giữ bộ sưu tập Pokémon của bạn trên mọi thiết bị.',
    robots: 'noindex, nofollow',
  })

  const account = useAccount()
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as { from?: string } | null)?.from

  const [step, setStep] = useState<Step>({ name: 'form' })
  const [mode, setMode] = useState<'password' | 'code'>('password')
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // the client is needed on this page: load it now, not on submit
  useEffect(() => {
    connectAccount().catch(() => {
      // reported on submit
    })
  }, [])

  // resend countdown
  useEffect(() => {
    if (resendAt <= now) return
    const timer = setTimeout(() => setNow(Date.now()), 1000)
    return () => clearTimeout(timer)
  }, [resendAt, now])
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000))

  const codeRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (step.name === 'verify') codeRef.current?.focus()
  }, [step])

  const run = async (work: (supabase: SupabaseClient) => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await work(await connectAccount())
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }
  const check = ({ error }: { error: unknown }) => {
    if (error) throw error
  }
  const sendCode = (type: CodeType) => {
    setStep({ name: 'verify', email: email.trim(), type })
    setCode('')
    setResendAt(Date.now() + RESEND_SECONDS * 1000)
    setNow(Date.now())
  }
  const done = () => navigate(from || '/?view=caught', { replace: true })

  const onSubmitForm = (event: FormEvent) => {
    event.preventDefault()
    const address = email.trim()
    if (mode === 'code')
      return run(async (supabase) => {
        check(
          await supabase.auth.signInWithOtp({
            email: address,
            options: { shouldCreateUser: true },
          })
        )
        sendCode('email')
      })
    if (creating) {
      if (!strongEnough(password))
        return setError('Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.')
      return run(async (supabase) => {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
        })
        check({ error })
        // NOTE - An email that already has an account comes back with no
        // identity, and no email is sent
        if (data.user && !data.user.identities?.length)
          throw { code: 'user_already_exists' }
        sendCode('signup')
      })
    }
    return run(async (supabase) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: address,
        password,
      })
      if ((error as { code?: string } | null)?.code === 'email_not_confirmed') {
        check(await supabase.auth.resend({ type: 'signup', email: address }))
        sendCode('signup')
        setNotice('Email này chưa được xác nhận: mã mới vừa được gửi.')
        return
      }
      check({ error })
      done()
    })
  }

  const onSubmitForgot = (event: FormEvent) => {
    event.preventDefault()
    run(async (supabase) => {
      check(await supabase.auth.resetPasswordForEmail(email.trim()))
      sendCode('recovery')
    })
  }

  const onSubmitCode = (event: FormEvent) => {
    event.preventDefault()
    if (step.name !== 'verify') return
    if (!CODE.test(code)) return setError('Mã gồm 6 chữ số.')
    run(async (supabase) => {
      check(
        await supabase.auth.verifyOtp({
          email: step.email,
          token: code,
          type: step.type,
        })
      )
      if (step.type === 'recovery') {
        setPassword('')
        setStep({ name: 'new-password' })
      } else done()
    })
  }

  const onResend = () => {
    if (step.name !== 'verify' || resendIn) return
    run(async (supabase) => {
      check(await CODES[step.type].resend(supabase, step.email))
      setResendAt(Date.now() + RESEND_SECONDS * 1000)
      setNow(Date.now())
      setNotice('Đã gửi mã mới.')
    })
  }

  const onSubmitNewPassword = (event: FormEvent) => {
    event.preventDefault()
    if (!strongEnough(password))
      return setError('Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.')
    run(async (supabase) => {
      check(await supabase.auth.updateUser({ password }))
      done()
    })
  }

  const passwordField = (autoComplete: string, label = 'Mật khẩu') => (
    <label className="field">
      <span>{label}</span>
      <span className="password">
        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === 'new-password' ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className="reveal"
          aria-pressed={showPassword}
          onClick={() => setShowPassword((shown) => !shown)}
        >
          {showPassword ? 'Ẩn' : 'Hiện'}
        </button>
      </span>
      {autoComplete === 'new-password' && (
        <small>Ít nhất 8 ký tự, có cả chữ và số.</small>
      )}
    </label>
  )
  const emailField = (
    <label className="field">
      <span>Email</span>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </label>
  )

  let title: string
  let lead: ReactNode
  let body: ReactNode

  if (account.status === 'signed-in' && step.name !== 'new-password') {
    title = 'Sổ tay của bạn'
    lead = 'Bộ sưu tập đang được lưu vào tài khoản này.'
    body = (
      <div className="signed-in">
        <p className="who">
          <span className="avatar" aria-hidden="true">
            {(account.user?.email || '?').charAt(0).toUpperCase()}
          </span>
          <span>
            <small>Đã đăng nhập</small>
            <strong>{account.user?.email}</strong>
          </span>
        </p>
        <p className="count">
          <strong>{getCaught().size}</strong> Pokémon trong bộ sưu tập
        </p>
        <LinkCustom className="primary" to="/?view=caught">
          Xem bộ sưu tập
        </LinkCustom>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await signOut()
            })
          }
        >
          Đăng xuất khỏi thiết bị này
        </button>
      </div>
    )
  } else if (step.name === 'verify') {
    title = CODES[step.type].title
    lead = (
      <>
        Nhập mã 6 số vừa gửi tới <strong>{step.email}</strong>.
      </>
    )
    body = (
      <form onSubmit={onSubmitCode} noValidate>
        <label className="field">
          <span>Mã xác nhận</span>
          <input
            ref={codeRef}
            className="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Đang kiểm tra…' : CODES[step.type].action}
        </button>
        <div className="row">
          <button
            type="button"
            className="text"
            disabled={busy || resendIn > 0}
            onClick={onResend}
          >
            {resendIn ? `Gửi lại mã sau ${resendIn}s` : 'Gửi lại mã'}
          </button>
          <button
            type="button"
            className="text"
            onClick={() => {
              setError('')
              setNotice('')
              setStep({ name: 'form' })
            }}
          >
            Đổi email
          </button>
        </div>
        <p className="hint">
          Không thấy email? Xem thử thư mục Spam hoặc Quảng cáo.
        </p>
      </form>
    )
  } else if (step.name === 'forgot') {
    title = 'Quên mật khẩu'
    lead = 'Nhập email của tài khoản, chúng tôi gửi mã để đặt mật khẩu mới.'
    body = (
      <form onSubmit={onSubmitForgot}>
        {emailField}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Đang gửi…' : 'Gửi mã'}
        </button>
        <div className="row">
          <button
            type="button"
            className="text"
            onClick={() => {
              setError('')
              setStep({ name: 'form' })
            }}
          >
            Quay lại đăng nhập
          </button>
        </div>
      </form>
    )
  } else if (step.name === 'new-password') {
    title = 'Mật khẩu mới'
    lead = 'Chọn mật khẩu mới cho tài khoản của bạn.'
    body = (
      <form onSubmit={onSubmitNewPassword}>
        {passwordField('new-password', 'Mật khẩu mới')}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
        </button>
      </form>
    )
  } else {
    title = creating && mode === 'password' ? 'Tạo tài khoản' : 'Đăng nhập'
    lead = 'Giữ bộ sưu tập Pokémon của bạn trên mọi thiết bị.'
    body = (
      <form onSubmit={onSubmitForm}>
        <div className="modes" role="group" aria-label="Cách đăng nhập">
          <button
            type="button"
            aria-pressed={mode === 'password'}
            onClick={() => {
              setError('')
              setMode('password')
            }}
          >
            Mật khẩu
          </button>
          <button
            type="button"
            aria-pressed={mode === 'code'}
            onClick={() => {
              setError('')
              setMode('code')
            }}
          >
            Mã qua email
          </button>
        </div>
        {emailField}
        {mode === 'password' &&
          passwordField(creating ? 'new-password' : 'current-password')}
        {mode === 'code' && (
          <p className="hint">
            Chúng tôi gửi mã 6 số tới email này. Chưa có tài khoản thì tài khoản
            sẽ được tạo luôn.
          </p>
        )}
        <button className="primary" type="submit" disabled={busy}>
          {busy
            ? 'Đang gửi…'
            : mode === 'code'
              ? 'Gửi mã đăng nhập'
              : creating
                ? 'Tạo tài khoản'
                : 'Đăng nhập'}
        </button>
        {mode === 'password' && (
          <div className="row">
            <button
              type="button"
              className="text"
              onClick={() => {
                setError('')
                setCreating((value) => !value)
              }}
            >
              {creating ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản mới'}
            </button>
            {!creating && (
              <button
                type="button"
                className="text"
                onClick={() => {
                  setError('')
                  setStep({ name: 'forgot' })
                }}
              >
                Quên mật khẩu?
              </button>
            )}
          </div>
        )}
      </form>
    )
  }

  return (
    <AccountPageStyle>
      <section className="card" aria-labelledby="account-title">
        <div className="cap">
          <span className="eyebrow">POKÉDEX · FIELD NOTES</span>
          <h1 id="account-title">{title}</h1>
          <p>{lead}</p>
        </div>
        <div className="seam" aria-hidden="true">
          <span className={`knob${busy ? ' is-busy' : ''}`}>
            {account.status === 'signed-in' && step.name !== 'new-password' ? (
              <Pokeball />
            ) : (
              <FieldIcon name="user" size={22} />
            )}
          </span>
        </div>
        <div className="body">
          {error && (
            <p className="message is-error" role="alert">
              {error}
            </p>
          )}
          {notice && !error && (
            <p className="message" role="status">
              {notice}
            </p>
          )}
          {body}
          {import.meta.env.DEV && (
            <p className="hint dev">
              Local: email nằm trong Mailpit, cổng 54324 của máy chạy yarn dev.
            </p>
          )}
        </div>
      </section>
    </AccountPageStyle>
  )
}
