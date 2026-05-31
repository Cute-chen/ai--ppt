import { App } from 'antd'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthComponent } from '../components/ui/sign-up'
import { ApiHttpError, apiPost } from '../lib/http'
import { toChineseAuthError } from '../lib/auth-error'
import { useRequireAuth } from '../store/AppStore'

type ForgotLocationState = {
  email?: string
}

type SendCodeResponse = {
  expiresAt: string
}

type ForgotPasswordResponse = {
  success: true
}

export default function ForgotPasswordPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = useRequireAuth()
  const initialEmail = ((location.state as ForgotLocationState | null)?.email || '').trim().toLowerCase()

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [newPassword] = useState('')
  const [confirmNewPassword] = useState('')
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

  async function sendResetCode() {
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
        purpose: 'reset_password',
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

  async function submitResetPassword(override?: { code?: string; newPassword?: string }) {
    const normalizedEmail = email.trim().toLowerCase()
    const finalCode = (override?.code ?? code).trim()
    const finalNewPassword = (override?.newPassword ?? newPassword).trim()
    const finalConfirmNewPassword = (override?.newPassword ?? confirmNewPassword).trim()

    if (!normalizedEmail || !finalCode || !finalNewPassword) {
      void message.warning('请完整填写邮箱、验证码和新密码')
      return
    }
    if (finalNewPassword !== finalConfirmNewPassword) {
      void message.warning('两次输入的新密码不一致')
      return
    }

    setSubmitting(true)
    try {
      await apiPost<ForgotPasswordResponse>('/api/auth/forgot-password', {
        email: normalizedEmail,
        code: finalCode,
        newPassword: finalNewPassword,
      })
      void message.success('密码重置成功，请重新登录')
      void navigate('/login', { replace: true })
    } catch (error) {
      const text = toChineseAuthError(error, '重置密码失败')
      void message.error(text)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthComponent
      pageMode="reset"
      initialEmail={initialEmail}
      onBack={() => {
        void navigate('/login', { state: { email: email.trim().toLowerCase() } })
      }}
      secondaryActionText={resendCountdown > 0 ? `${resendCountdown}s 后重发` : '重新发送验证码'}
      secondaryActionDisabled={sending || resendCountdown > 0}
      onForgotClick={() => void sendResetCode()}
      onSwitchAuthMode={() => void navigate('/register', { state: { email: email.trim().toLowerCase() } })}
      onEmailChange={setEmail}
      onCodeChange={setCode}
      onEmailSubmit={() => sendResetCode()}
      onPasswordSubmit={() => {
        if (!code.trim()) {
          void message.warning('请先输入验证码')
        }
      }}
      onFinalSubmit={({ code: verifyCode, newPassword: submitPassword, password, confirmPassword }) => {
        const finalCode = (verifyCode ?? code).trim()
        const finalPassword = (submitPassword ?? password ?? confirmPassword).trim()
        void submitResetPassword({ code: finalCode, newPassword: finalPassword })
      }}
    />
  )
}
