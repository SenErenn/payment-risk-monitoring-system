import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n'
import { getNavigationForRole } from '../navigation/navItems'

export function Sidebar() {
  const { user } = useAuth()
  const t = useT()
  const items = getNavigationForRole(user?.role)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand">{t('brand.name')}</span>
        <span className="sidebar-subtitle">{t('brand.subtitle')}</span>
      </div>

      <nav className="sidebar-nav" aria-label={t('layout.mainNav')}>
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
