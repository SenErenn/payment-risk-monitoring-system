import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getDashboardSummary } from '../api/dashboard'
import type { DashboardSummary, NamedCount } from '../api/dashboardTypes'
import { useAuth } from '../auth/AuthContext'
import { useLocale, useT } from '../i18n'
import { MonitoringEvents, useRealtimeEvent } from '../realtime'
import { formatAmount, formatDateTime, riskLevelClass, transactionStatusClass } from './transactionUi'
import type { RiskLevel, TransactionStatus } from '../api/transactionTypes'

function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultRange(): { fromLocal: string; toLocal: string } {
  const to = new Date()
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)
  return {
    fromLocal: toDateTimeLocalValue(from),
    toLocal: toDateTimeLocalValue(to),
  }
}

function maxCount(items: { count: number }[]): number {
  return Math.max(1, ...items.map((item) => item.count))
}

function formatHourLabel(iso: string, locale: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatPercent(rate: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(rate)
}

export function DashboardPage() {
  const { user, hasRole } = useAuth()
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const canOpenAlerts = hasRole('Admin', 'Analyst')
  const canOpenMerchants = hasRole('Admin', 'Viewer')

  const initialRange = useMemo(() => defaultRange(), [])
  const [fromLocal, setFromLocal] = useState(initialRange.fromLocal)
  const [toLocal, setToLocal] = useState(initialRange.toLocal)
  const [appliedFrom, setAppliedFrom] = useState(initialRange.fromLocal)
  const [appliedTo, setAppliedTo] = useState(initialRange.toLocal)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveTick, setLiveTick] = useState(0)
  const silentReloadRef = useRef(false)

  useRealtimeEvent(MonitoringEvents.TransactionCreated, () => {
    silentReloadRef.current = true
    setLiveTick((value) => value + 1)
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const silent = silentReloadRef.current
      silentReloadRef.current = false

      if (!silent) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const data = await getDashboardSummary({
          from: new Date(appliedFrom).toISOString(),
          to: new Date(appliedTo).toISOString(),
        })
        if (!cancelled) {
          setSummary(data)
        }
      } catch (err) {
        if (!cancelled) {
          setSummary(null)
          setError(
            err instanceof ApiError ? err.message : t('dashboard.loadFailed'),
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
  }, [appliedFrom, appliedTo, liveTick, t])

  function handleApplyFilters(event: FormEvent) {
    event.preventDefault()
    setAppliedFrom(fromLocal)
    setAppliedTo(toLocal)
  }

  function labelForNamedCount(item: NamedCount): string {
    const statusKey = `status.${item.key}`
    const translated = t(statusKey)
    return translated === statusKey ? item.key : translated
  }

  const hourlyMax = summary ? maxCount(summary.hourlyTransactions) : 1
  const statusMax = summary ? maxCount(summary.statusDistribution) : 1
  const riskMax = summary ? maxCount(summary.riskDistribution) : 1
  const merchantMax = summary
    ? Math.max(1, ...summary.topMerchants.map((item) => item.volume))
    : 1

  return (
    <div className="page page-wide">
      <div className="page-header page-header-row">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>
        <div className="user-meta dashboard-user-meta">
          <span className="user-name">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="user-role">
            {user?.role ? t(`status.${user.role}`) : ''}
          </span>
        </div>
      </div>

      <form className="filter-panel" onSubmit={handleApplyFilters}>
        <h2>{t('dashboard.rangeTitle')}</h2>
        <div className="form-grid form-grid-filters">
          <label htmlFor="dashboardFrom">
            {t('dashboard.from')}
            <input
              id="dashboardFrom"
              type="datetime-local"
              value={fromLocal}
              onChange={(event) => setFromLocal(event.target.value)}
            />
          </label>
          <label htmlFor="dashboardTo">
            {t('dashboard.to')}
            <input
              id="dashboardTo"
              type="datetime-local"
              value={toLocal}
              onChange={(event) => setToLocal(event.target.value)}
            />
          </label>
        </div>
        <button type="submit" className="primary-button">
          {t('common.applyFilters')}
        </button>
      </form>

      {error ? <div className="form-error">{error}</div> : null}

      {isLoading ? (
        <div className="notice-card">
          <p>{t('dashboard.loading')}</p>
        </div>
      ) : null}

      {!isLoading && summary ? (
        <>
          <p className="muted-text dashboard-range-meta">
            {t('dashboard.rangeMeta', {
              from: formatDateTime(summary.fromUtc, dateLocale),
              to: formatDateTime(summary.toUtc, dateLocale),
            })}
          </p>

          <div className="info-grid kpi-grid">
            <div className="info-card">
              <span className="info-label">{t('dashboard.kpiTotal')}</span>
              <strong>{summary.kpis.totalTransactions}</strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('dashboard.kpiVolume')}</span>
              <strong>
                {formatAmount(
                  summary.kpis.transactionVolume,
                  summary.kpis.currency,
                )}
              </strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('dashboard.kpiApproved')}</span>
              <strong>{summary.kpis.approvedCount}</strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('dashboard.kpiDeclined')}</span>
              <strong>{summary.kpis.declinedCount}</strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('dashboard.kpiHighRisk')}</span>
              <strong>{summary.kpis.highRiskCount}</strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('dashboard.kpiOpenAlerts')}</span>
              <strong>{summary.kpis.openAlertsCount}</strong>
              {canOpenAlerts ? (
                <Link className="text-link" to="/risk-alerts?status=Open">
                  {t('dashboard.openAlertsLink')}
                </Link>
              ) : null}
            </div>
            <div className="info-card">
              <span className="info-label">{t('dashboard.kpiApprovalRate')}</span>
              <strong>
                {formatPercent(summary.kpis.approvalRate, dateLocale)}
              </strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('dashboard.kpiAverage')}</span>
              <strong>
                {formatAmount(
                  summary.kpis.averageAmount,
                  summary.kpis.currency,
                )}
              </strong>
            </div>
          </div>

          <div className="dashboard-charts">
            <section className="chart-card">
              <h2>{t('dashboard.hourlyTitle')}</h2>
              <p className="form-hint">{t('dashboard.hourlyHint')}</p>
              <div className="hourly-chart" role="img" aria-label={t('dashboard.hourlyTitle')}>
                {summary.hourlyTransactions.map((bucket) => {
                  const height = Math.round((bucket.count / hourlyMax) * 100)
                  return (
                    <div key={bucket.hourUtc} className="hourly-bar-wrap">
                      <div className="hourly-bar-track">
                        <div
                          className="hourly-bar"
                          style={{ height: `${height}%` }}
                          title={`${bucket.count}`}
                        />
                      </div>
                      <span className="hourly-label">
                        {formatHourLabel(bucket.hourUtc, dateLocale)}
                      </span>
                      <span className="hourly-count">{bucket.count}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="chart-card">
              <h2>{t('dashboard.statusTitle')}</h2>
              <div className="bar-list">
                {summary.statusDistribution.map((item) => (
                  <div key={item.key} className="bar-row">
                    <div className="bar-row-meta">
                      <span className={transactionStatusClass(item.key as TransactionStatus)}>
                        {labelForNamedCount(item)}
                      </span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.round((item.count / statusMax) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="chart-card">
              <h2>{t('dashboard.riskTitle')}</h2>
              <div className="bar-list">
                {summary.riskDistribution.map((item) => (
                  <div key={item.key} className="bar-row">
                    <div className="bar-row-meta">
                      <span className={riskLevelClass(item.key as RiskLevel)}>
                        {labelForNamedCount(item)}
                      </span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill risk"
                        style={{
                          width: `${Math.round((item.count / riskMax) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="chart-card">
              <h2>{t('dashboard.topMerchantsTitle')}</h2>
              {summary.topMerchants.length === 0 ? (
                <p className="muted-text">{t('dashboard.noMerchants')}</p>
              ) : (
                <div className="bar-list">
                  {summary.topMerchants.map((merchant) => (
                    <div key={merchant.merchantId} className="bar-row">
                      <div className="bar-row-meta">
                        <div>
                          {canOpenMerchants ? (
                            <Link
                              className="text-link"
                              to={`/merchants/${merchant.merchantId}`}
                            >
                              {merchant.name}
                            </Link>
                          ) : (
                            <strong>{merchant.name}</strong>
                          )}
                          <div className="muted-text">
                            {merchant.merchantCode} · {merchant.transactionCount}{' '}
                            {t('dashboard.txShort')}
                          </div>
                        </div>
                        <strong>
                          {formatAmount(merchant.volume, summary.kpis.currency)}
                        </strong>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${Math.round((merchant.volume / merchantMax) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  )
}
