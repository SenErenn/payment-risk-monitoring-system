import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getRiskAlert } from '../api/riskAlerts'
import type { RiskAlert } from '../api/riskAlertTypes'
import { useAuth } from '../auth/AuthContext'
import { useLocale, useT } from '../i18n'
import {
  alertDecisionPanelClass,
  alertStatusClass,
  formatAmount,
  formatDateTime,
  riskLevelClass,
} from './riskAlertUi'
import { transactionStatusClass } from './transactionUi'

export function RiskAlertDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasRole } = useAuth()
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const canOpenMerchants = hasRole('Admin', 'Viewer')
  const canManageCards = hasRole('Admin')

  const [alert, setAlert] = useState<RiskAlert | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setError(t('riskAlerts.missingId'))
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getRiskAlert(id)
        if (!cancelled) {
          setAlert(data)
        }
      } catch (err) {
        if (!cancelled) {
          setAlert(null)
          setError(
            err instanceof ApiError
              ? err.message
              : t('riskAlerts.loadDetailFailed'),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id, t])

  if (isLoading) {
    return (
      <div className="page">
        <div className="notice-card">
          <p>{t('riskAlerts.loadingDetail')}</p>
        </div>
      </div>
    )
  }

  if (error || !alert) {
    return (
      <div className="page">
        <p className="breadcrumb">
          <Link className="text-link" to="/risk-alerts">
            {t('riskAlerts.backToList')}
          </Link>
        </p>
        <div className="form-error">{error ?? t('riskAlerts.notFound')}</div>
      </div>
    )
  }

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link className="text-link" to="/risk-alerts">
          {t('riskAlerts.backToList')}
        </Link>
      </p>

      <div className="page-header page-header-row">
        <div>
          <h1>{alert.alertCode}</h1>
          <p>
            {formatAmount(alert.amount, alert.currency)} ·{' '}
            {alert.transactionCode}
          </p>
        </div>
        <span className={alertStatusClass(alert.status)}>
          {t(`status.${alert.status}`)}
        </span>
      </div>

      <div className={alertDecisionPanelClass(alert.status)}>
        <div className="decision-panel-header">
          <strong>{t('riskAlerts.riskSummary')}</strong>
          <span className={riskLevelClass(alert.riskLevel)}>
            {t('riskAlerts.riskScoreInline', {
              level: t(`status.${alert.riskLevel}`),
              score: alert.riskScore,
            })}
          </span>
        </div>
        <p>{t('riskAlerts.riskSummaryHint')}</p>
        {alert.riskReasons?.length ? (
          <div className="risk-reasons">
            <strong>{t('riskAlerts.riskReasons')}</strong>
            <ul>
              {alert.riskReasons.map((reason) => (
                <li key={`${reason.code}-${reason.message}`}>
                  <span className="mono-text">{reason.code}</span>
                  <span>{reason.message}</span>
                  {typeof reason.points === 'number' && reason.points > 0 ? (
                    <span className="muted-text">
                      {t('riskAlerts.riskReasonPoints', {
                        points: reason.points,
                      })}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('riskAlerts.transaction')}</span>
          <strong className="mono-text">{alert.transactionCode}</strong>
          <span className={transactionStatusClass(alert.transactionStatus)}>
            {t(`status.${alert.transactionStatus}`)}
          </span>
          <div className="action-row detail-links">
            <Link
              className="text-link"
              to={`/transactions/${alert.transactionId}`}
            >
              {t('riskAlerts.openTransaction')}
            </Link>
          </div>
        </div>

        <div className="info-card">
          <span className="info-label">{t('riskAlerts.merchant')}</span>
          <strong>{alert.merchantName}</strong>
          <span className="muted-text">{alert.merchantCode}</span>
          <div className="action-row detail-links">
            {canOpenMerchants ? (
              <Link
                className="text-link"
                to={`/merchants/${alert.merchantId}`}
              >
                {t('riskAlerts.openMerchant')}
              </Link>
            ) : null}
            <Link
              className="text-link"
              to={`/transactions?merchantId=${alert.merchantId}`}
            >
              {t('riskAlerts.relatedTransactions')}
            </Link>
          </div>
        </div>

        <div className="info-card">
          <span className="info-label">{t('riskAlerts.card')}</span>
          <strong className="mono-text">{alert.maskedCardNumber}</strong>
          <div className="action-row detail-links">
            {canManageCards ? (
              <Link className="text-link" to={`/cards/${alert.cardId}`}>
                {t('riskAlerts.openCard')}
              </Link>
            ) : null}
            <Link
              className="text-link"
              to={`/transactions?cardId=${alert.cardId}`}
            >
              {t('riskAlerts.relatedTransactions')}
            </Link>
          </div>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('riskAlerts.amount')}</span>
          <strong>{formatAmount(alert.amount, alert.currency)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.created')}</span>
          <strong>{formatDateTime(alert.createdAt, dateLocale)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.updated')}</span>
          <strong>{formatDateTime(alert.updatedAt, dateLocale)}</strong>
        </div>
      </div>
    </div>
  )
}
