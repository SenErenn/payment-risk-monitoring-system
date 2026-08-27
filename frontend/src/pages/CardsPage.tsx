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
import { cardStatusClass, formatDateTime, formatMoney } from './cardUi'

type StatusFilter = 'all' | CardStatus
type TypeFilter = 'all' | CardType

export function CardsPage() {
  const navigate = useNavigate()
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
            err instanceof ApiError ? err.message : 'Unable to load cards.',
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
  }, [page, searchFromUrl, statusFromUrl, typeFromUrl, reloadToken])

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
      setCreateError('Credit and available limits must be valid numbers.')
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
        setCreateError('Unable to create card.')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="page page-wide">
      <div className="page-header page-header-row">
        <div>
          <h1>Cards</h1>
          <p>
            Manage demo cards with fake tokens and masked numbers. No real PAN
            or CVV is stored.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setShowCreate((open) => !open)
            setCreateError(null)
          }}
        >
          {showCreate ? 'Close form' : 'Create card'}
        </button>
      </div>

      {showCreate ? (
        <form className="panel-form" onSubmit={handleCreate}>
          <h2>Create demo card</h2>
          <div className="form-grid">
            <label htmlFor="cardType">
              Card type
              <select
                id="cardType"
                value={cardType}
                onChange={(event) => setCardType(event.target.value as CardType)}
              >
                <option value="Credit">Credit</option>
                <option value="Debit">Debit</option>
              </select>
            </label>
            <label htmlFor="createStatus">
              Status
              <select
                id="createStatus"
                value={createStatus}
                onChange={(event) =>
                  setCreateStatus(event.target.value as CardStatus)
                }
              >
                <option value="Active">Active</option>
                <option value="Passive">Passive</option>
                <option value="Blocked">Blocked</option>
                <option value="Expired">Expired</option>
              </select>
            </label>
            <label htmlFor="creditLimit">
              Credit limit
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
              Available limit
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
              Last four digits
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
          <p className="form-hint">
            Only the last four digits are used to build a masked number. Never
            enter a full card number or CVV.
          </p>
          {createError ? <div className="form-error">{createError}</div> : null}
          <button type="submit" className="primary-button" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Save card'}
          </button>
        </form>
      ) : null}

      <form className="toolbar toolbar-cards" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          placeholder="Search by token or masked number"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search cards"
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
          <option value="Active">Active</option>
          <option value="Blocked">Blocked</option>
          <option value="Passive">Passive</option>
          <option value="Expired">Expired</option>
        </select>
        <select
          value={typeFromUrl}
          onChange={(event) =>
            updateFilters({
              type: event.target.value as TypeFilter,
              page: 1,
            })
          }
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          <option value="Credit">Credit</option>
          <option value="Debit">Debit</option>
        </select>
        <button type="submit" className="secondary-button">
          Search
        </button>
      </form>

      {error ? <div className="form-error">{error}</div> : null}

      {isLoading ? (
        <div className="notice-card">
          <p>Loading cards...</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length === 0 ? (
        <div className="notice-card">
          <h2>No cards found</h2>
          <p>Try a different search term or filter.</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Masked number</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Credit limit</th>
                  <th>Available</th>
                  <th>Updated</th>
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
                    <td>{card.cardType}</td>
                    <td>
                      <span className={cardStatusClass(card.status)}>
                        {card.status}
                      </span>
                    </td>
                    <td>{formatMoney(card.creditLimit)}</td>
                    <td>{formatMoney(card.availableLimit)}</td>
                    <td>{formatDateTime(card.updatedAt)}</td>
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
