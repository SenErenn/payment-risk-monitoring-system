import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listAuditActions, listAuditLogs } from '../api/auditLogs'
import type { AuditLog, PagedResult } from '../api/auditLogTypes'
import { ApiError } from '../api/client'
import { useLocale, useT } from '../i18n'
import { formatDateTime } from './transactionUi'

const ENTITY_TYPES = [
  'User',
  'Merchant',
  'Card',
  'Transaction',
  'Refund',
  'RiskRule',
  'RiskAlert',
] as const

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

export function AuditLogsPage() {
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const searchFromUrl = searchParams.get('search') ?? ''
  const actionFromUrl = searchParams.get('action') ?? ''
  const entityTypeFromUrl = searchParams.get('entityType') ?? ''
  const createdFromFromUrl = searchParams.get('createdFrom') ?? ''
  const createdToFromUrl = searchParams.get('createdTo') ?? ''

  const [searchInput, setSearchInput] = useState(searchFromUrl)
  const [createdFromInput, setCreatedFromInput] = useState(
    toDatetimeLocalValue(createdFromFromUrl),
  )
  const [createdToInput, setCreatedToInput] = useState(
    toDatetimeLocalValue(createdToFromUrl),
  )
  const [actions, setActions] = useState<string[]>([])
  const [result, setResult] = useState<PagedResult<AuditLog> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setSearchInput(searchFromUrl)
    setCreatedFromInput(toDatetimeLocalValue(createdFromFromUrl))
    setCreatedToInput(toDatetimeLocalValue(createdToFromUrl))
  }, [searchFromUrl, createdFromFromUrl, createdToFromUrl])

  useEffect(() => {
    let cancelled = false

    async function loadActions() {
      try {
        const data = await listAuditActions()
        if (!cancelled) {
          setActions(data)
        }
      } catch {
        if (!cancelled) {
          setActions([])
        }
      }
    }

    void loadActions()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await listAuditLogs({
          page,
          pageSize: 20,
          search: searchFromUrl || undefined,
          action: actionFromUrl || null,
          entityType: entityTypeFromUrl || null,
          createdFrom: createdFromFromUrl || null,
          createdTo: createdToFromUrl || null,
        })
        if (!cancelled) {
          setResult(data)
        }
      } catch (err) {
        if (!cancelled) {
          setResult(null)
          setError(
            err instanceof ApiError ? err.message : t('auditLogs.loadFailed'),
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
    actionFromUrl,
    entityTypeFromUrl,
    createdFromFromUrl,
    createdToFromUrl,
    t,
  ])

  function updateFilters(next: {
    search?: string
    action?: string
    entityType?: string
    createdFrom?: string
    createdTo?: string
    page?: number
  }) {
    const params = new URLSearchParams()
    const search = next.search ?? searchFromUrl
    const action = next.action !== undefined ? next.action : actionFromUrl
    const entityType =
      next.entityType !== undefined ? next.entityType : entityTypeFromUrl
    const createdFrom =
      next.createdFrom !== undefined ? next.createdFrom : createdFromFromUrl
    const createdTo =
      next.createdTo !== undefined ? next.createdTo : createdToFromUrl
    const nextPage = next.page ?? 1

    if (search.trim()) {
      params.set('search', search.trim())
    }
    if (action) {
      params.set('action', action)
    }
    if (entityType) {
      params.set('entityType', entityType)
    }
    if (createdFrom) {
      params.set('createdFrom', createdFrom)
    }
    if (createdTo) {
      params.set('createdTo', createdTo)
    }
    if (nextPage > 1) {
      params.set('page', String(nextPage))
    }

    setSearchParams(params)
  }

  function handleApplyFilters(event: FormEvent) {
    event.preventDefault()
    updateFilters({
      search: searchInput,
      createdFrom: fromDatetimeLocalValue(createdFromInput) ?? '',
      createdTo: fromDatetimeLocalValue(createdToInput) ?? '',
      page: 1,
    })
  }

  function clearFilters() {
    setSearchInput('')
    setCreatedFromInput('')
    setCreatedToInput('')
    setSearchParams(new URLSearchParams())
  }

  const totalPages = result?.totalPages ?? 1
  const hasFilters =
    Boolean(searchFromUrl) ||
    Boolean(actionFromUrl) ||
    Boolean(entityTypeFromUrl) ||
    Boolean(createdFromFromUrl) ||
    Boolean(createdToFromUrl)

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h1>{t('auditLogs.title')}</h1>
          <p>{t('auditLogs.subtitle')}</p>
        </div>
      </div>

      <form className="filter-panel" onSubmit={handleApplyFilters}>
        <div className="page-header-row filter-panel-header">
          <h2>{t('auditLogs.filtersTitle')}</h2>
          {hasFilters ? (
            <button type="button" className="secondary-button" onClick={clearFilters}>
              {t('common.clearAll')}
            </button>
          ) : null}
        </div>

        <div className="form-grid">
          <label htmlFor="auditSearch">
            {t('common.search')}
            <input
              id="auditSearch"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('auditLogs.searchPlaceholder')}
            />
          </label>

          <label htmlFor="auditAction">
            {t('auditLogs.action')}
            <select
              id="auditAction"
              value={actionFromUrl}
              onChange={(event) =>
                updateFilters({ action: event.target.value, page: 1 })
              }
            >
              <option value="">{t('common.all')}</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="auditEntityType">
            {t('auditLogs.entityType')}
            <select
              id="auditEntityType"
              value={entityTypeFromUrl}
              onChange={(event) =>
                updateFilters({ entityType: event.target.value, page: 1 })
              }
            >
              <option value="">{t('common.all')}</option>
              {ENTITY_TYPES.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {entityType}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="auditFrom">
            {t('auditLogs.from')}
            <input
              id="auditFrom"
              type="datetime-local"
              value={createdFromInput}
              onChange={(event) => setCreatedFromInput(event.target.value)}
            />
          </label>

          <label htmlFor="auditTo">
            {t('auditLogs.to')}
            <input
              id="auditTo"
              type="datetime-local"
              value={createdToInput}
              onChange={(event) => setCreatedToInput(event.target.value)}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">
            {t('common.applyFilters')}
          </button>
        </div>
      </form>

      {error ? <div className="form-error">{error}</div> : null}
      {isLoading ? <p className="form-hint">{t('auditLogs.loading')}</p> : null}

      {!isLoading && result && result.items.length === 0 ? (
        <p className="form-hint">{t('common.noResults')}</p>
      ) : null}

      {!isLoading && result && result.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('auditLogs.createdAt')}</th>
                  <th>{t('auditLogs.actor')}</th>
                  <th>{t('auditLogs.action')}</th>
                  <th>{t('auditLogs.entity')}</th>
                  <th>{t('auditLogs.summary')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt, dateLocale)}</td>
                    <td>
                      <div>{log.userName || '—'}</div>
                      <div className="muted-text">{log.userEmail || '—'}</div>
                    </td>
                    <td>
                      <code>{log.action}</code>
                    </td>
                    <td>
                      <div>{log.entityType}</div>
                      <div className="muted-text">{log.entityId || '—'}</div>
                    </td>
                    <td>{log.summary}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setExpandedId((current) =>
                            current === log.id ? null : log.id,
                          )
                        }
                      >
                        {expandedId === log.id
                          ? t('auditLogs.hideDetails')
                          : t('auditLogs.showDetails')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expandedId ? (
            <pre className="audit-details">
              {result.items.find((item) => item.id === expandedId)?.details ||
                t('auditLogs.noDetails')}
              {'\n'}
              IP:{' '}
              {result.items.find((item) => item.id === expandedId)?.ipAddress ||
                '—'}
            </pre>
          ) : null}

          <div className="pager">
            <button
              type="button"
              className="secondary-button"
              disabled={page <= 1}
              onClick={() => updateFilters({ page: page - 1 })}
            >
              {t('common.previous')}
            </button>
            <span>
              {t('common.pageOf', {
                page,
                totalPages,
                totalCount: result.totalCount,
              })}
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={page >= totalPages}
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
