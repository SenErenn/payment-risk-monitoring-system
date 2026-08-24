import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">Operations Console</span>
          </div>

          <div className="topbar-right">
            <div className="user-meta">
              <span className="user-name">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="user-role">{user?.role}</span>
            </div>
            {hasRole('Admin') ? <span className="role-chip">Admin</span> : null}
            <button type="button" className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
