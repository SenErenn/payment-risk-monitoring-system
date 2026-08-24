import { useAuth } from '../auth/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back. Authentication is connected to the backend.</p>
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
        <h2>What is ready</h2>
        <ul>
          <li>JWT login against the ASP.NET Core API</li>
          <li>Protected dashboard route</li>
          <li>Role information available in the frontend session</li>
        </ul>
        <p>
          Full sidebar navigation and role-based menu differences arrive in
          PR-008.
        </p>
      </div>
    </div>
  )
}
