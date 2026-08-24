import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getNavigationForRole } from '../navigation/navItems'

export function Sidebar() {
  const { user } = useAuth()
  const items = getNavigationForRole(user?.role)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand">PayScope</span>
        <span className="sidebar-subtitle">Risk Console</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
