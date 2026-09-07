import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { createRefund, getTransaction } from '../api/transactions'
import type { Transaction } from '../api/transactionTypes'
import { useAuth } from '../auth/AuthContext'
import { useLocale, useT } from '../i18n'
import {
  decisionPanelClass,
  formatAmount,
  formatDateTime,
  hasAtMostTwoDecimalPlaces,
  riskLevelClass,
  transactionStatusClass,
} from './transactionUi'

type RefundMode = 'full' | 'partial'

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasRole } = useAuth()
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const canManageCards = hasRole('Admin')
  const canOpenMerchants = hasRole('Admin', 'Viewer')
  const canCreateRefunds = hasRole('Admin', 'Analyst')

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [refundMode, setRefundMode] = useState<RefundMode>('full')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setError(t('transactions.missingId'))
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getTransaction(id)
        if (!cancelled) {
          setTransaction(data)
        }
      } catch (err) {
        if (!cancelled) {
          setTransaction(null)
          setError(
            err instanceof ApiError
              ? err.message
              : t('transactions.loadDetailFailed'),
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

  async function reloadTransaction() {
    if (!id) {
      return null
    }

    const data = await getTransaction(id)
    setTransaction(data)
    return data
  }

  async function handleCreateRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!transaction || !canCreateRefunds || !transaction.canRefund) {
      return
    }

    setRefundError(null)
    setRefundSuccess(null)

    const reason = refundReason.trim()
    if (reason.length > 500) {
      setRefundError(t('transactions.refundReasonTooLong'))
      return
    }

    const payload: { amount?: number; reason?: string } = {}
    if (reason) {
      payload.reason = reason
    }

    if (refundMode === 'partial') {
      const trimmedAmount = refundAmount.trim()
      if (!/^\d+(\.\d{1,2})?$/.test(trimmedAmount)) {
        setRefundError(t('transactions.refundAmountInvalid'))
        return
      }

      const amount = Number(trimmedAmount)
      if (!Number.isFinite(amount) || amount <= 0) {
        setRefundError(t('transactions.refundAmountInvalid'))
        return
      }

      if (!hasAtMostTwoDecimalPlaces(amount)) {
        setRefundError(t('transactions.refundAmountDecimals'))
        return
      }

      if (amount > transaction.refundableAmount + 1e-9) {
        setRefundError(
          t('transactions.refundAmountExceeds', {
            max: formatAmount(
              transaction.refundableAmount,
              transaction.currency,
            ),
          }),
        )
        return
      }

      payload.amount = amount
    }

    setIsRefunding(true)

    try {
      const refund = await createRefund(transaction.id, payload)
      const updated = await reloadTransaction()
      setRefundMode('full')
      setRefundAmount('')
      setRefundReason('')
      setRefundSuccess(
        t('transactions.refundSuccess', {
          code: refund.refundCode,
          amount: formatAmount(refund.amount, refund.currency),
          status: updated
            ? t(`status.${updated.status}`)
            : t('status.Refunded'),
        }),
      )
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.errors.length > 0 ? ` ${err.errors.join(' ')}` : ''
        setRefundError(`${err.message}${details}`)
      } else {
        setRefundError(t('transactions.refundFailed'))
      }
    } finally {
      setIsRefunding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="notice-card">
          <p>{t('transactions.loadingDetail')}</p>
        </div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="page">
        <p className="breadcrumb">
          <Link className="text-link" to="/transactions">
            {t('transactions.backToList')}
          </Link>
        </p>
        <div className="form-error">
          {error ?? t('transactions.notFound')}
        </div>
      </div>
    )
  }

  const refunds = transaction.refunds ?? []
  const showRefundForm = canCreateRefunds && transaction.canRefund

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link className="text-link" to="/transactions">
          {t('transactions.backToList')}
        </Link>
      </p>

      <div className="page-header page-header-row">
        <div>
          <h1>{transaction.transactionCode}</h1>
          <p>
            {formatAmount(transaction.amount, transaction.currency)} ·{' '}
            {t(`status.${transaction.paymentType}`)}
          </p>
        </div>
        <span className={transactionStatusClass(transaction.status)}>
          {t(`status.${transaction.status}`)}
        </span>
      </div>

      <div className={decisionPanelClass(transaction.status)}>
        <div className="decision-panel-header">
          <strong>{t('transactions.decision')}</strong>
          <span className={riskLevelClass(transaction.riskLevel)}>
            {t('transactions.riskScoreInline', {
              level: t(`status.${transaction.riskLevel}`),
              score: transaction.riskScore,
            })}
          </span>
        </div>
        <p>
          {transaction.declineReason ??
            transaction.decisionMessage ??
            t('transactions.noDecision')}
        </p>
        {transaction.status === 'Declined' && transaction.declineReason ? (
          <p className="form-hint">{t('transactions.declinePersisted')}</p>
        ) : null}
        {transaction.riskReasons?.length ? (
          <div className="risk-reasons">
            <strong>{t('transactions.riskReasons')}</strong>
            <ul>
              {transaction.riskReasons.map((reason) => (
                <li key={`${reason.code}-${reason.message}`}>
                  <span className="mono-text">{reason.code}</span>
                  <span>{reason.message}</span>
                  {typeof reason.points === 'number' && reason.points > 0 ? (
                    <span className="muted-text">
                      {t('transactions.riskReasonPoints', {
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
          <span className="info-label">{t('transactions.merchant')}</span>
          <strong>{transaction.merchantName}</strong>
          <span className="muted-text">{transaction.merchantCode}</span>
          <span className="muted-text mono-text">{transaction.merchantId}</span>
          <div className="action-row detail-links">
            {canOpenMerchants ? (
              <Link
                className="text-link"
                to={`/merchants/${transaction.merchantId}`}
              >
                {t('transactions.openMerchant')}
              </Link>
            ) : null}
            <Link
              className="text-link"
              to={`/transactions?merchantId=${transaction.merchantId}`}
            >
              {t('transactions.relatedTransactions')}
            </Link>
          </div>
        </div>
        <div className="info-card">
          <span className="info-label">{t('transactions.card')}</span>
          <strong className="mono-text">{transaction.maskedCardNumber}</strong>
          <span className="muted-text mono-text">{transaction.cardToken}</span>
          <span className="muted-text mono-text">{transaction.cardId}</span>
          <div className="action-row detail-links">
            {canManageCards ? (
              <Link className="text-link" to={`/cards/${transaction.cardId}`}>
                {t('transactions.openCard')}
              </Link>
            ) : null}
            <Link
              className="text-link"
              to={`/transactions?cardId=${transaction.cardId}`}
            >
              {t('transactions.relatedTransactions')}
            </Link>
          </div>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.created')}</span>
          <strong>{formatDateTime(transaction.createdAt, dateLocale)}</strong>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('transactions.amount')}</span>
          <strong>
            {formatAmount(transaction.amount, transaction.currency)}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('transactions.paymentType')}</span>
          <strong>{t(`status.${transaction.paymentType}`)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.status')}</span>
          <strong>
            <span className={transactionStatusClass(transaction.status)}>
              {t(`status.${transaction.status}`)}
            </span>
          </strong>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('transactions.refundedAmount')}</span>
          <strong>
            {formatAmount(transaction.refundedAmount, transaction.currency)}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">
            {t('transactions.refundableAmount')}
          </span>
          <strong>
            {formatAmount(transaction.refundableAmount, transaction.currency)}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('transactions.refundEligibility')}</span>
          <strong>
            {transaction.canRefund
              ? t('transactions.refundEligible')
              : t('transactions.refundNotEligible')}
          </strong>
        </div>
      </div>

      {refundSuccess ? <div className="form-success">{refundSuccess}</div> : null}

      {showRefundForm ? (
        <form className="panel-form" onSubmit={handleCreateRefund}>
          <h2>{t('transactions.refundTitle')}</h2>
          <p className="form-hint">{t('transactions.refundHint')}</p>

          <fieldset className="refund-mode-fieldset">
            <legend>{t('transactions.refundMode')}</legend>
            <label className="refund-mode-option" htmlFor="refundModeFull">
              <input
                id="refundModeFull"
                type="radio"
                name="refundMode"
                value="full"
                checked={refundMode === 'full'}
                onChange={() => {
                  setRefundMode('full')
                  setRefundError(null)
                }}
              />
              <span>
                {t('transactions.refundModeFull')} (
                {formatAmount(
                  transaction.refundableAmount,
                  transaction.currency,
                )}
                )
              </span>
            </label>
            <label className="refund-mode-option" htmlFor="refundModePartial">
              <input
                id="refundModePartial"
                type="radio"
                name="refundMode"
                value="partial"
                checked={refundMode === 'partial'}
                onChange={() => {
                  setRefundMode('partial')
                  setRefundError(null)
                }}
              />
              <span>{t('transactions.refundModePartial')}</span>
            </label>
          </fieldset>

          {refundMode === 'partial' ? (
            <div className="form-grid form-grid-simulator">
              <label htmlFor="refundAmount">
                {t('transactions.refundAmount')}
                <input
                  id="refundAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={transaction.refundableAmount}
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  required
                />
              </label>
            </div>
          ) : null}

          <label htmlFor="refundReason">
            {t('transactions.refundReason')}
            <textarea
              id="refundReason"
              rows={3}
              maxLength={500}
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              placeholder={t('transactions.refundReasonPlaceholder')}
            />
          </label>

          {refundError ? <div className="form-error">{refundError}</div> : null}

          <button
            type="submit"
            className="primary-button"
            disabled={isRefunding}
          >
            {isRefunding
              ? t('transactions.refundProcessing')
              : t('transactions.submitRefund')}
          </button>
        </form>
      ) : canCreateRefunds ? (
        <div className="notice-card">
          <h2>{t('transactions.refundTitle')}</h2>
          <p>{t('transactions.refundUnavailable')}</p>
        </div>
      ) : (
        <div className="notice-card">
          <h2>{t('transactions.refundTitle')}</h2>
          <p>{t('transactions.refundReadOnly')}</p>
        </div>
      )}

      <div className="notice-card">
        <h2>{t('transactions.refundHistoryTitle')}</h2>
        <p className="form-hint">{t('transactions.refundHistoryHint')}</p>

        {refunds.length === 0 ? (
          <p>{t('transactions.refundHistoryEmpty')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('transactions.colRefundCode')}</th>
                  <th>{t('transactions.colAmount')}</th>
                  <th>{t('transactions.colRefundReason')}</th>
                  <th>{t('transactions.colCreated')}</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td className="mono-text">{refund.refundCode}</td>
                    <td>
                      {formatAmount(refund.amount, refund.currency)}
                    </td>
                    <td>{refund.reason ?? t('transactions.noRefundReason')}</td>
                    <td>{formatDateTime(refund.createdAt, dateLocale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
