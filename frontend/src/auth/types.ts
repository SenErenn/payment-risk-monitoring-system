export type UserRole = 'Admin' | 'Analyst' | 'Viewer'

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
  errors: string[]
}

export interface LoginResponse {
  accessToken: string
  expiresAtUtc: string
  user: AuthUser
}
