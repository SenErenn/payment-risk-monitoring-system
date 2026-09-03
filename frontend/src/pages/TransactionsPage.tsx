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
import { useLocale, useT } from '../i18n'
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

const SORT_OPTIONS: TransactionSortBy[] = [
  'createdAt',
  'amount',
  'status',
  'riskScore',
  'riskLevel',
  'transactionCode',
  'paymentType',
]

const SORT_LABEL_KEYS: Record<TransactionSortBy, string> = {
  createdAt: 'transactions.sortCreated',
  amount: 'transactions.sortAmount',
  status: 'transactions.sortStatus',
  riskScore: 'transactions.sortRiskScore',
  riskLevel: 'transactions.sortRiskLevel',
  transactionCode: 'transactions.sortCode',
  paymentType: 'transactions.sortPaymentType',
}

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
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
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
              : t('transactions.optionsFailed'),
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
  }, [canCreate, canViewCards, t])

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
              : t('transactions.loadFailed'),
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
    t,
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
      setError(t('transactions.invalidCreatedFrom'))
      return
    }

    if (createdToInput && !createdToIso) {
      setError(t('transactions.invalidCreatedTo'))
      return
    }

    const minAmount = parseOptionalNumber(minAmountInput)
    const maxAmount = parseOptionalNumber(maxAmountInput)

    if (minAmountInput.trim() && minAmount === null) {
      setError(t('transactions.invalidMinAmount'))
      return
    }

    if (maxAmountInput.trim() && maxAmount === null) {
      setError(t('transactions.invalidMaxAmount'))
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
      setPayError(t('transactions.amountPositive'))
      setIsPaying(false)
      return
    }

    if (!merchantId || !cardId) {
      setPayError(t('transactions.selectBoth'))
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
        setPayError(t('transactions.payFailed'))
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
          <h1>{t('transactions.title')}</h1>
          <p>{t('transactions.subtitle')}</p>
        </div>
      </div>

      {canCreate ? (
        <form className="panel-form" onSubmit={handleMakePayment}>
          <h2>{t('transactions.simulatorTitle')}</h2>
          <p className="form-hint">{t('transactions.simulatorHint')}</p>

          {optionsLoading ? (
            <p className="form-hint">{t('transactions.loadingOptions')}</p>
          ) : null}

          {optionsError ? <div className="form-error">{optionsError}</div> : null}

          <div className="form-grid form-grid-simulator">
            <label htmlFor="simMerchant">
              {t('transactions.merchant')}
              <select
                id="simMerchant"
                value={merchantId}
                onChange={(event) => setMerchantId(event.target.value)}
                required
                disabled={optionsLoading || merchants.length === 0}
              >
                {merchants.length === 0 ? (
                  <option value="">{t('transactions.noMerchants')}</option>
                ) : null}
                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name} ({merchant.merchantCode})
                    {merchant.isActive ? '' : t('transactions.inactiveSuffix')}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="simCard">
              {t('transactions.card')}
              <select
                id="simCard"
                value={cardId}
                onChange={(event) => setCardId(event.target.value)}
                required
                disabled={optionsLoading || cards.length === 0}
              >
                {cards.length === 0 ? (
                  <option value="">{t('transactions.noCards')}</option>
                ) : null}
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.maskedCardNumber} · {t(`status.${card.cardType}`)} ·{' '}
                    {t(`status.${card.status}`)} · {card.availableLimit.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="simAmount">
              {t('transactions.amount')}
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
              {t('transactions.currency')}
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
              {t('transactions.paymentType')}
              <select
                id="simPaymentType"
                value={paymentType}
                onChange={(event) =>
                  setPaymentType(event.target.value as PaymentType)
                }
              >
                {PAYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`status.${type}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedCard ? (
            <p className="form-hint">
              {t('transactions.availableLimit')}{' '}
              <strong>{selectedCard.availableLimit.toFixed(2)}</strong>
            </p>
          ) : null}

          {payError ? <div className="form-error">{payError}</div> : null}

          {lastResult ? (
            <div className={decisionPanelClass(lastResult.status)}>
              <div className="decision-panel-header">
                <strong>
                  {t(`status.${lastResult.status}`)}
                  {lastResult.isReplay ? ` ${t('transactions.replay')}` : ''}
                </strong>
                <span className="mono-text">{lastResult.transactionCode}</span>
              </div>
              <p>
                {lastResult.declineReason ??
                  lastResult.decisionMessage ??
                  `${formatAmount(lastResult.amount, lastResult.currency)} · ${t(`status.${lastResult.paymentType}`)}`}
              </p>
              <p className="form-hint">
                {t('transactions.riskLine', {
                  level: t(`status.${lastResult.riskLevel}`),
                  score: lastResult.riskScore,
                })}{' '}
                <Link className="text-link" to={`/transactions/${lastResult.id}`}>
                  {t('transactions.viewTransaction')}
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
            {isPaying
              ? t('transactions.processing')
              : t('transactions.makePayment')}
          </button>
        </form>
      ) : (
        <div className="notice-card">
          <h2>{t('transactions.readOnlyTitle')}</h2>
          <p>{t('transactions.readOnlyBody')}</p>
        </div>
      )}

      <form className="panel-form filter-panel" onSubmit={handleFilterSubmit}>
        <div className="page-header-row filter-panel-header">
          <h2>{t('transactions.filtersTitle')}</h2>
          {hasActiveFilters ? (
            <button
              type="button"
              className="secondary-button"
              onClick={clearAllFilters}
            >
              {t('common.clearAll')}
            </button>
          ) : null}
        </div>

        <div className="form-grid form-grid-filters">
          <label htmlFor="txSearch">
            {t('common.search')}
            <input
              id="txSearch"
              type="search"
              placeholder={t('transactions.searchPlaceholder')}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>

          <label htmlFor="txStatus">
            {t('common.status')}
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
              <option value="all">{t('transactions.allStatuses')}</option>
              <option value="Approved">{t('status.Approved')}</option>
              <option value="Declined">{t('status.Declined')}</option>
              <option value="Pending">{t('status.Pending')}</option>
              <option value="Refunded">{t('status.Refunded')}</option>
              <option value="PartiallyRefunded">
                {t('status.PartiallyRefunded')}
              </option>
            </select>
          </label>

          <label htmlFor="txPaymentType">
            {t('transactions.paymentType')}
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
              <option value="all">{t('transactions.allTypes')}</option>
              {PAYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`status.${type}`)}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="txMerchant">
            {t('transactions.merchant')}
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
              <option value="">{t('transactions.allMerchants')}</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name} ({merchant.merchantCode})
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="txCard">
            {t('transactions.card')}
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
                {canViewCards
                  ? t('transactions.allCards')
                  : t('transactions.cardFilterViaLinks')}
              </option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.maskedCardNumber} · {t(`status.${card.status}`)}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="txMinAmount">
            {t('transactions.minAmount')}
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
            {t('transactions.maxAmount')}
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
            {t('transactions.createdFrom')}
            <input
              id="txCreatedFrom"
              type="datetime-local"
              value={createdFromInput}
              onChange={(event) => setCreatedFromInput(event.target.value)}
            />
          </label>

          <label htmlFor="txCreatedTo">
            {t('transactions.createdTo')}
            <input
              id="txCreatedTo"
              type="datetime-local"
              value={createdToInput}
              onChange={(event) => setCreatedToInput(event.target.value)}
            />
          </label>

          <label htmlFor="txSortBy">
            {t('transactions.sortBy')}
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
              {SORT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(SORT_LABEL_KEYS[value])}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="txSortDirection">
            {t('transactions.direction')}
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
              <option value="desc">{t('transactions.descending')}</option>
              <option value="asc">{t('transactions.ascending')}</option>
            </select>
          </label>
        </div>

        <div className="action-row">
          <button type="submit" className="primary-button">
            {t('common.applyFilters')}
          </button>
        </div>
      </form>

      {hasActiveFilters ? (
        <div className="filter-chips">
          {statusFromUrl !== 'all' ? (
            <span className="filter-chip">
              {t('transactions.chipStatus', {
                value: t(`status.${statusFromUrl}`),
              })}
            </span>
          ) : null}
          {paymentTypeFromUrl !== 'all' ? (
            <span className="filter-chip">
              {t('transactions.chipType', {
                value: t(`status.${paymentTypeFromUrl}`),
              })}
            </span>
          ) : null}
          {merchantIdFromUrl ? (
            <span className="filter-chip">
              {t('transactions.chipMerchant', {
                value:
                  selectedFilterMerchant?.name ?? merchantIdFromUrl.slice(0, 8),
              })}
              <button
                type="button"
                onClick={() => updateFilters({ merchantId: '', page: 1 })}
              >
                {t('common.clear')}
              </button>
            </span>
          ) : null}
          {cardIdFromUrl ? (
            <span className="filter-chip">
              {t('transactions.chipCard', {
                value:
                  selectedFilterCard?.maskedCardNumber ??
                  cardIdFromUrl.slice(0, 8),
              })}
              <button
                type="button"
                onClick={() => updateFilters({ cardId: '', page: 1 })}
              >
                {t('common.clear')}
              </button>
            </span>
          ) : null}
          {minAmountFromUrl || maxAmountFromUrl ? (
            <span className="filter-chip">
              {t('transactions.chipAmount', {
                min: minAmountFromUrl || '…',
                max: maxAmountFromUrl || '…',
              })}
            </span>
          ) : null}
          {createdFromFromUrl || createdToFromUrl ? (
            <span className="filter-chip">{t('transactions.chipDate')}</span>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="form-error">{error}</div> : null}

      {isLoading ? (
        <div className="notice-card">
          <p>{t('transactions.loadingList')}</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length === 0 ? (
        <div className="notice-card">
          <h2>{t('transactions.emptyTitle')}</h2>
          <p>
            {canCreate
              ? t('transactions.emptyCreateHint')
              : t('transactions.emptyFilterHint')}
          </p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('transactions.colCode')}</th>
                  <th>{t('transactions.colMerchant')}</th>
                  <th>{t('transactions.colCard')}</th>
                  <th>{t('transactions.colAmount')}</th>
                  <th>{t('transactions.colType')}</th>
                  <th>{t('transactions.colStatus')}</th>
                  <th>{t('transactions.colRisk')}</th>
                  <th>{t('transactions.colCreated')}</th>
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
                        {t('common.filter')}
                      </Link>
                    </td>
                    <td>
                      <div className="mono-text">{transaction.maskedCardNumber}</div>
                      <Link
                        className="text-link"
                        to={`/transactions?cardId=${transaction.cardId}`}
                      >
                        {t('common.filter')}
                      </Link>
                    </td>
                    <td>
                      {formatAmount(transaction.amount, transaction.currency)}
                    </td>
                    <td>{t(`status.${transaction.paymentType}`)}</td>
                    <td>
                      <span className={transactionStatusClass(transaction.status)}>
                        {t(`status.${transaction.status}`)}
                      </span>
                    </td>
                    <td>
                      <span className={riskLevelClass(transaction.riskLevel)}>
                        {t(`status.${transaction.riskLevel}`)}
                      </span>
                    </td>
                    <td>
                      {formatDateTime(transaction.createdAt, dateLocale)}
                    </td>
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
            <span>
              {t('common.pageOf', {
                page: result.page,
                totalPages: Math.max(result.totalPages, 1),
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
