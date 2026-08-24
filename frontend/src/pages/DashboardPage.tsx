import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getNavigationForRole } from '../navigation/navItems'

export function DashboardPage() {
  const { user } = useAuth()
  const menuItems = getNavigationForRole(user?.role)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome back. Your role controls which sections appear in the
            sidebar.
          </p>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">Signed in as</span>
          <strong>
            {user?.firstName} {user?.lastName}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">Email</span>
          <strong>{user?.email}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Role</span>
          <strong>{user?.role}</strong>
        </div>
      </div>

      <div className="notice-card">
        <h2>Available for your role</h2>
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link className="text-link" to={item.path}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <p>
          Placeholder pages are wired for navigation and role checks. Feature
          modules land in later PRs.
        </p>
      </div>
    </div>
  )
}
