import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { UserRole } from './types'

interface RoleRouteProps {
  roles: UserRole[]
}

export function RoleRoute({ roles }: RoleRouteProps) {
  const { hasRole, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="boot-screen">
        <p>Loading session...</p>
      </div>
    )
  }

  if (!hasRole(...roles)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}
