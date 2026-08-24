import { apiRequest } from './client'
import type { AuthUser, LoginResponse } from '../auth/types'

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  })
}

export async function getCurrentUserRequest(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/auth/me')
}
