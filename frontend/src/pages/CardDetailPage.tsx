import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  activateCard,
  blockCard,
  deactivateCard,
  getCard,
  updateCard,
  updateCardStatus,
} from '../api/cards'
import type { Card } from '../api/cardTypes'
import { listTransactions } from '../api/transactions'
import type { Transaction } from '../api/transactionTypes'
import { cardStatusClass, formatDateTime, formatMoney } from './cardUi'
import {
  formatAmount,
  formatDateTime as formatTxDateTime,
  transactionStatusClass,
} from './transactionUi'

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

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

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setError('Card id is missing.')
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
            err instanceof ApiError ? err.message : 'Unable to load card.',
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
              : 'Unable to load card transactions.',
          )
        }
      }
    }

    void load()
    void loadTransactions()

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSaveLimits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!card) {
      return
    }

    const credit = Number(creditLimit)
    const available = Number(availableLimit)

    if (Number.isNaN(credit) || Number.isNaN(available)) {
      setActionError('Credit and available limits must be valid numbers.')
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
        setActionError('Unable to update card limits.')
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
        setActionError('Unable to update card status.')
      }
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="notice-card">
          <p>Loading card...</p>
        </div>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Card detail</h1>
            <p>{error ?? 'Card not found.'}</p>
          </div>
        </div>
        <Link className="text-link" to="/cards">
          Back to cards
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
              Cards
            </Link>
            <span> / {card.maskedCardNumber}</span>
          </p>
          <h1>{card.maskedCardNumber}</h1>
          <p>Demo card used in payment simulation.</p>
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
            {isEditingLimits ? 'Cancel edit' : 'Change limits'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/cards')}
          >
            Back
          </button>
        </div>
      </div>

      {actionError ? <div className="form-error">{actionError}</div> : null}

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">Token</span>
          <strong className="mono-text">{card.cardToken}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Type</span>
          <strong>{card.cardType}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Status</span>
          <strong>
            <span className={cardStatusClass(card.status)}>{card.status}</span>
          </strong>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">Credit limit</span>
          <strong>{formatMoney(card.creditLimit)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Available limit</span>
          <strong>{formatMoney(card.availableLimit)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Updated</span>
          <strong>{formatDateTime(card.updatedAt)}</strong>
        </div>
      </div>

      <div className="panel-form">
        <h2>Status actions</h2>
        <div className="action-row">
          <button
            type="button"
            className="secondary-button"
            disabled={isUpdatingStatus || card.status === 'Active'}
            onClick={() => void handleStatusAction('activate')}
          >
            Activate
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={isUpdatingStatus || card.status === 'Blocked'}
            onClick={() => void handleStatusAction('block')}
          >
            Block
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={isUpdatingStatus || card.status === 'Passive'}
            onClick={() => void handleStatusAction('deactivate')}
          >
            Deactivate
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={isUpdatingStatus || card.status === 'Expired'}
            onClick={() => void handleStatusAction('expire')}
          >
            Mark expired
          </button>
        </div>
      </div>

      {isEditingLimits ? (
        <form className="panel-form" onSubmit={handleSaveLimits}>
          <h2>Change limits</h2>
          <div className="form-grid">
            <label htmlFor="editCreditLimit">
              Credit limit
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
              Available limit
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
            {isSaving ? 'Saving...' : 'Save limits'}
          </button>
        </form>
      ) : null}

      <div className="notice-card">
        <h2>Recent transactions</h2>
        {transactionsError ? (
          <div className="form-error">{transactionsError}</div>
        ) : null}
        {recentTransactions.length === 0 ? (
          <p>
            No transactions yet for this card.{' '}
            <Link className="text-link" to="/transactions">
              Open Payment Simulator
            </Link>
          </p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
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
                          {tx.status}
                        </span>
                      </td>
                      <td>{formatTxDateTime(tx.createdAt)}</td>
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
                View all transactions for this card
              </Link>
            </p>
          </>
        )}
      </div>

      <div className="info-card">
        <span className="info-label">Created</span>
        <strong>{formatDateTime(card.createdAt)}</strong>
      </div>
    </div>
  )
}
