const CHINESE_CHAR_RE = /[\u4e00-\u9fa5]/

export function toChineseAuthError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback
  }

  const raw = (error.message || '').trim()
  if (!raw) {
    return fallback
  }
  if (CHINESE_CHAR_RE.test(raw)) {
    return raw
  }

  const normalized = raw.toLowerCase()

  if (
    normalized.includes('invalid email or password') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('wrong password')
  ) {
    return '邮箱或密码错误'
  }
  if (normalized.includes('user not found') || normalized.includes('account not found')) {
    return '账号不存在'
  }
  if (normalized.includes('email not registered') || normalized.includes('not registered')) {
    return '邮箱未注册'
  }
  if (normalized.includes('email already registered') || normalized.includes('already registered')) {
    return '该邮箱已注册'
  }
  if (normalized.includes('invalid code') || normalized.includes('code expired')) {
    return '验证码无效或已过期'
  }
  if (
    normalized.includes('send email failed') ||
    normalized.includes('message failed') ||
    normalized.includes('smtp') ||
    normalized.includes('recipient may contain a non-existent account') ||
    normalized.includes('non-existent account') ||
    normalized.includes('mailbox unavailable') ||
    normalized.includes('no such user') ||
    normalized.includes('550')
  ) {
    return '邮件发送失败，请确认邮箱地址是否正确'
  }
  if (normalized.includes('too many') || normalized.includes('rate limit')) {
    return '请求过于频繁，请稍后重试'
  }
  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return '网络异常，请检查网络后重试'
  }
  if (normalized.startsWith('request failed:')) {
    return fallback
  }
  if (normalized.includes('invalid api response')) {
    return '服务响应异常，请稍后重试'
  }

  return fallback
}
