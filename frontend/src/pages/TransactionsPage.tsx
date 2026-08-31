import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { listCards } from '../api/cards'
import type { Card } from '../api/cardTypes'
import { listMerchants } from '../api/merchants'
import type { Merchant } from '../api/merchantTypes'
import { createTransaction, listTransactions } from '../api/transactions'
import type {
  CurrencyCode,
  PagedResult,
  PaymentType,
  Transaction,
  TransactionStatus,
} from '../api/transactionTypes'
import { useAuth } from '../auth/AuthContext'
import {
  decisionPanelClass,
  formatAmount,
  formatDateTime,
  riskLevelClass,
  transactionStatusClass,
} from './transactionUi'

type StatusFilter = 'all' | TransactionStatus

const PAYMENT_TYPES: PaymentType[] = [
  'Contactless',
  'Chip',
  'Online',
  'MagneticStripe',
]

const CURRENCIES: CurrencyCode[] = ['TRY', 'USD', 'EUR']

export function TransactionsPage() {
  const { hasRole } = useAuth()
  const canCreate = hasRole('Admin', 'Analyst')
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const searchFromUrl = searchParams.get('search') ?? ''
  const statusFromUrl = (searchParams.get('status') as StatusFilter) || 'all'
  const merchantIdFromUrl = searchParams.get('merchantId') ?? ''
  const cardIdFromUrl = searchParams.get('cardId') ?? ''

  const [searchInput, setSearchInput] = useState(searchFromUrl)
  const [result, setResult] = useState<PagedResult<Transaction> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(canCreate)

  const [merchantId, setMerchantId] = useState('')
  const [cardId, setCardId] = useState('')
  const [amount, setAmount] = useState('100')
  const [currency, setCurrency] = useState<CurrencyCode>('TRY')
  const [paymentType, setPaymentType] = useState<PaymentType>('Contactless')
  const [isPaying, setIsPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<Transaction | null>(null)

  useEffect(() => {
    setSearchInput(searchFromUrl)
  }, [searchFromUrl])

  useEffect(() => {
    if (!canCreate) {
      return
    }

    let cancelled = false

    async function loadOptions() {
      setOptionsLoading(true)
      setOptionsError(null)

      try {
        const [merchantPage, cardPage] = await Promise.all([
          listMerchants({ page: 1, pageSize: 100 }),
          listCards({ page: 1, pageSize: 100 }),
        ])

        if (cancelled) {
          return
        }

        setMerchants(merchantPage.items)
        setCards(cardPage.items)

        setMerchantId((current) => {
          if (current) {
            return current
          }

          const preferred =
            merchantPage.items.find((item) => item.isActive) ??
            merchantPage.items[0]
          return preferred?.id ?? ''
        })

        setCardId((current) => {
          if (current) {
            return current
          }

          const preferred =
            cardPage.items.find((item) => item.status === 'Active') ??
            cardPage.items[0]
          return preferred?.id ?? ''
        })
      } catch (err) {
        if (!cancelled) {
          setOptionsError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load merchants and cards for the simulator.',
          )
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false)
        }
      }
    }

    void loadOptions()

    return () => {
      cancelled = true
    }
  }, [canCreate])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await listTransactions({
          page,
          pageSize: 10,
          search: searchFromUrl,
          status: statusFromUrl === 'all' ? null : statusFromUrl,
          merchantId: merchantIdFromUrl || null,
          cardId: cardIdFromUrl || null,
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
              : 'Unable to load transactions.',
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
    merchantIdFromUrl,
    cardIdFromUrl,
    reloadToken,
  ])

  function updateFilters(next: {
    search?: string
    status?: StatusFilter
    merchantId?: string
    cardId?: string
    page?: number
  }) {
    const params = new URLSearchParams()
    const search = next.search ?? searchFromUrl
    const status = next.status ?? statusFromUrl
    const merchantIdValue =
      next.merchantId !== undefined ? next.merchantId : merchantIdFromUrl
    const cardIdValue = next.cardId !== undefined ? next.cardId : cardIdFromUrl
    const nextPage = next.page ?? 1

    if (search.trim()) {
      params.set('search', search.trim())
    }

    if (status !== 'all') {
      params.set('status', status)
    }

    if (merchantIdValue.trim()) {
      params.set('merchantId', merchantIdValue.trim())
    }

    if (cardIdValue.trim()) {
      params.set('cardId', cardIdValue.trim())
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

  function clearContextFilters() {
    updateFilters({ merchantId: '', cardId: '', page: 1 })
  }

  async function handleMakePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPayError(null)
    setLastResult(null)
    setIsPaying(true)

    const parsedAmount = Number(amount)
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setPayError('Amount must be a positive number.')
      setIsPaying(false)
      return
    }

    if (!merchantId || !cardId) {
      setPayError('Select both a merchant and a card.')
      setIsPaying(false)
      return
    }

    try {
      const transaction = await createTransaction({
        merchantId,
        cardId,
        amount: parsedAmount,
        currency,
        paymentType,
      })
      setLastResult(transaction)
      setReloadToken((value) => value + 1)

      if (canCreate) {
        const refreshedCards = await listCards({ page: 1, pageSize: 100 })
        setCards(refreshedCards.items)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.errors.length > 0 ? ` ${err.errors.join(' ')}` : ''
        setPayError(`${err.message}${details}`)
      } else {
        setPayError('Unable to create payment.')
      }
    } finally {
      setIsPaying(false)
    }
  }

  const selectedCard = cards.find((card) => card.id === cardId)

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>
            Simulate card payments and review Approved / Declined outcomes. Full
            risk scoring arrives in later PRs.
          </p>
        </div>
      </div>

      {canCreate ? (
        <form className="panel-form" onSubmit={handleMakePayment}>
          <h2>Payment Simulator</h2>
          <p className="form-hint">
            Choose a merchant and card, then submit a demo payment. Inactive
            merchants, non-active cards, and insufficient limits are declined.
          </p>

          {optionsLoading ? (
            <p className="form-hint">Loading merchants and cards...</p>
          ) : null}

          {optionsError ? <div className="form-error">{optionsError}</div> : null}

          <div className="form-grid form-grid-simulator">
            <label htmlFor="simMerchant">
              Merchant
              <select
                id="simMerchant"
                value={merchantId}
                onChange={(event) => setMerchantId(event.target.value)}
                required
                disabled={optionsLoading || merchants.length === 0}
              >
                {merchants.length === 0 ? (
                  <option value="">No merchants available</option>
                ) : null}
                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name} ({merchant.merchantCode})
                    {merchant.isActive ? '' : ' — Inactive'}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="simCard">
              Card
              <select
                id="simCard"
                value={cardId}
                onChange={(event) => setCardId(event.target.value)}
                required
                disabled={optionsLoading || cards.length === 0}
              >
                {cards.length === 0 ? (
                  <option value="">No cards available</option>
                ) : null}
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.maskedCardNumber} · {card.cardType} · {card.status} ·
                    avail {card.availableLimit.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="simAmount">
              Amount
              <input
                id="simAmount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>

            <label htmlFor="simCurrency">
              Currency
              <select
                id="simCurrency"
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value as CurrencyCode)
                }
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="simPaymentType">
              Payment type
              <select
                id="simPaymentType"
                value={paymentType}
                onChange={(event) =>
                  setPaymentType(event.target.value as PaymentType)
                }
              >
                {PAYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedCard ? (
            <p className="form-hint">
              Selected card available limit:{' '}
              <strong>{selectedCard.availableLimit.toFixed(2)}</strong>
            </p>
          ) : null}

          {payError ? <div className="form-error">{payError}</div> : null}

          {lastResult ? (
            <div className={decisionPanelClass(lastResult.status)}>
              <div className="decision-panel-header">
                <strong>{lastResult.status}</strong>
                <span className="mono-text">{lastResult.transactionCode}</span>
              </div>
              <p>
                {lastResult.decisionMessage ??
                  `${formatAmount(lastResult.amount, lastResult.currency)} · ${lastResult.paymentType}`}
              </p>
              <p className="form-hint">
                Risk: {lastResult.riskLevel} ({lastResult.riskScore}) ·{' '}
                <Link className="text-link" to={`/transactions/${lastResult.id}`}>
                  View transaction
                </Link>
              </p>
            </div>
          ) : null}

          <button
            type="submit"
            className="primary-button"
            disabled={
              isPaying || optionsLoading || !merchantId || !cardId || !!optionsError
            }
          >
            {isPaying ? 'Processing...' : 'Make Payment'}
          </button>
        </form>
      ) : (
        <div className="notice-card">
          <h2>Read-only access</h2>
          <p>
            Your Viewer role can review transactions below. Payment simulation
            is available to Admin and Analyst users.
          </p>
        </div>
      )}

      <form className="toolbar toolbar-transactions" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          placeholder="Search by code, merchant, or card"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search transactions"
        />
        <select
          value={statusFromUrl}
          onChange={(event) =>
            updateFilters({
              status: event.target.value as StatusFilter,
              page: 1,
            })
          }
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="Approved">Approved</option>
          <option value="Declined">Declined</option>
          <option value="Pending">Pending</option>
          <option value="Refunded">Refunded</option>
          <option value="PartiallyRefunded">Partially refunded</option>
        </select>
        <button type="submit" className="secondary-button">
          Search
        </button>
      </form>

      {merchantIdFromUrl || cardIdFromUrl ? (
        <div className="filter-chips">
          {merchantIdFromUrl ? (
            <span className="filter-chip">
              Merchant filter active
              <button
                type="button"
                onClick={() => updateFilters({ merchantId: '', page: 1 })}
              >
                Clear
              </button>
            </span>
          ) : null}
          {cardIdFromUrl ? (
            <span className="filter-chip">
              Card filter active
              <button
                type="button"
                onClick={() => updateFilters({ cardId: '', page: 1 })}
              >
                Clear
              </button>
            </span>
          ) : null}
          <button
            type="button"
            className="secondary-button"
            onClick={clearContextFilters}
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {error ? <div className="form-error">{error}</div> : null}

      {isLoading ? (
        <div className="notice-card">
          <p>Loading transactions...</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length === 0 ? (
        <div className="notice-card">
          <h2>No transactions found</h2>
          <p>
            {canCreate
              ? 'Run a payment above or adjust your filters.'
              : 'Try a different search term or filter.'}
          </p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Merchant</th>
                  <th>Card</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <Link
                        className="text-link mono-text"
                        to={`/transactions/${transaction.id}`}
                      >
                        {transaction.transactionCode}
                      </Link>
                    </td>
                    <td>
                      <div>{transaction.merchantName}</div>
                      <div className="muted-text">{transaction.merchantCode}</div>
                    </td>
                    <td className="mono-text">{transaction.maskedCardNumber}</td>
                    <td>
                      {formatAmount(transaction.amount, transaction.currency)}
                    </td>
                    <td>{transaction.paymentType}</td>
                    <td>
                      <span className={transactionStatusClass(transaction.status)}>
                        {transaction.status}
                      </span>
                    </td>
                    <td>
                      <span className={riskLevelClass(transaction.riskLevel)}>
                        {transaction.riskLevel}
                      </span>
                    </td>
                    <td>{formatDateTime(transaction.createdAt)}</td>
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
              Previous
            </button>
            <span>
              Page {result.page} of {Math.max(result.totalPages, 1)} ·{' '}
              {result.totalCount} total
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={!result.hasNextPage}
              onClick={() => updateFilters({ page: page + 1 })}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
