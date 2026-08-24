import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function AccessDeniedPage() {
  const { user } = useAuth()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Access denied</h1>
          <p>
            Your role ({user?.role ?? 'Unknown'}) cannot open this page.
          </p>
        </div>
      </div>

      <div className="notice-card">
        <h2>What you can do</h2>
        <p>
          Return to the dashboard or choose a menu item available for your
          role.
        </p>
        <Link className="text-link" to="/dashboard">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
