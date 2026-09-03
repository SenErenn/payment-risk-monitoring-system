import { Navigate, Outlet } from 'react-router-dom'
import { useT } from '../i18n'
import { useAuth } from './AuthContext'
import type { UserRole } from './types'

interface RoleRouteProps {
  roles: UserRole[]
}

export function RoleRoute({ roles }: RoleRouteProps) {
  const { hasRole, isBootstrapping } = useAuth()
  const t = useT()

  if (isBootstrapping) {
    return (
      <div className="boot-screen">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (!hasRole(...roles)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}
