const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export const AUTH_TOKEN_KEY = 'aippt_access_token'

export type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  skipAuth?: boolean
}

export class ApiHttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
  }
}

let unauthorizedHandler: (() => void) | null = null

const normalizeUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

const buildHeaders = (input?: Record<string, string>, skipAuth = false): Record<string, string> => {
  const headers: Record<string, string> = {
    ...(input || {})
  }

  if (!skipAuth) {
    const token = getAccessToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  return headers
}

export const getApiBaseUrl = (): string => API_BASE.replace(/\/$/, '')

export const getAccessToken = (): string => {
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || ''
}

export const setAccessToken = (token: string): void => {
  if (!token) return
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export const clearAccessToken = (): void => {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler
}

export const withApiBase = (path: string): string => normalizeUrl(path)

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method || 'GET'
  const headers = buildHeaders(options.headers, options.skipAuth)

  const hasBody = options.body !== undefined
  if (hasBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const resp = await fetch(normalizeUrl(path), {
    method,
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined
  })

  const text = await resp.text()
  let payload: ApiEnvelope<T> | null = null

  try {
    payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null
  } catch {
    payload = null
  }

  if (!resp.ok) {
    if (resp.status === 401 && !options.skipAuth) {
      clearAccessToken()
      unauthorizedHandler?.()
    }
    const message = payload?.message || `request failed: ${resp.status}`
    throw new ApiHttpError(message, resp.status)
  }

  if (!payload || payload.code !== 0) {
    throw new Error(payload?.message || 'invalid api response')
  }

  return payload.data
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'GET' })
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body })
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', body })
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body })
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' })
}
