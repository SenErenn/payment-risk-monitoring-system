import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { LanguageSwitcher, useT } from '../i18n'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : '/dashboard'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('login.failed'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-language">
          <LanguageSwitcher />
        </div>

        <div className="login-brand">
          <span className="brand">{t('brand.name')}</span>
          <p>{t('brand.fullName')}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h1>{t('login.title')}</h1>
          <p className="login-subtitle">{t('login.subtitle')}</p>

          <label htmlFor="email">{t('common.email')}</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">{t('common.password')}</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <div className="login-hint">
          <p>{t('login.hint')}</p>
        </div>
      </div>
    </div>
  )
}
