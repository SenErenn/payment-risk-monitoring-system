import { Navigate, Outlet } from 'react-router-dom'
import { useT } from '../i18n'
import { useAuth } from './AuthContext'

export function PublicOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const t = useT()

  if (isBootstrapping) {
    return (
      <div className="boot-screen">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
