import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { listRiskAlerts } from '../api/riskAlerts'
import type {
  AlertStatus,
  PagedResult,
  RiskAlert,
  RiskAlertSortBy,
  RiskLevel,
  SortDirection,
} from '../api/riskAlertTypes'
import { useLocale, useT } from '../i18n'
import { MonitoringEvents, useRealtimeEvent } from '../realtime'
import {
  alertStatusClass,
  formatAmount,
  formatDateTime,
  riskLevelClass,
} from './riskAlertUi'

const ALERT_STATUSES: AlertStatus[] = [
  'Open',
  'UnderReview',
  'Safe',
  'Suspicious',
  'Closed',
]

const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High']

const SORT_OPTIONS: { value: RiskAlertSortBy; labelKey: string }[] = [
  { value: 'createdAt', labelKey: 'riskAlerts.sortCreated' },
  { value: 'riskScore', labelKey: 'riskAlerts.sortRiskScore' },
  { value: 'riskLevel', labelKey: 'riskAlerts.sortRiskLevel' },
  { value: 'status', labelKey: 'riskAlerts.sortStatus' },
  { value: 'alertCode', labelKey: 'riskAlerts.sortCode' },
]

export function RiskAlertsPage() {
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const searchFromUrl = searchParams.get('search') ?? ''
  const statusFromUrl = (searchParams.get('status') as AlertStatus | 'all') || 'Open'
  const riskLevelFromUrl =
    (searchParams.get('riskLevel') as RiskLevel | 'all') || 'all'
  const sortByFromUrl =
    (searchParams.get('sortBy') as RiskAlertSortBy) || 'createdAt'
  const sortDirectionFromUrl =
    (searchParams.get('sortDirection') as SortDirection) || 'desc'
  const merchantIdFromUrl = searchParams.get('merchantId') ?? ''
  const cardIdFromUrl = searchParams.get('cardId') ?? ''

  const [searchInput, setSearchInput] = useState(searchFromUrl)
  const [result, setResult] = useState<PagedResult<RiskAlert> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveTick, setLiveTick] = useState(0)
  const silentReloadRef = useRef(false)

  useRealtimeEvent(MonitoringEvents.RiskAlertCreated, () => {
    silentReloadRef.current = true
    setLiveTick((value) => value + 1)
  })

  useEffect(() => {
    setSearchInput(searchFromUrl)
  }, [searchFromUrl])

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
        const data = await listRiskAlerts({
          page,
          pageSize: 10,
          search: searchFromUrl || undefined,
          status: statusFromUrl === 'all' ? null : statusFromUrl,
          riskLevel: riskLevelFromUrl === 'all' ? null : riskLevelFromUrl,
          merchantId: merchantIdFromUrl || null,
          cardId: cardIdFromUrl || null,
          sortBy: sortByFromUrl,
          sortDirection: sortDirectionFromUrl,
        })

        if (!cancelled) {
          setResult(data)
        }
      } catch (err) {
        if (!cancelled) {
          setResult(null)
          setError(
            err instanceof ApiError
              ? err.message
              : t('riskAlerts.loadFailed'),
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
  }, [
    page,
    searchFromUrl,
    statusFromUrl,
    riskLevelFromUrl,
    sortByFromUrl,
    sortDirectionFromUrl,
    merchantIdFromUrl,
    cardIdFromUrl,
    liveTick,
    t,
  ])

  function updateFilters(next: {
    search?: string
    status?: AlertStatus | 'all'
    riskLevel?: RiskLevel | 'all'
    sortBy?: RiskAlertSortBy
    sortDirection?: SortDirection
    page?: number
  }) {
    const params = new URLSearchParams()
    const search = next.search ?? searchFromUrl
    const status = next.status ?? statusFromUrl
    const riskLevel = next.riskLevel ?? riskLevelFromUrl
    const sortBy = next.sortBy ?? sortByFromUrl
    const sortDirection = next.sortDirection ?? sortDirectionFromUrl
    const nextPage = next.page ?? 1

    if (search.trim()) {
      params.set('search', search.trim())
    }

    if (status !== 'Open') {
      params.set('status', status)
    }

    if (riskLevel !== 'all') {
      params.set('riskLevel', riskLevel)
    }

    if (sortBy !== 'createdAt') {
      params.set('sortBy', sortBy)
    }

    if (sortDirection !== 'desc') {
      params.set('sortDirection', sortDirection)
    }

    if (merchantIdFromUrl) {
      params.set('merchantId', merchantIdFromUrl)
    }

    if (cardIdFromUrl) {
      params.set('cardId', cardIdFromUrl)
    }

    if (nextPage > 1) {
      params.set('page', String(nextPage))
    }

    setSearchParams(params)
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateFilters({ search: searchInput, page: 1 })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams())
  }

  const hasActiveFilters =
    Boolean(searchFromUrl) ||
    statusFromUrl !== 'Open' ||
    riskLevelFromUrl !== 'all' ||
    sortByFromUrl !== 'createdAt' ||
    sortDirectionFromUrl !== 'desc' ||
    Boolean(merchantIdFromUrl) ||
    Boolean(cardIdFromUrl)

  return (
    <div className="page page-wide">
      <div className="page-header page-header-row">
        <div>
          <h1>{t('riskAlerts.title')}</h1>
          <p>{t('riskAlerts.subtitle')}</p>
        </div>
      </div>

      <form className="panel-form filter-panel" onSubmit={handleSearchSubmit}>
        <div className="filter-panel-header">
          <h2>{t('riskAlerts.filtersTitle')}</h2>
          {hasActiveFilters ? (
            <button
              type="button"
              className="secondary-button"
              onClick={clearFilters}
            >
              {t('common.clear')}
            </button>
          ) : null}
        </div>

        <div className="form-grid form-grid-simulator">
          <label htmlFor="alertSearch">
            {t('common.search')}
            <input
              id="alertSearch"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('riskAlerts.searchPlaceholder')}
            />
          </label>

          <label htmlFor="alertStatus">
            {t('common.status')}
            <select
              id="alertStatus"
              value={statusFromUrl}
              onChange={(event) =>
                updateFilters({
                  status: event.target.value as AlertStatus | 'all',
                  page: 1,
                })
              }
            >
              <option value="all">{t('riskAlerts.allStatuses')}</option>
              {ALERT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="alertRiskLevel">
            {t('riskAlerts.riskLevel')}
            <select
              id="alertRiskLevel"
              value={riskLevelFromUrl}
              onChange={(event) =>
                updateFilters({
                  riskLevel: event.target.value as RiskLevel | 'all',
                  page: 1,
                })
              }
            >
              <option value="all">{t('riskAlerts.allRiskLevels')}</option>
              {RISK_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {t(`status.${level}`)}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="alertSortBy">
            {t('riskAlerts.sortBy')}
            <select
              id="alertSortBy"
              value={sortByFromUrl}
              onChange={(event) =>
                updateFilters({
                  sortBy: event.target.value as RiskAlertSortBy,
                  page: 1,
                })
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="alertSortDirection">
            {t('riskAlerts.direction')}
            <select
              id="alertSortDirection"
              value={sortDirectionFromUrl}
              onChange={(event) =>
                updateFilters({
                  sortDirection: event.target.value as SortDirection,
                  page: 1,
                })
              }
            >
              <option value="desc">{t('riskAlerts.descending')}</option>
              <option value="asc">{t('riskAlerts.ascending')}</option>
            </select>
          </label>
        </div>

        <button type="submit" className="primary-button">
          {t('common.applyFilters')}
        </button>
      </form>

      {error ? <div className="form-error">{error}</div> : null}

      {isLoading ? (
        <div className="notice-card">
          <p>{t('riskAlerts.loadingList')}</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length === 0 ? (
        <div className="notice-card">
          <h2>{t('riskAlerts.emptyTitle')}</h2>
          <p>{t('riskAlerts.emptyHint')}</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('riskAlerts.colCode')}</th>
                  <th>{t('riskAlerts.colTransaction')}</th>
                  <th>{t('riskAlerts.colMerchant')}</th>
                  <th>{t('riskAlerts.colAmount')}</th>
                  <th>{t('riskAlerts.colRisk')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('riskAlerts.colReviewedBy')}</th>
                  <th>{t('riskAlerts.colCreated')}</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <Link
                        className="text-link mono-text"
                        to={`/risk-alerts/${alert.id}`}
                      >
                        {alert.alertCode}
                      </Link>
                    </td>
                    <td>
                      <Link
                        className="text-link mono-text"
                        to={`/transactions/${alert.transactionId}`}
                      >
                        {alert.transactionCode}
                      </Link>
                    </td>
                    <td>
                      <div>{alert.merchantName}</div>
                      <span className="muted-text">{alert.merchantCode}</span>
                    </td>
                    <td>{formatAmount(alert.amount, alert.currency)}</td>
                    <td>
                      <span className={riskLevelClass(alert.riskLevel)}>
                        {t(`status.${alert.riskLevel}`)} · {alert.riskScore}
                      </span>
                    </td>
                    <td>
                      <span className={alertStatusClass(alert.status)}>
                        {t(`status.${alert.status}`)}
                      </span>
                    </td>
                    <td>
                      {alert.reviewedByName ? (
                        <>
                          <div>{alert.reviewedByName}</div>
                          {alert.reviewedAt ? (
                            <span className="muted-text">
                              {formatDateTime(alert.reviewedAt, dateLocale)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="muted-text">
                          {t('riskAlerts.notReviewedYet')}
                        </span>
                      )}
                    </td>
                    <td>{formatDateTime(alert.createdAt, dateLocale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              type="button"
              className="secondary-button"
              disabled={!result.hasPreviousPage}
              onClick={() => updateFilters({ page: page - 1 })}
            >
              {t('common.previous')}
            </button>
            <span className="muted-text">
              {t('common.pageOf', {
                page: result.page,
                totalPages: result.totalPages,
                totalCount: result.totalCount,
              })}
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={!result.hasNextPage}
              onClick={() => updateFilters({ page: page + 1 })}
            >
              {t('common.next')}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
