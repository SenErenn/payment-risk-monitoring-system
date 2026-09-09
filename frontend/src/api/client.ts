import type { ApiResponse } from '../auth/types'
import { tokenStorage } from '../auth/tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5067'

export class ApiError extends Error {
  status: number
  errors: string[]

  constructor(message: string, status: number, errors: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  auth?: boolean
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const useAuth = options.auth !== false

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (useAuth) {
    if (tokenStorage.isTokenExpired()) {
      tokenStorage.clear()
      throw new ApiError('Authentication is required.', 401)
    }

    const token = tokenStorage.getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.success) {
    if (useAuth && response.status === 401) {
      tokenStorage.clear()
    }

    throw new ApiError(
      payload?.message ?? 'Request failed.',
      response.status,
      payload?.errors ?? [],
    )
  }

  return payload.data as T
}

export async function downloadAuthenticatedFile(
  path: string,
  fallbackFileName: string,
): Promise<void> {
  if (tokenStorage.isTokenExpired()) {
    tokenStorage.clear()
    throw new ApiError('Authentication is required.', 401)
  }

  const token = tokenStorage.getToken()
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers })

  if (!response.ok) {
    if (response.status === 401) {
      tokenStorage.clear()
    }

    let message = 'Download failed.'
    try {
      const payload = (await response.json()) as ApiResponse<unknown>
      message = payload.message ?? message
    } catch {
      // binary/error body without JSON
    }

    throw new ApiError(message, response.status)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  let fileName = fallbackFileName
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i)
  if (match?.[1]) {
    fileName = decodeURIComponent(match[1].replace(/"/g, ''))
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
