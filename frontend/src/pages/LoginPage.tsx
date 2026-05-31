import { App } from 'antd'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthComponent } from '../components/ui/sign-up'
import { toChineseAuthError } from '../lib/auth-error'
import { useAuthActions, useRequireAuth } from '../store/AppStore'

type LoginLocationState = {
  from?: string
  email?: string
}

const REMEMBER_PASSWORD_KEY = 'lumislide_remember_password'
const SAVED_EMAIL_KEY = 'lumislide_saved_email'
const SAVED_PASSWORD_KEY = 'lumislide_saved_password'

export default function LoginPage() {
  const { message } = App.useApp()
  const isLoggedIn = useRequireAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [rememberPassword, setRememberPassword] = useState(false)

  const {
    loginEmail,
    loginPassword,
    setLoginEmail,
    setLoginPassword,
    setSessionKeep,
    loginWithCredentials,
  } = useAuthActions()

  const state = location.state as LoginLocationState | null
  const fallbackTo = '/projects'
  const redirectTo = state?.from && state.from.startsWith('/') ? state.from : fallbackTo
  const routeEmail = (state?.email || '').trim().toLowerCase()
  const initialEmail = (routeEmail || loginEmail || '').trim().toLowerCase()

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBER_PASSWORD_KEY) === '1'
    const savedEmail = (window.localStorage.getItem(SAVED_EMAIL_KEY) || '').trim().toLowerCase()
    const savedPassword = window.localStorage.getItem(SAVED_PASSWORD_KEY) || ''

    setRememberPassword(remembered)
    if (routeEmail) {
      setLoginEmail(routeEmail)
    } else if (remembered && savedEmail) {
      setLoginEmail(savedEmail)
    }
    if (remembered && savedPassword) {
      setLoginPassword(savedPassword)
    } else {
      setLoginPassword('')
    }
  }, [routeEmail, setLoginEmail, setLoginPassword])

  const persistRememberedCredentials = (emailRaw: string, passwordRaw: string) => {
    const normalizedEmail = emailRaw.trim().toLowerCase()
    window.localStorage.setItem(REMEMBER_PASSWORD_KEY, '1')
    window.localStorage.setItem(SAVED_EMAIL_KEY, normalizedEmail)
    window.localStorage.setItem(SAVED_PASSWORD_KEY, passwordRaw)
  }

  const clearRememberedCredentials = () => {
    window.localStorage.removeItem(REMEMBER_PASSWORD_KEY)
    window.localStorage.removeItem(SAVED_EMAIL_KEY)
    window.localStorage.removeItem(SAVED_PASSWORD_KEY)
  }

  if (isLoggedIn) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <AuthComponent
      pageMode="login"
      initialEmail={initialEmail}
      initialPassword={loginPassword}
      rememberPassword={rememberPassword}
      onForgotClick={() => {
        const emailToPass = loginEmail.trim().toLowerCase()
        void navigate('/forgot-password', {
          state: { email: emailToPass },
        })
      }}
      onSwitchAuthMode={() => {
        const emailToPass = loginEmail.trim().toLowerCase()
        void navigate('/register', { state: { email: emailToPass } })
      }}
      onEmailChange={(value) => {
        setLoginEmail(value)
        if (rememberPassword) {
          persistRememberedCredentials(value, loginPassword)
        }
      }}
      onPasswordChange={(value) => {
        setLoginPassword(value)
        if (rememberPassword) {
          persistRememberedCredentials(loginEmail, value)
        }
      }}
      onRememberPasswordChange={(checked) => {
        setRememberPassword(checked)
        if (checked) {
          persistRememberedCredentials(loginEmail, loginPassword)
          return
        }
        clearRememberedCredentials()
      }}
      onEmailSubmit={(email) => {
        if (!email.trim()) {
          void message.warning('请先输入邮箱')
        }
      }}
      onPasswordSubmit={(password) => {
        if (!password.trim()) {
          void message.warning('请先输入密码')
        }
      }}
      onLoginSubmit={async ({ email, password }) => {
        const normalizedEmail = email.trim().toLowerCase()
        const normalizedPassword = password.trim()
        if (!normalizedEmail || !normalizedPassword) {
          throw new Error('请输入邮箱和密码')
        }

        setLoginEmail(normalizedEmail)
        setLoginPassword(normalizedPassword)
        setSessionKeep(true)
        if (rememberPassword) {
          persistRememberedCredentials(normalizedEmail, normalizedPassword)
        } else {
          clearRememberedCredentials()
        }
        try {
          const passed = await loginWithCredentials(normalizedEmail, normalizedPassword)
          if (!passed) {
            throw new Error('请输入邮箱和密码')
          }
        } catch (error) {
          throw new Error(toChineseAuthError(error, '登录失败，请稍后重试'))
        }

        void navigate(redirectTo, { replace: true })
      }}
    />
  )
}
