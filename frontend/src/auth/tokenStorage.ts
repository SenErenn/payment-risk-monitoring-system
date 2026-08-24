import type { AuthUser } from './types'

const TOKEN_KEY = 'payscope_access_token'
const USER_KEY = 'payscope_auth_user'
const EXPIRES_AT_KEY = 'payscope_token_expires_at'

export const tokenStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  },

  getExpiresAtUtc(): string | null {
    return localStorage.getItem(EXPIRES_AT_KEY)
  },

  setExpiresAtUtc(expiresAtUtc: string): void {
    localStorage.setItem(EXPIRES_AT_KEY, expiresAtUtc)
  },

  clearExpiresAtUtc(): void {
    localStorage.removeItem(EXPIRES_AT_KEY)
  },

  isTokenExpired(referenceDate: Date = new Date()): boolean {
    const expiresAtUtc = this.getExpiresAtUtc()
    if (!expiresAtUtc) {
      return false
    }

    const expiresAt = Date.parse(expiresAtUtc)
    if (Number.isNaN(expiresAt)) {
      return true
    }

    return expiresAt <= referenceDate.getTime()
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      localStorage.removeItem(USER_KEY)
      return null
    }
  },

  setUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  clearUser(): void {
    localStorage.removeItem(USER_KEY)
  },

  clear(): void {
    this.clearToken()
    this.clearUser()
    this.clearExpiresAtUtc()
  },
}
