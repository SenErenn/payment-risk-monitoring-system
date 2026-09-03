import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  createMerchant,
  listMerchants,
} from '../api/merchants'
import type { Merchant, PagedResult } from '../api/merchantTypes'
import { useAuth } from '../auth/AuthContext'
import { useLocale, useT } from '../i18n'

type StatusFilter = 'all' | 'active' | 'inactive'

export function MerchantsPage() {
  const { hasRole } = useAuth()
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
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
              : t('merchants.loadFailed'),
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
  }, [page, searchFromUrl, statusFromUrl, reloadToken, t])

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
        setCreateError(t('merchants.createFailed'))
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="page page-wide">
      <div className="page-header page-header-row">
        <div>
          <h1>{t('merchants.title')}</h1>
          <p>{t('merchants.subtitle')}</p>
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
            {showCreate ? t('merchants.closeForm') : t('merchants.create')}
          </button>
        ) : null}
      </div>

      {canManage && showCreate ? (
        <form className="panel-form" onSubmit={handleCreate}>
          <h2>{t('merchants.createTitle')}</h2>
          <div className="form-grid">
            <label htmlFor="merchantCode">
              {t('merchants.code')}
              <input
                id="merchantCode"
                value={createCode}
                onChange={(event) => setCreateCode(event.target.value)}
                placeholder="MCH-DEMO-01"
                required
              />
            </label>
            <label htmlFor="merchantName">
              {t('merchants.name')}
              <input
                id="merchantName"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                required
              />
            </label>
            <label htmlFor="merchantCategory">
              {t('merchants.category')}
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
              {t('merchants.activeOnCreate')}
            </label>
          </div>
          {createError ? <div className="form-error">{createError}</div> : null}
          <button type="submit" className="primary-button" disabled={isCreating}>
            {isCreating ? t('merchants.creating') : t('merchants.save')}
          </button>
        </form>
      ) : null}

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          placeholder={t('merchants.searchPlaceholder')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label={t('merchants.searchAria')}
        />
        <select
          value={statusFromUrl}
          onChange={(event) =>
            updateFilters({
              status: event.target.value as StatusFilter,
              page: 1,
            })
          }
          aria-label={t('merchants.statusFilterAria')}
        >
          <option value="all">{t('merchants.allStatuses')}</option>
          <option value="active">{t('common.active')}</option>
          <option value="inactive">{t('common.inactive')}</option>
        </select>
        <button type="submit" className="secondary-button">
          {t('common.search')}
        </button>
      </form>

      {error ? <div className="form-error">{error}</div> : null}

      {isLoading ? (
        <div className="notice-card">
          <p>{t('merchants.loading')}</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length === 0 ? (
        <div className="notice-card">
          <h2>{t('merchants.emptyTitle')}</h2>
          <p>{t('merchants.emptyHint')}</p>
        </div>
      ) : null}

      {!isLoading && result && result.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('merchants.colCode')}</th>
                  <th>{t('merchants.colName')}</th>
                  <th>{t('merchants.colCategory')}</th>
                  <th>{t('merchants.colStatus')}</th>
                  <th>{t('merchants.colUpdated')}</th>
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
                        {merchant.isActive
                          ? t('common.active')
                          : t('common.inactive')}
                      </span>
                    </td>
                    <td>
                      {new Date(merchant.updatedAt).toLocaleString(dateLocale)}
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

      {!canManage ? (
        <div className="notice-card">
          <p>{t('merchants.viewerReadOnly')}</p>
        </div>
      ) : null}
    </div>
  )
}
