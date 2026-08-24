import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getCurrentUserRequest, loginRequest } from '../api/auth'
import { ApiError } from '../api/client'
import { tokenStorage } from './tokenStorage'
import type { AuthUser } from './types'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: AuthUser['role'][]) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(tokenStorage.getUser())
  const [token, setToken] = useState<string | null>(tokenStorage.getToken())
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const logout = useCallback(() => {
    tokenStorage.clear()
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const storedToken = tokenStorage.getToken()
      if (!storedToken) {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
        return
      }

      try {
        const currentUser = await getCurrentUserRequest()
        if (!cancelled) {
          tokenStorage.setUser(currentUser)
          setToken(storedToken)
          setUser(currentUser)
        }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          tokenStorage.clear()
          if (!cancelled) {
            setToken(null)
            setUser(null)
          }
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password)
    tokenStorage.setToken(result.accessToken)
    tokenStorage.setUser(result.user)
    setToken(result.accessToken)
    setUser(result.user)
  }, [])

  const hasRole = useCallback(
    (...roles: AuthUser['role'][]) => {
      if (!user) {
        return false
      }

      return roles.includes(user.role)
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isBootstrapping,
      login,
      logout,
      hasRole,
    }),
    [user, token, isBootstrapping, login, logout, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
