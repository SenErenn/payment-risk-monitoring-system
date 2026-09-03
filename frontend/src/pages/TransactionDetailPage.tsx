import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getTransaction } from '../api/transactions'
import type { Transaction } from '../api/transactionTypes'
import { useAuth } from '../auth/AuthContext'
import {
  decisionPanelClass,
  formatAmount,
  formatDateTime,
  riskLevelClass,
  transactionStatusClass,
} from './transactionUi'

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasRole } = useAuth()
  const canManageCards = hasRole('Admin')
  const canOpenMerchants = hasRole('Admin', 'Viewer')

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setError('Transaction id is missing.')
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
              : 'Unable to load transaction.',
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
  }, [id])

  if (isLoading) {
    return (
      <div className="page">
        <div className="notice-card">
          <p>Loading transaction...</p>
        </div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="page">
        <p className="breadcrumb">
          <Link className="text-link" to="/transactions">
            ← Transactions
          </Link>
        </p>
        <div className="form-error">{error ?? 'Transaction not found.'}</div>
      </div>
    )
  }

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link className="text-link" to="/transactions">
          ← Transactions
        </Link>
      </p>

      <div className="page-header page-header-row">
        <div>
          <h1>{transaction.transactionCode}</h1>
          <p>
            {formatAmount(transaction.amount, transaction.currency)} ·{' '}
            {transaction.paymentType}
          </p>
        </div>
        <span className={transactionStatusClass(transaction.status)}>
          {transaction.status}
        </span>
      </div>

      <div className={decisionPanelClass(transaction.status)}>
        <div className="decision-panel-header">
          <strong>Decision</strong>
          <span className={riskLevelClass(transaction.riskLevel)}>
            {transaction.riskLevel} · score {transaction.riskScore}
          </span>
        </div>
        <p>
          {transaction.declineReason ??
            transaction.decisionMessage ??
            'No decision message was recorded for this transaction.'}
        </p>
        {transaction.status === 'Declined' && transaction.declineReason ? (
          <p className="form-hint">
            Decline reason is persisted with the transaction.
          </p>
        ) : null}
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">Merchant</span>
          <strong>{transaction.merchantName}</strong>
          <span className="muted-text">{transaction.merchantCode}</span>
          <span className="muted-text mono-text">{transaction.merchantId}</span>
          <div className="action-row detail-links">
            {canOpenMerchants ? (
              <Link
                className="text-link"
                to={`/merchants/${transaction.merchantId}`}
              >
                Open merchant
              </Link>
            ) : null}
            <Link
              className="text-link"
              to={`/transactions?merchantId=${transaction.merchantId}`}
            >
              Related transactions
            </Link>
          </div>
        </div>
        <div className="info-card">
          <span className="info-label">Card</span>
          <strong className="mono-text">{transaction.maskedCardNumber}</strong>
          <span className="muted-text mono-text">{transaction.cardToken}</span>
          <span className="muted-text mono-text">{transaction.cardId}</span>
          <div className="action-row detail-links">
            {canManageCards ? (
              <Link className="text-link" to={`/cards/${transaction.cardId}`}>
                Open card
              </Link>
            ) : null}
            <Link
              className="text-link"
              to={`/transactions?cardId=${transaction.cardId}`}
            >
              Related transactions
            </Link>
          </div>
        </div>
        <div className="info-card">
          <span className="info-label">Created</span>
          <strong>{formatDateTime(transaction.createdAt)}</strong>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">Amount</span>
          <strong>
            {formatAmount(transaction.amount, transaction.currency)}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">Payment type</span>
          <strong>{transaction.paymentType}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Status</span>
          <strong>
            <span className={transactionStatusClass(transaction.status)}>
              {transaction.status}
            </span>
          </strong>
        </div>
      </div>
    </div>
  )
}
