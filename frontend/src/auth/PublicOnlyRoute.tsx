import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function PublicOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="boot-screen">
        <p>Loading session...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
