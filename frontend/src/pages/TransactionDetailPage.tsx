import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getTransaction } from '../api/transactions'
import type { Transaction } from '../api/transactionTypes'
import { useAuth } from '../auth/AuthContext'
import { useLocale, useT } from '../i18n'
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
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const canManageCards = hasRole('Admin')
  const canOpenMerchants = hasRole('Admin', 'Viewer')

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    </div>
  )
}
