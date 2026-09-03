import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n'

export function AccessDeniedPage() {
  const { user } = useAuth()
  const t = useT()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('accessDenied.title')}</h1>
          <p>
            {t('accessDenied.subtitle', {
              role: user?.role
                ? t(`status.${user.role}`)
                : t('accessDenied.unknownRole'),
            })}
          </p>
        </div>
      </div>

      <div className="notice-card">
        <h2>{t('accessDenied.whatYouCanDo')}</h2>
        <p>{t('accessDenied.body')}</p>
        <Link className="text-link" to="/dashboard">
          {t('accessDenied.goDashboard')}
        </Link>
      </div>
    </div>
  )
}
