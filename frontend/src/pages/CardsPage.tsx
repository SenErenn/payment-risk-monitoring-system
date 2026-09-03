import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { createCard, listCards } from '../api/cards'
import type {
  Card,
  CardStatus,
  CardType,
  PagedResult,
} from '../api/cardTypes'
import { useLocale, useT } from '../i18n'
import { cardStatusClass, formatDateTime, formatMoney } from './cardUi'

type StatusFilter = 'all' | CardStatus
type TypeFilter = 'all' | CardType

export function CardsPage() {
  const navigate = useNavigate()
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const searchFromUrl = searchParams.get('search') ?? ''
  const statusFromUrl = (searchParams.get('status') as StatusFilter) || 'all'
  const typeFromUrl = (searchParams.get('type') as TypeFilter) || 'all'

  const [searchInput, setSearchInput] = useState(searchFromUrl)
  const [result, setResult] = useState<PagedResult<Card> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [cardType, setCardType] = useState<CardType>('Credit')
  const [creditLimit, setCreditLimit] = useState('10000')
  const [availableLimit, setAvailableLimit] = useState('10000')
  const [lastFourDigits, setLastFourDigits] = useState('')
  const [createStatus, setCreateStatus] = useState<CardStatus>('Active')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    setSearchInput(searchFromUrl)
  }, [searchFromUrl])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await listCards({
          page,
          pageSize: 10,
          search: searchFromUrl,
          status: statusFromUrl === 'all' ? null : statusFromUrl,
          cardType: typeFromUrl === 'all' ? null : typeFromUrl,
        })

        if (!cancelled) {
          setResult(data)
        }
      } catch (err) {
        if (!cancelled) {
          setResult(null)
          setError(
            err instanceof ApiError ? err.message : t('cards.loadFailed'),
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
  }, [page, searchFromUrl, statusFromUrl, typeFromUrl, reloadToken, t])

  function updateFilters(next: {
    search?: string
    status?: StatusFilter
    type?: TypeFilter
    page?: number
  }) {
    const params = new URLSearchParams()
    const search = next.search ?? searchFromUrl
    const status = next.status ?? statusFromUrl
    const type = next.type ?? typeFromUrl
    const nextPage = next.page ?? 1

    if (search.trim()) {
      params.set('search', search.trim())
    }

    if (status !== 'all') {
      params.set('status', status)
    }

    if (type !== 'all') {
      params.set('type', type)
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)
    setIsCreating(true)

    const credit = Number(creditLimit)
    const available = Number(availableLimit)

    if (Number.isNaN(credit) || Number.isNaN(available)) {
      setCreateError(t('cards.invalidLimits'))
      setIsCreating(false)
      return
    }

    try {
      const card = await createCard({
        cardType,
        creditLimit: credit,
        availableLimit: available,
        lastFourDigits: lastFourDigits.trim(),
        status: createStatus,
      })
      setShowCreate(false)
      setCardType('Credit')
      setCreditLimit('10000')
      setAvailableLimit('10000')
      setLastFourDigits('')
      setCreateStatus('Active')
      setReloadToken((value) => value + 1)
      navigate(`/cards/${card.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.errors.length > 0 ? ` ${err.errors.join(' ')}` : ''
        setCreateError(`${err.message}${details}`)
      } else {
        setCreateError(t('cards.createFailed'))
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="page page-wide">
      <div className="page-header page-header-row">
        <div>
          <h1>{t('cards.title')}</h1>
          <p>{t('cards.subtitle')}</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setShowCreate((open) => !open)
            setCreateError(null)
          }}
        >
          {showCreate ? t('cards.closeForm') : t('cards.create')}
        </button>
      </div>

      {showCreate ? (
        <form className="panel-form" onSubmit={handleCreate}>
          <h2>{t('cards.createTitle')}</h2>
          <div className="form-grid">
            <label htmlFor="cardType">
              {t('cards.cardType')}
              <select
                id="cardType"
                value={cardType}
                onChange={(event) => setCardType(event.target.value as CardType)}
              >
                <option value="Credit">{t('status.Credit')}</option>
                <option value="Debit">{t('status.Debit')}</option>
              </select>
            </label>
            <label htmlFor="createStatus">
              {t('common.status')}
              <select
                id="createStatus"
                value={createStatus}
                onChange={(event) =>
                  setCreateStatus(event.target.value as CardStatus)
                }
              >
                <option value="Active">{t('status.Active')}</option>
                <option value="Passive">{t('status.Passive')}</option>
                <option value="Blocked">{t('status.Blocked')}</option>
                <option value="Expired">{t('status.Expired')}</option>
              </select>
            </label>
            <label htmlFor="creditLimit">
              {t('cards.creditLimit')}
              <input
                id="creditLimit"
                type="number"
                min="0.01"
                step="0.01"
                value={creditLimit}
                onChange={(event) => setCreditLimit(event.target.value)}
                required
              />
            </label>
            <label htmlFor="availableLimit">
              {t('cards.availableLimit')}
              <input
                id="availableLimit"
                type="number"
                min="0"
                step="0.01"
                value={availableLimit}
                onChange={(event) => setAvailableLimit(event.target.value)}
                required
              />
            </label>
            <label htmlFor="lastFourDigits">
              {t('cards.lastFour')}
              <input
                id="lastFourDigits"
                value={lastFourDigits}
                onChange={(event) => setLastFourDigits(event.target.value)}
                placeholder="4242"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                required
              />
            </label>
          </div>
          <p className="form-hint">{t('cards.hint')}</p>
          {createError ? <div className="form-error">{createError}</div> : null}
          <button type="submit" className="primary-button" disabled={isCreating}>
            {isCreating ? t('cards.creating') : t('cards.save')}
          </button>
        </form>
      ) : null}

      <form className="toolbar toolbar-cards" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          placeholder={t('cards.searchPlaceholder')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label={t('cards.searchAria')}
        />
        <select
          value={statusFromUrl}
          onChange={(event) =>
            updateFilters({
              status: event.target.value as StatusFilter,
              page: 1,
            })
          }
          aria-label={t('cards.statusFilterAria')}
        >
          <option value="all">{t('cards.allStatuses')}</option>
          <option value="Active">{t('status.Active')}</option>
          <option value="Blocked">{t('status.Blocked')}</option>
          <option value="Passive">{t('status.Passive')}</option>
          <option value="Expired">{t('status.Expired')}</option>
        </select>
        <select
          value={typeFromUrl}
          onChange={(event) =>
            updateFilters({
              type: event.target.value as TypeFilter,
              page: 1,
            })
          }
          aria-label={t('cards.typeFilterAria')}
        >
          <option value="all">{t('cards.allTypes')}</option>
          <option value="Credit">{t('status.Credit')}</option>
          <option value="Debit">{t('status.Debit')}</option>
        </select>
        <button type="submit" className="secondary-button">
          {t('common.search')}
        </button>
      </form>

      {error ? <div className="form-error">{error}</div> : null}

      {isLoading ? (
        <div className="notice-card">
          <p>{t('cards.loading')}</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length === 0 ? (
        <div className="notice-card">
          <h2>{t('cards.emptyTitle')}</h2>
          <p>{t('cards.emptyHint')}</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('cards.colMasked')}</th>
                  <th>{t('cards.colType')}</th>
                  <th>{t('cards.colStatus')}</th>
                  <th>{t('cards.colCredit')}</th>
                  <th>{t('cards.colAvailable')}</th>
                  <th>{t('cards.colUpdated')}</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((card) => (
                  <tr key={card.id}>
                    <td>
                      <Link className="text-link" to={`/cards/${card.id}`}>
                        {card.maskedCardNumber}
                      </Link>
                    </td>
                    <td>{t(`status.${card.cardType}`)}</td>
                    <td>
                      <span className={cardStatusClass(card.status)}>
                        {t(`status.${card.status}`)}
                      </span>
                    </td>
                    <td>{formatMoney(card.creditLimit)}</td>
                    <td>{formatMoney(card.availableLimit)}</td>
                    <td>{formatDateTime(card.updatedAt, dateLocale)}</td>
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
