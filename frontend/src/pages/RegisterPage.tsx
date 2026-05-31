import { App } from 'antd'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthComponent } from '../components/ui/sign-up'
import { ApiHttpError, apiPost } from '../lib/http'
import { toChineseAuthError } from '../lib/auth-error'
import { useRequireAuth } from '../store/AppStore'

type RegisterLocationState = {
  email?: string
}

type SendCodeResponse = {
  expiresAt: string
}

type RegisterResponse = {
  accessToken: string
  user: {
    id: string
    email: string
  }
  issuedAt: string
}

export default function RegisterPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = useRequireAuth()
  const initialEmail = ((location.state as RegisterLocationState | null)?.email || '').trim().toLowerCase()

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password] = useState('')
  const [confirmPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [, setSubmitting] = useState(false)

  if (isLoggedIn) {
    return <Navigate to="/projects" replace />
  }

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])

  useEffect(() => {
    if (resendCountdown <= 0) {
      return
    }
    const timer = window.setTimeout(() => {
      setResendCountdown((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [resendCountdown])

  const extractRetrySeconds = (text: string): number | null => {
    const hit = text.match(/wait\s+(\d+)s/i)
    if (!hit) {
      return null
    }
    const seconds = Number(hit[1])
    return Number.isFinite(seconds) ? seconds : null
  }

  async function sendRegisterCode() {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      void message.warning('请先输入邮箱')
      return false
    }
    if (sending) {
      return false
    }
    if (resendCountdown > 0) {
      void message.warning(`请 ${resendCountdown}s 后再试`)
      return false
    }

    setSending(true)
    try {
      const data = await apiPost<SendCodeResponse>('/api/auth/send-code', {
        email: normalizedEmail,
        purpose: 'register',
      })
      setResendCountdown(60)
      void message.success(`验证码已发送，有效期至 ${new Date(data.expiresAt).toLocaleString()}`)
      return true
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 429) {
        const fallbackText = error.message || '请求过于频繁，请稍后重试'
        const retrySeconds = extractRetrySeconds(fallbackText)
        if (retrySeconds && retrySeconds > 0) {
          setResendCountdown(retrySeconds)
        }
        void message.warning(retrySeconds ? `请求过于频繁，请 ${retrySeconds}s 后重试` : fallbackText)
        return false
      }
      const text = toChineseAuthError(error, '发送验证码失败')
      void message.error(text)
      return false
    } finally {
      setSending(false)
    }
  }

  async function submitRegister(override?: { code?: string; password?: string }) {
    const normalizedEmail = email.trim().toLowerCase()
    const finalCode = (override?.code ?? code).trim()
    const finalPassword = (override?.password ?? password).trim()
    const finalConfirmPassword = (override?.password ?? confirmPassword).trim()

    if (!normalizedEmail || !finalCode || !finalPassword) {
      void message.warning('请完整填写邮箱、验证码和密码')
      return
    }
    if (finalPassword !== finalConfirmPassword) {
      void message.warning('两次输入的密码不一致')
      return
    }

    setSubmitting(true)
    try {
      const data = await apiPost<RegisterResponse>('/api/auth/register', {
        email: normalizedEmail,
        code: finalCode,
        password: finalPassword,
      })
      void message.success(`注册成功：${data.user.email}，请登录`)
      void navigate('/login', { replace: true })
    } catch (error) {
      const text = toChineseAuthError(error, '注册失败')
      void message.error(text)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthComponent
      pageMode="verify"
      initialEmail={initialEmail}
      onBack={() => {
        void navigate('/login', { state: { email: email.trim().toLowerCase() } })
      }}
      secondaryActionText={resendCountdown > 0 ? `${resendCountdown}s 后重发` : '重新发送验证码'}
      secondaryActionDisabled={sending || resendCountdown > 0}
      onForgotClick={() => void sendRegisterCode()}
      onSwitchAuthMode={() => void navigate('/forgot-password', { state: { email: email.trim().toLowerCase() } })}
      onEmailChange={setEmail}
      onCodeChange={setCode}
      onEmailSubmit={() => sendRegisterCode()}
      onFinalSubmit={({ code: verifyCode, newPassword }) => {
        const finalCode = (verifyCode ?? code).trim()
        const finalPassword = (newPassword ?? password).trim()
        void submitRegister({ code: finalCode, password: finalPassword })
      }}
    />
  )
}
