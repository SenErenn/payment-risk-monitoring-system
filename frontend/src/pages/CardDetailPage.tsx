import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  activateCard,
  blockCard,
  deactivateCard,
  getCard,
  getCardAnalytics,
  updateCard,
  updateCardStatus,
} from '../api/cards'
import type { Card, CardAnalytics } from '../api/cardTypes'
import { listTransactions } from '../api/transactions'
import type { Transaction } from '../api/transactionTypes'
import { useAuth } from '../auth/AuthContext'
import { useLocale, useT } from '../i18n'
import { cardStatusClass, formatDateTime, formatMoney } from './cardUi'
import { defaultLast24HoursLocal } from './dateRangeUi'
import {
  formatAmount,
  formatDateTime as formatTxDateTime,
  transactionStatusClass,
} from './transactionUi'

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const canOpenAlerts = hasRole('Admin', 'Analyst')

  const initialRange = defaultLast24HoursLocal()
  const [card, setCard] = useState<Card | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingLimits, setIsEditingLimits] = useState(false)
  const [creditLimit, setCreditLimit] = useState('')
  const [availableLimit, setAvailableLimit] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  )
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  )
  const [fromLocal, setFromLocal] = useState(initialRange.fromLocal)
  const [toLocal, setToLocal] = useState(initialRange.toLocal)
  const [appliedFrom, setAppliedFrom] = useState(initialRange.fromLocal)
  const [appliedTo, setAppliedTo] = useState(initialRange.toLocal)
  const [analytics, setAnalytics] = useState<CardAnalytics | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setError(t('cards.missingId'))
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getCard(id)
        if (!cancelled) {
          setCard(data)
          setCreditLimit(String(data.creditLimit))
          setAvailableLimit(String(data.availableLimit))
        }
      } catch (err) {
        if (!cancelled) {
          setCard(null)
          setError(
            err instanceof ApiError
              ? err.message
              : t('cards.loadDetailFailed'),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    async function loadTransactions() {
      if (!id) {
        return
      }

      setTransactionsError(null)

      try {
        const txPage = await listTransactions({
          page: 1,
          pageSize: 5,
          cardId: id,
        })
        if (!cancelled) {
          setRecentTransactions(txPage.items)
        }
      } catch (err) {
        if (!cancelled) {
          setRecentTransactions([])
          setTransactionsError(
            err instanceof ApiError
              ? err.message
              : t('cards.loadTxFailed'),
          )
        }
      }
    }

    void load()
    void loadTransactions()

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
        const data = await getCardAnalytics(id, {
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
              : t('cards.analyticsLoadFailed'),
          )
        }
      } finally {
        if (!cancelled) {
          setIsAnalyticsLoading(false)
        }
      }
    }

    void loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [id, appliedFrom, appliedTo, t])

  async function handleSaveLimits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!card) {
      return
    }

    const credit = Number(creditLimit)
    const available = Number(availableLimit)

    if (Number.isNaN(credit) || Number.isNaN(available)) {
      setActionError(t('cards.invalidLimits'))
      return
    }

    setActionError(null)
    setIsSaving(true)

    try {
      const updated = await updateCard(card.id, {
        creditLimit: credit,
        availableLimit: available,
      })
      setCard(updated)
      setIsEditingLimits(false)
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.errors.length > 0 ? ` ${err.errors.join(' ')}` : ''
        setActionError(`${err.message}${details}`)
      } else {
        setActionError(t('cards.updateLimitsFailed'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusAction(action: 'activate' | 'block' | 'deactivate' | 'expire') {
    if (!card) {
      return
    }

    setActionError(null)
    setIsUpdatingStatus(true)

    try {
      let updated: Card
      switch (action) {
        case 'activate':
          updated = await activateCard(card.id)
          break
        case 'block':
          updated = await blockCard(card.id)
          break
        case 'deactivate':
          updated = await deactivateCard(card.id)
          break
        case 'expire':
          updated = await updateCardStatus(card.id, { status: 'Expired' })
          break
      }
      setCard(updated)
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message)
      } else {
        setActionError(t('cards.statusUpdateFailed'))
      }
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="notice-card">
          <p>{t('cards.loadingDetail')}</p>
        </div>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{t('cards.detailTitle')}</h1>
            <p>{error ?? t('cards.notFound')}</p>
          </div>
        </div>
        <Link className="text-link" to="/cards">
          {t('cards.detailBack')}
        </Link>
      </div>
    )
  }

  return (
    <div className="page page-wide">
      <div className="page-header page-header-row">
        <div>
          <p className="breadcrumb">
            <Link className="text-link" to="/cards">
              {t('cards.title')}
            </Link>
            <span> / {card.maskedCardNumber}</span>
          </p>
          <h1>{card.maskedCardNumber}</h1>
          <p>{t('cards.detailSubtitle')}</p>
        </div>
        <div className="action-row">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsEditingLimits((open) => !open)
              setActionError(null)
              setCreditLimit(String(card.creditLimit))
              setAvailableLimit(String(card.availableLimit))
            }}
          >
            {isEditingLimits
              ? t('cards.cancelEdit')
              : t('cards.changeLimits')}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/cards')}
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
        <h2>{t('cards.analyticsTitle')}</h2>
        <p className="form-hint">{t('cards.analyticsHint')}</p>
        <div className="form-grid form-grid-filters">
          <label htmlFor="cardAnalyticsFrom">
            {t('dashboard.from')}
            <input
              id="cardAnalyticsFrom"
              type="datetime-local"
              value={fromLocal}
              onChange={(event) => setFromLocal(event.target.value)}
            />
          </label>
          <label htmlFor="cardAnalyticsTo">
            {t('dashboard.to')}
            <input
              id="cardAnalyticsTo"
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
          <p>{t('cards.analyticsLoading')}</p>
        </div>
      ) : null}

      {!isAnalyticsLoading && analytics ? (
        <>
          <p className="muted-text dashboard-range-meta">
            {t('dashboard.rangeMeta', {
              from: formatTxDateTime(analytics.fromUtc, dateLocale),
              to: formatTxDateTime(analytics.toUtc, dateLocale),
            })}
          </p>
          <div className="info-grid kpi-grid">
            <div className="info-card">
              <span className="info-label">{t('cards.kpiSpending')}</span>
              <strong>
                {formatAmount(analytics.spending, analytics.currency)}
              </strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('cards.kpiDeclines')}</span>
              <strong>{analytics.declinedCount}</strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('cards.kpiRiskAlerts')}</span>
              <strong>{analytics.riskAlertCount}</strong>
            </div>
            <div className="info-card">
              <span className="info-label">{t('cards.availableLimit')}</span>
              <strong>
                {formatAmount(analytics.availableLimit, analytics.currency)}
              </strong>
            </div>
          </div>
          <div className="action-row detail-links">
            <Link
              className="text-link"
              to={`/transactions?cardId=${card.id}`}
            >
              {t('cards.viewAllTx')}
            </Link>
            {canOpenAlerts ? (
              <Link
                className="text-link"
                to={`/risk-alerts?cardId=${card.id}`}
              >
                {t('cards.viewAlerts')}
              </Link>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('cards.token')}</span>
          <strong className="mono-text">{card.cardToken}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('cards.colType')}</span>
          <strong>{t(`status.${card.cardType}`)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.status')}</span>
          <strong>
            <span className={cardStatusClass(card.status)}>
              {t(`status.${card.status}`)}
            </span>
          </strong>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('cards.creditLimit')}</span>
          <strong>{formatMoney(card.creditLimit)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('cards.availableLimit')}</span>
          <strong>{formatMoney(card.availableLimit)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.updated')}</span>
          <strong>{formatDateTime(card.updatedAt, dateLocale)}</strong>
        </div>
      </div>

      <div className="panel-form">
        <h2>{t('cards.statusActions')}</h2>
        <div className="action-row">
          <button
            type="button"
            className="secondary-button"
            disabled={isUpdatingStatus || card.status === 'Active'}
            onClick={() => void handleStatusAction('activate')}
          >
            {t('cards.activate')}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={isUpdatingStatus || card.status === 'Blocked'}
            onClick={() => void handleStatusAction('block')}
          >
            {t('cards.block')}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={isUpdatingStatus || card.status === 'Passive'}
            onClick={() => void handleStatusAction('deactivate')}
          >
            {t('cards.deactivate')}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={isUpdatingStatus || card.status === 'Expired'}
            onClick={() => void handleStatusAction('expire')}
          >
            {t('cards.markExpired')}
          </button>
        </div>
      </div>

      {isEditingLimits ? (
        <form className="panel-form" onSubmit={handleSaveLimits}>
          <h2>{t('cards.changeLimits')}</h2>
          <div className="form-grid">
            <label htmlFor="editCreditLimit">
              {t('cards.creditLimit')}
              <input
                id="editCreditLimit"
                type="number"
                min="0.01"
                step="0.01"
                value={creditLimit}
                onChange={(event) => setCreditLimit(event.target.value)}
                required
              />
            </label>
            <label htmlFor="editAvailableLimit">
              {t('cards.availableLimit')}
              <input
                id="editAvailableLimit"
                type="number"
                min="0"
                step="0.01"
                value={availableLimit}
                onChange={(event) => setAvailableLimit(event.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? t('cards.saving') : t('cards.saveLimits')}
          </button>
        </form>
      ) : null}

      <div className="notice-card">
        <h2>{t('cards.recentTitle')}</h2>
        {transactionsError ? (
          <div className="form-error">{transactionsError}</div>
        ) : null}
        {recentTransactions.length === 0 ? (
          <p>
            {t('cards.noTx')}{' '}
            <Link className="text-link" to="/transactions">
              {t('cards.openSimulator')}
            </Link>
          </p>
        ) : (
          <>
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
                      <td>{formatTxDateTime(tx.createdAt, dateLocale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="form-hint">
              <Link
                className="text-link"
                to={`/transactions?cardId=${card.id}`}
              >
                {t('cards.viewAllTx')}
              </Link>
            </p>
          </>
        )}
      </div>

      <div className="info-card">
        <span className="info-label">{t('common.created')}</span>
        <strong>{formatDateTime(card.createdAt, dateLocale)}</strong>
      </div>
    </div>
  )
}
