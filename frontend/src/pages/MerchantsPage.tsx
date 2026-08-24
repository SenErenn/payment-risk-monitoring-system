import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  createMerchant,
  listMerchants,
} from '../api/merchants'
import type { Merchant, PagedResult } from '../api/merchantTypes'
import { useAuth } from '../auth/AuthContext'

type StatusFilter = 'all' | 'active' | 'inactive'

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

export function MerchantsPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole('Admin')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const searchFromUrl = searchParams.get('search') ?? ''
  const statusFromUrl = (searchParams.get('status') as StatusFilter) || 'all'

  const [searchInput, setSearchInput] = useState(searchFromUrl)
  const [result, setResult] = useState<PagedResult<Merchant> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createCode, setCreateCode] = useState('')
  const [createName, setCreateName] = useState('')
  const [createCategory, setCreateCategory] = useState('')
  const [createActive, setCreateActive] = useState(true)
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
        const isActive =
          statusFromUrl === 'active'
            ? true
            : statusFromUrl === 'inactive'
              ? false
              : null

        const data = await listMerchants({
          page,
          pageSize: 10,
          search: searchFromUrl,
          isActive,
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
              : 'Unable to load merchants.',
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
  }, [page, searchFromUrl, statusFromUrl, reloadToken])

  function updateFilters(next: {
    search?: string
    status?: StatusFilter
    page?: number
  }) {
    const params = new URLSearchParams()
    const search = next.search ?? searchFromUrl
    const status = next.status ?? statusFromUrl
    const nextPage = next.page ?? 1

    if (search.trim()) {
      params.set('search', search.trim())
    }

    if (status !== 'all') {
      params.set('status', status)
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

    try {
      const merchant = await createMerchant({
        merchantCode: createCode.trim(),
        name: createName.trim(),
        category: createCategory.trim(),
        isActive: createActive,
      })
      setShowCreate(false)
      setCreateCode('')
      setCreateName('')
      setCreateCategory('')
      setCreateActive(true)
      setReloadToken((value) => value + 1)
      navigate(`/merchants/${merchant.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.errors.length > 0 ? ` ${err.errors.join(' ')}` : ''
        setCreateError(`${err.message}${details}`)
      } else {
        setCreateError('Unable to create merchant.')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="page page-wide">
      <div className="page-header page-header-row">
        <div>
          <h1>Merchants</h1>
          <p>Browse and manage merchant profiles used in payment simulation.</p>
        </div>
        {canManage ? (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setShowCreate((open) => !open)
              setCreateError(null)
            }}
          >
            {showCreate ? 'Close form' : 'Create merchant'}
          </button>
        ) : null}
      </div>

      {canManage && showCreate ? (
        <form className="panel-form" onSubmit={handleCreate}>
          <h2>Create merchant</h2>
          <div className="form-grid">
            <label htmlFor="merchantCode">
              Merchant code
              <input
                id="merchantCode"
                value={createCode}
                onChange={(event) => setCreateCode(event.target.value)}
                placeholder="MCH-DEMO-01"
                required
              />
            </label>
            <label htmlFor="merchantName">
              Name
              <input
                id="merchantName"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                required
              />
            </label>
            <label htmlFor="merchantCategory">
              Category
              <input
                id="merchantCategory"
                value={createCategory}
                onChange={(event) => setCreateCategory(event.target.value)}
                required
              />
            </label>
            <label className="checkbox-field" htmlFor="merchantActive">
              <input
                id="merchantActive"
                type="checkbox"
                checked={createActive}
                onChange={(event) => setCreateActive(event.target.checked)}
              />
              Active on create
            </label>
          </div>
          {createError ? <div className="form-error">{createError}</div> : null}
          <button type="submit" className="primary-button" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Save merchant'}
          </button>
        </form>
      ) : null}

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          placeholder="Search by code, name, or category"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search merchants"
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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="submit" className="secondary-button">
          Search
        </button>
      </form>

      {error ? <div className="form-error">{error}</div> : null}

      {isLoading ? (
        <div className="notice-card">
          <p>Loading merchants...</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length === 0 ? (
        <div className="notice-card">
          <h2>No merchants found</h2>
          <p>Try a different search term or status filter.</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((merchant) => (
                  <tr key={merchant.id}>
                    <td>
                      <Link className="text-link" to={`/merchants/${merchant.id}`}>
                        {merchant.merchantCode}
                      </Link>
                    </td>
                    <td>{merchant.name}</td>
                    <td>{merchant.category}</td>
                    <td>
                      <span
                        className={
                          merchant.isActive ? 'status-chip active' : 'status-chip inactive'
                        }
                      >
                        {merchant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(merchant.updatedAt)}</td>
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

      {!canManage ? (
        <div className="notice-card">
          <p>Viewer access is read-only. Create and edit actions require Admin.</p>
        </div>
      ) : null}
    </div>
  )
}
