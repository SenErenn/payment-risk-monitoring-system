import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  activateMerchant,
  deactivateMerchant,
  getMerchant,
  getMerchantAnalytics,
  updateMerchant,
} from '../api/merchants'
import type { Merchant, MerchantAnalytics } from '../api/merchantTypes'
import { listTransactions } from '../api/transactions'
import type { Transaction } from '../api/transactionTypes'
import { useAuth } from '../auth/AuthContext'
import { useLocale, useT } from '../i18n'
import { localizeMerchantCategory } from '../i18n/displayLabels'
import { defaultLast24HoursLocal, formatPercent } from './dateRangeUi'
import {
  formatAmount,
  formatDateTime,
  transactionStatusClass,
} from './transactionUi'

export function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const canManage = hasRole('Admin')
  const canOpenAlerts = hasRole('Admin', 'Analyst')

  const initialRange = defaultLast24HoursLocal()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [fromLocal, setFromLocal] = useState(initialRange.fromLocal)
  const [toLocal, setToLocal] = useState(initialRange.toLocal)
  const [appliedFrom, setAppliedFrom] = useState(initialRange.fromLocal)
  const [appliedTo, setAppliedTo] = useState(initialRange.toLocal)
  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  )
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setError(t('merchants.missingId'))
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getMerchant(id)
        if (!cancelled) {
          setMerchant(data)
          setName(data.name)
          setCategory(data.category)
        }
      } catch (err) {
        if (!cancelled) {
          setMerchant(null)
          setError(
            err instanceof ApiError
              ? err.message
              : t('merchants.loadDetailFailed'),
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

  useEffect(() => {
    let cancelled = false

    async function loadAnalytics() {
      if (!id) {
        return
      }

      setIsAnalyticsLoading(true)
      setAnalyticsError(null)

      try {
        const data = await getMerchantAnalytics(id, {
          from: new Date(appliedFrom).toISOString(),
          to: new Date(appliedTo).toISOString(),
        })
        if (!cancelled) {
          setAnalytics(data)
        }
      } catch (err) {
        if (!cancelled) {
          setAnalytics(null)
          setAnalyticsError(
            err instanceof ApiError
              ? err.message
              : t('merchants.analyticsLoadFailed'),
          )
        }
      } finally {
        if (!cancelled) {
          setIsAnalyticsLoading(false)
        }
      }
    }

    async function loadRecentTransactions() {
      if (!id) {
        return
      }

      setTransactionsError(null)

      try {
        const page = await listTransactions({
          page: 1,
          pageSize: 5,
          merchantId: id,
        })
        if (!cancelled) {
          setRecentTransactions(page.items)
        }
      } catch (err) {
        if (!cancelled) {
          setRecentTransactions([])
          setTransactionsError(
            err instanceof ApiError
              ? err.message
              : t('merchants.loadTxFailed'),
          )
        }
      }
    }

    void loadAnalytics()
    void loadRecentTransactions()

    return () => {
      cancelled = true
    }
  }, [id, appliedFrom, appliedTo, t])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!merchant) {
      return
    }

    setActionError(null)
    setIsSaving(true)

    try {
      const updated = await updateMerchant(merchant.id, {
        name: name.trim(),
        category: category.trim(),
      })
      setMerchant(updated)
      setIsEditing(false)
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.errors.length > 0 ? ` ${err.errors.join(' ')}` : ''
        setActionError(`${err.message}${details}`)
      } else {
        setActionError(t('merchants.updateFailed'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleActive() {
    if (!merchant) {
      return
    }

    setActionError(null)
    setIsToggling(true)

    try {
      const updated = merchant.isActive
        ? await deactivateMerchant(merchant.id)
        : await activateMerchant(merchant.id)
      setMerchant(updated)
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message)
      } else {
        setActionError(t('merchants.statusUpdateFailed'))
      }
    } finally {
      setIsToggling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="notice-card">
          <p>{t('merchants.loadingDetail')}</p>
        </div>
      </div>
    )
  }

  if (error || !merchant) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{t('merchants.detailTitle')}</h1>
            <p>{error ?? t('merchants.notFound')}</p>
          </div>
        </div>
        <Link className="text-link" to="/merchants">
          {t('merchants.detailBack')}
        </Link>
      </div>
    )
  }

  return (
    <div className="page page-wide">
      <div className="page-header page-header-row">
        <div>
          <p className="breadcrumb">
            <Link className="text-link" to="/merchants">
              {t('merchants.title')}
            </Link>
            <span> / {merchant.merchantCode}</span>
          </p>
          <h1>{merchant.name}</h1>
          <p>{t('merchants.detailSubtitle')}</p>
        </div>
        <div className="action-row">
          {canManage ? (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setIsEditing((open) => !open)
                  setActionError(null)
                  setName(merchant.name)
                  setCategory(merchant.category)
                }}
              >
                {isEditing ? t('merchants.cancelEdit') : t('merchants.edit')}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={isToggling}
                onClick={() => void handleToggleActive()}
              >
                {isToggling
                  ? t('merchants.updating')
                  : merchant.isActive
                    ? t('merchants.deactivate')
                    : t('merchants.activate')}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/merchants')}
          >
            {t('common.back')}
          </button>
        </div>
      </div>

      {actionError ? <div className="form-error">{actionError}</div> : null}

      <form
        className="filter-panel"
        onSubmit={(event) => {
          event.preventDefault()
          setAppliedFrom(fromLocal)
          setAppliedTo(toLocal)
        }}
      >
        <h2>{t('merchants.analyticsTitle')}</h2>
        <p className="form-hint">{t('merchants.analyticsHint')}</p>
        <div className="form-grid form-grid-filters">
          <label htmlFor="merchantAnalyticsFrom">
            {t('dashboard.from')}
            <input
              id="merchantAnalyticsFrom"
              type="datetime-local"
              value={fromLocal}
              onChange={(event) => setFromLocal(event.target.value)}
            />
          </label>
          <label htmlFor="merchantAnalyticsTo">
            {t('dashboard.to')}
            <input
              id="merchantAnalyticsTo"
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

      {analyticsError ? <div className="form-error">{analyticsError}</div> : null}
      {isAnalyticsLoading ? (
        <div className="notice-card">
          <p>{t('merchants.analyticsLoading')}</p>
        </div>
      ) : null}

      {!isAnalyticsLoading && analytics ? (
        <>
          <p className="muted-text dashboard-range-meta">
            {t('dashboard.rangeMeta', {
              from: formatDateTime(analytics.fromUtc, dateLocale),
              to: formatDateTime(analytics.toUtc, dateLocale),
            })}
          </p>
          <div className="info-grid kpi-grid">
            <div className="info-card">
              <span className="info-label">{t('merchants.kpiVolume')}</span>
              <strong>
                {formatAmount(analytics.volume, analytics.currency)}
              </strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('merchants.kpiTxCount')}</span>
              <strong>{analytics.transactionCount}</strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('merchants.kpiApprovalRate')}</span>
              <strong>
                {formatPercent(analytics.approvalRate, dateLocale)}
              </strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('merchants.kpiRiskCount')}</span>
              <strong>{analytics.riskAlertCount}</strong>
              <div className="muted-text">
                {t('merchants.kpiHighRisk', { count: analytics.highRiskCount })}
              </div>
            </div>
          </div>
          <div className="action-row detail-links">
            <Link
              className="text-link"
              to={`/transactions?merchantId=${merchant.id}`}
            >
              {t('merchants.viewTransactions')}
            </Link>
            {canOpenAlerts ? (
              <Link
                className="text-link"
                to={`/risk-alerts?merchantId=${merchant.id}`}
              >
                {t('merchants.viewAlerts')}
              </Link>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('merchants.colCode')}</span>
          <strong>{merchant.merchantCode}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('merchants.category')}</span>
          <strong>{localizeMerchantCategory(t, merchant.category)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.status')}</span>
          <strong>
            <span
              className={
                merchant.isActive ? 'status-chip active' : 'status-chip inactive'
              }
            >
              {merchant.isActive ? t('common.active') : t('common.inactive')}
            </span>
          </strong>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('common.created')}</span>
          <strong>
            {new Date(merchant.createdAt).toLocaleString(dateLocale)}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.updated')}</span>
          <strong>
            {new Date(merchant.updatedAt).toLocaleString(dateLocale)}
          </strong>
        </div>
      </div>

      {canManage && isEditing ? (
        <form className="panel-form" onSubmit={handleSave}>
          <h2>{t('merchants.editTitle')}</h2>
          <div className="form-grid">
            <label htmlFor="editName">
              {t('merchants.name')}
              <input
                id="editName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label htmlFor="editCategory">
              {t('merchants.category')}
              <input
                id="editCategory"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? t('merchants.saving') : t('merchants.saveChanges')}
          </button>
        </form>
      ) : null}

      <div className="notice-card">
        <h2>{t('merchants.recentTitle')}</h2>
        {transactionsError ? (
          <div className="form-error">{transactionsError}</div>
        ) : null}
        {recentTransactions.length === 0 ? (
          <p>{t('merchants.noTx')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('transactions.colCode')}</th>
                  <th>{t('transactions.colAmount')}</th>
                  <th>{t('transactions.colStatus')}</th>
                  <th>{t('transactions.colCreated')}</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <Link
                        className="text-link mono-text"
                        to={`/transactions/${tx.id}`}
                      >
                        {tx.transactionCode}
                      </Link>
                    </td>
                    <td>{formatAmount(tx.amount, tx.currency)}</td>
                    <td>
                      <span className={transactionStatusClass(tx.status)}>
                        {t(`status.${tx.status}`)}
                      </span>
                    </td>
                    <td>{formatDateTime(tx.createdAt, dateLocale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!canManage ? (
        <div className="notice-card">
          <p>{t('merchants.viewerReadOnlyDetail')}</p>
        </div>
      ) : null}
    </div>
  )
}
