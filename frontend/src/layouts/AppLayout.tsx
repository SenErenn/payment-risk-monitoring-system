import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LanguageSwitcher, useT } from '../i18n'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const t = useT()

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
            <span className="topbar-title">{t('layout.operationsConsole')}</span>
          </div>

          <div className="topbar-right">
            <LanguageSwitcher compact />
            <div className="user-meta">
              <span className="user-name">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="user-role">
                {user?.role ? t(`status.${user.role}`) : ''}
              </span>
            </div>
            {hasRole('Admin') ? (
              <span className="role-chip">{t('status.Admin')}</span>
            ) : null}
            <button type="button" className="logout-button" onClick={handleLogout}>
              {t('common.logout')}
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
