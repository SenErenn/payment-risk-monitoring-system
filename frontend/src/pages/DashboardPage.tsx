import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n'
import { getNavigationForRole } from '../navigation/navItems'

export function DashboardPage() {
  const { user } = useAuth()
  const t = useT()
  const menuItems = getNavigationForRole(user?.role)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('dashboard.signedInAs')}</span>
          <strong>
            {user?.firstName} {user?.lastName}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.email')}</span>
          <strong>{user?.email}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.role')}</span>
          <strong>{user?.role ? t(`status.${user.role}`) : ''}</strong>
        </div>
      </div>

      <div className="notice-card">
        <h2>{t('dashboard.availableTitle')}</h2>
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link className="text-link" to={item.path}>
                {t(item.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
        <p>{t('dashboard.availableHint')}</p>
      </div>
    </div>
  )
}
