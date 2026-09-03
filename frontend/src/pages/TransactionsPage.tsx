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
  SortDirection,
  Transaction,
  TransactionSortBy,
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
type PaymentTypeFilter = 'all' | PaymentType

const PAYMENT_TYPES: PaymentType[] = [
  'Contactless',
  'Chip',
  'Online',
  'MagneticStripe',
]

const CURRENCIES: CurrencyCode[] = ['TRY', 'USD', 'EUR']

const SORT_OPTIONS: { value: TransactionSortBy; label: string }[] = [
  { value: 'createdAt', label: 'Created' },
  { value: 'amount', label: 'Amount' },
  { value: 'status', label: 'Status' },
  { value: 'riskScore', label: 'Risk score' },
  { value: 'riskLevel', label: 'Risk level' },
  { value: 'transactionCode', label: 'Code' },
  { value: 'paymentType', label: 'Payment type' },
]

function toDatetimeLocalValue(iso: string): string {
  if (!iso) {
    return ''
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocalValue(local: string): string | null {
  if (!local.trim()) {
    return null
  }

  const date = new Date(local)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function TransactionsPage() {
  const { hasRole } = useAuth()
  const canCreate = hasRole('Admin', 'Analyst')
  const canViewCards = hasRole('Admin', 'Analyst')
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const searchFromUrl = searchParams.get('search') ?? ''
  const statusFromUrl = (searchParams.get('status') as StatusFilter) || 'all'
  const paymentTypeFromUrl =
    (searchParams.get('paymentType') as PaymentTypeFilter) || 'all'
  const merchantIdFromUrl = searchParams.get('merchantId') ?? ''
  const cardIdFromUrl = searchParams.get('cardId') ?? ''
  const minAmountFromUrl = searchParams.get('minAmount') ?? ''
  const maxAmountFromUrl = searchParams.get('maxAmount') ?? ''
  const createdFromFromUrl = searchParams.get('createdFrom') ?? ''
  const createdToFromUrl = searchParams.get('createdTo') ?? ''
  const sortByFromUrl =
    (searchParams.get('sortBy') as TransactionSortBy) || 'createdAt'
  const sortDirectionFromUrl =
    (searchParams.get('sortDirection') as SortDirection) || 'desc'

  const [searchInput, setSearchInput] = useState(searchFromUrl)
  const [minAmountInput, setMinAmountInput] = useState(minAmountFromUrl)
  const [maxAmountInput, setMaxAmountInput] = useState(maxAmountFromUrl)
  const [createdFromInput, setCreatedFromInput] = useState(
    toDatetimeLocalValue(createdFromFromUrl),
  )
  const [createdToInput, setCreatedToInput] = useState(
    toDatetimeLocalValue(createdToFromUrl),
  )

  const [result, setResult] = useState<PagedResult<Transaction> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(true)

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
    setMinAmountInput(minAmountFromUrl)
    setMaxAmountInput(maxAmountFromUrl)
    setCreatedFromInput(toDatetimeLocalValue(createdFromFromUrl))
    setCreatedToInput(toDatetimeLocalValue(createdToFromUrl))
  }, [
    searchFromUrl,
    minAmountFromUrl,
    maxAmountFromUrl,
    createdFromFromUrl,
    createdToFromUrl,
  ])

  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      setOptionsLoading(true)
      setOptionsError(null)

      try {
        const merchantPage = await listMerchants({ page: 1, pageSize: 100 })
        let cardItems: Card[] = []

        if (canViewCards) {
          const cardPage = await listCards({ page: 1, pageSize: 100 })
          cardItems = cardPage.items
        }

        if (cancelled) {
          return
        }

        setMerchants(merchantPage.items)
        setCards(cardItems)

        if (canCreate) {
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
              cardItems.find((item) => item.status === 'Active') ?? cardItems[0]
            return preferred?.id ?? ''
          })
        }
      } catch (err) {
        if (!cancelled) {
          setOptionsError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load filter options.',
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
  }, [canCreate, canViewCards])

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
          paymentType: paymentTypeFromUrl === 'all' ? null : paymentTypeFromUrl,
          merchantId: merchantIdFromUrl || null,
          cardId: cardIdFromUrl || null,
          minAmount: parseOptionalNumber(minAmountFromUrl),
          maxAmount: parseOptionalNumber(maxAmountFromUrl),
          createdFrom: createdFromFromUrl || null,
          createdTo: createdToFromUrl || null,
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
    paymentTypeFromUrl,
    merchantIdFromUrl,
    cardIdFromUrl,
    minAmountFromUrl,
    maxAmountFromUrl,
    createdFromFromUrl,
    createdToFromUrl,
    sortByFromUrl,
    sortDirectionFromUrl,
    reloadToken,
  ])

  function updateFilters(next: {
    search?: string
    status?: StatusFilter
    paymentType?: PaymentTypeFilter
    merchantId?: string
    cardId?: string
    minAmount?: string
    maxAmount?: string
    createdFrom?: string
    createdTo?: string
    sortBy?: TransactionSortBy
    sortDirection?: SortDirection
    page?: number
  }) {
    const params = new URLSearchParams()
    const search = next.search ?? searchFromUrl
    const status = next.status ?? statusFromUrl
    const paymentTypeValue = next.paymentType ?? paymentTypeFromUrl
    const merchantIdValue =
      next.merchantId !== undefined ? next.merchantId : merchantIdFromUrl
    const cardIdValue = next.cardId !== undefined ? next.cardId : cardIdFromUrl
    const minAmountValue =
      next.minAmount !== undefined ? next.minAmount : minAmountFromUrl
    const maxAmountValue =
      next.maxAmount !== undefined ? next.maxAmount : maxAmountFromUrl
    const createdFromValue =
      next.createdFrom !== undefined ? next.createdFrom : createdFromFromUrl
    const createdToValue =
      next.createdTo !== undefined ? next.createdTo : createdToFromUrl
    const sortByValue = next.sortBy ?? sortByFromUrl
    const sortDirectionValue = next.sortDirection ?? sortDirectionFromUrl
    const nextPage = next.page ?? 1

    if (search.trim()) {
      params.set('search', search.trim())
    }

    if (status !== 'all') {
      params.set('status', status)
    }

    if (paymentTypeValue !== 'all') {
      params.set('paymentType', paymentTypeValue)
    }

    if (merchantIdValue.trim()) {
      params.set('merchantId', merchantIdValue.trim())
    }

    if (cardIdValue.trim()) {
      params.set('cardId', cardIdValue.trim())
    }

    if (minAmountValue.trim()) {
      params.set('minAmount', minAmountValue.trim())
    }

    if (maxAmountValue.trim()) {
      params.set('maxAmount', maxAmountValue.trim())
    }

    if (createdFromValue.trim()) {
      params.set('createdFrom', createdFromValue.trim())
    }

    if (createdToValue.trim()) {
      params.set('createdTo', createdToValue.trim())
    }

    if (sortByValue !== 'createdAt') {
      params.set('sortBy', sortByValue)
    }

    if (sortDirectionValue !== 'desc') {
      params.set('sortDirection', sortDirectionValue)
    }

    if (nextPage > 1) {
      params.set('page', String(nextPage))
    }

    setSearchParams(params)
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const createdFromIso = fromDatetimeLocalValue(createdFromInput)
    const createdToIso = fromDatetimeLocalValue(createdToInput)

    if (createdFromInput && !createdFromIso) {
      setError('Created from must be a valid date/time.')
      return
    }

    if (createdToInput && !createdToIso) {
      setError('Created to must be a valid date/time.')
      return
    }

    const minAmount = parseOptionalNumber(minAmountInput)
    const maxAmount = parseOptionalNumber(maxAmountInput)

    if (minAmountInput.trim() && minAmount === null) {
      setError('Min amount must be a valid number.')
      return
    }

    if (maxAmountInput.trim() && maxAmount === null) {
      setError('Max amount must be a valid number.')
      return
    }

    updateFilters({
      search: searchInput,
      minAmount: minAmount === null ? '' : String(minAmount),
      maxAmount: maxAmount === null ? '' : String(maxAmount),
      createdFrom: createdFromIso ?? '',
      createdTo: createdToIso ?? '',
      page: 1,
    })
  }

  function clearAllFilters() {
    setSearchInput('')
    setMinAmountInput('')
    setMaxAmountInput('')
    setCreatedFromInput('')
    setCreatedToInput('')
    setSearchParams(new URLSearchParams())
  }

  const hasActiveFilters = Boolean(
    searchFromUrl ||
      statusFromUrl !== 'all' ||
      paymentTypeFromUrl !== 'all' ||
      merchantIdFromUrl ||
      cardIdFromUrl ||
      minAmountFromUrl ||
      maxAmountFromUrl ||
      createdFromFromUrl ||
      createdToFromUrl ||
      sortByFromUrl !== 'createdAt' ||
      sortDirectionFromUrl !== 'desc',
  )

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
        idempotencyKey: crypto.randomUUID(),
      })
      setLastResult(transaction)
      setReloadToken((value) => value + 1)

      if (canCreate && !transaction.isReplay) {
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
  const selectedFilterMerchant = merchants.find(
    (merchant) => merchant.id === merchantIdFromUrl,
  )
  const selectedFilterCard = cards.find((card) => card.id === cardIdFromUrl)

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>
            Simulate payments, filter the ledger, and open transaction detail
            with merchant and card links.
          </p>
        </div>
      </div>

      {canCreate ? (
        <form className="panel-form" onSubmit={handleMakePayment}>
          <h2>Payment Simulator</h2>
          <p className="form-hint">
            Choose a merchant and card, then submit a demo payment. Inactive
            merchants, non-active cards, and insufficient limits are declined.
            Duplicate clicks within 30 seconds (or the same idempotency key) reuse
            the original payment without charging again.
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
                <strong>
                  {lastResult.status}
                  {lastResult.isReplay ? ' (replay)' : ''}
                </strong>
                <span className="mono-text">{lastResult.transactionCode}</span>
              </div>
              <p>
                {lastResult.declineReason ??
                  lastResult.decisionMessage ??
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
            Your Viewer role can review and filter transactions below. Payment
            simulation is available to Admin and Analyst users.
          </p>
        </div>
      )}

      <form className="panel-form filter-panel" onSubmit={handleFilterSubmit}>
        <div className="page-header-row filter-panel-header">
          <h2>Filters</h2>
          {hasActiveFilters ? (
            <button
              type="button"
              className="secondary-button"
              onClick={clearAllFilters}
            >
              Clear all
            </button>
          ) : null}
        </div>

        <div className="form-grid form-grid-filters">
          <label htmlFor="txSearch">
            Search
            <input
              id="txSearch"
              type="search"
              placeholder="Code, merchant, or card"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>

          <label htmlFor="txStatus">
            Status
            <select
              id="txStatus"
              value={statusFromUrl}
              onChange={(event) =>
                updateFilters({
                  status: event.target.value as StatusFilter,
                  page: 1,
                })
              }
            >
              <option value="all">All statuses</option>
              <option value="Approved">Approved</option>
              <option value="Declined">Declined</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
              <option value="PartiallyRefunded">Partially refunded</option>
            </select>
          </label>

          <label htmlFor="txPaymentType">
            Payment type
            <select
              id="txPaymentType"
              value={paymentTypeFromUrl}
              onChange={(event) =>
                updateFilters({
                  paymentType: event.target.value as PaymentTypeFilter,
                  page: 1,
                })
              }
            >
              <option value="all">All types</option>
              {PAYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="txMerchant">
            Merchant
            <select
              id="txMerchant"
              value={merchantIdFromUrl}
              onChange={(event) =>
                updateFilters({
                  merchantId: event.target.value,
                  page: 1,
                })
              }
              disabled={optionsLoading}
            >
              <option value="">All merchants</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name} ({merchant.merchantCode})
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="txCard">
            Card
            <select
              id="txCard"
              value={cardIdFromUrl}
              onChange={(event) =>
                updateFilters({
                  cardId: event.target.value,
                  page: 1,
                })
              }
              disabled={optionsLoading || !canViewCards}
            >
              <option value="">
                {canViewCards ? 'All cards' : 'Card filter via detail links'}
              </option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.maskedCardNumber} · {card.status}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="txMinAmount">
            Min amount
            <input
              id="txMinAmount"
              type="number"
              min="0"
              step="0.01"
              value={minAmountInput}
              onChange={(event) => setMinAmountInput(event.target.value)}
              placeholder="0"
            />
          </label>

          <label htmlFor="txMaxAmount">
            Max amount
            <input
              id="txMaxAmount"
              type="number"
              min="0"
              step="0.01"
              value={maxAmountInput}
              onChange={(event) => setMaxAmountInput(event.target.value)}
              placeholder="1000"
            />
          </label>

          <label htmlFor="txCreatedFrom">
            Created from
            <input
              id="txCreatedFrom"
              type="datetime-local"
              value={createdFromInput}
              onChange={(event) => setCreatedFromInput(event.target.value)}
            />
          </label>

          <label htmlFor="txCreatedTo">
            Created to
            <input
              id="txCreatedTo"
              type="datetime-local"
              value={createdToInput}
              onChange={(event) => setCreatedToInput(event.target.value)}
            />
          </label>

          <label htmlFor="txSortBy">
            Sort by
            <select
              id="txSortBy"
              value={sortByFromUrl}
              onChange={(event) =>
                updateFilters({
                  sortBy: event.target.value as TransactionSortBy,
                  page: 1,
                })
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="txSortDirection">
            Direction
            <select
              id="txSortDirection"
              value={sortDirectionFromUrl}
              onChange={(event) =>
                updateFilters({
                  sortDirection: event.target.value as SortDirection,
                  page: 1,
                })
              }
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>

        <div className="action-row">
          <button type="submit" className="primary-button">
            Apply filters
          </button>
        </div>
      </form>

      {hasActiveFilters ? (
        <div className="filter-chips">
          {statusFromUrl !== 'all' ? (
            <span className="filter-chip">Status: {statusFromUrl}</span>
          ) : null}
          {paymentTypeFromUrl !== 'all' ? (
            <span className="filter-chip">Type: {paymentTypeFromUrl}</span>
          ) : null}
          {merchantIdFromUrl ? (
            <span className="filter-chip">
              Merchant:{' '}
              {selectedFilterMerchant?.name ?? merchantIdFromUrl.slice(0, 8)}
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
              Card:{' '}
              {selectedFilterCard?.maskedCardNumber ?? cardIdFromUrl.slice(0, 8)}
              <button
                type="button"
                onClick={() => updateFilters({ cardId: '', page: 1 })}
              >
                Clear
              </button>
            </span>
          ) : null}
          {minAmountFromUrl || maxAmountFromUrl ? (
            <span className="filter-chip">
              Amount: {minAmountFromUrl || '…'} – {maxAmountFromUrl || '…'}
            </span>
          ) : null}
          {createdFromFromUrl || createdToFromUrl ? (
            <span className="filter-chip">Date range active</span>
          ) : null}
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
                      <Link
                        className="text-link"
                        to={`/transactions?merchantId=${transaction.merchantId}`}
                      >
                        Filter
                      </Link>
                    </td>
                    <td>
                      <div className="mono-text">{transaction.maskedCardNumber}</div>
                      <Link
                        className="text-link"
                        to={`/transactions?cardId=${transaction.cardId}`}
                      >
                        Filter
                      </Link>
                    </td>
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
