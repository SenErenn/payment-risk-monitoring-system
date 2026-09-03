import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useT } from '../i18n'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()
  const t = useT()

  if (isBootstrapping) {
    return (
      <div className="boot-screen">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
