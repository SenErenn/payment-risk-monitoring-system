import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  activateMerchant,
  deactivateMerchant,
  getMerchant,
  updateMerchant,
} from '../api/merchants'
import type { Merchant } from '../api/merchantTypes'
import { useAuth } from '../auth/AuthContext'
import { useLocale, useT } from '../i18n'

export function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const canManage = hasRole('Admin')

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setError(t('merchants.missingId'))
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getMerchant(id)
        if (!cancelled) {
          setMerchant(data)
          setName(data.name)
          setCategory(data.category)
        }
      } catch (err) {
        if (!cancelled) {
          setMerchant(null)
          setError(
            err instanceof ApiError
              ? err.message
              : t('merchants.loadDetailFailed'),
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!merchant) {
      return
    }

    setActionError(null)
    setIsSaving(true)

    try {
      const updated = await updateMerchant(merchant.id, {
        name: name.trim(),
        category: category.trim(),
      })
      setMerchant(updated)
      setIsEditing(false)
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.errors.length > 0 ? ` ${err.errors.join(' ')}` : ''
        setActionError(`${err.message}${details}`)
      } else {
        setActionError(t('merchants.updateFailed'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleActive() {
    if (!merchant) {
      return
    }

    setActionError(null)
    setIsToggling(true)

    try {
      const updated = merchant.isActive
        ? await deactivateMerchant(merchant.id)
        : await activateMerchant(merchant.id)
      setMerchant(updated)
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message)
      } else {
        setActionError(t('merchants.statusUpdateFailed'))
      }
    } finally {
      setIsToggling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="notice-card">
          <p>{t('merchants.loadingDetail')}</p>
        </div>
      </div>
    )
  }

  if (error || !merchant) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{t('merchants.detailTitle')}</h1>
            <p>{error ?? t('merchants.notFound')}</p>
          </div>
        </div>
        <Link className="text-link" to="/merchants">
          {t('merchants.detailBack')}
        </Link>
      </div>
    )
  }

  return (
    <div className="page page-wide">
      <div className="page-header page-header-row">
        <div>
          <p className="breadcrumb">
            <Link className="text-link" to="/merchants">
              {t('merchants.title')}
            </Link>
            <span> / {merchant.merchantCode}</span>
          </p>
          <h1>{merchant.name}</h1>
          <p>{t('merchants.detailSubtitle')}</p>
        </div>
        <div className="action-row">
          {canManage ? (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setIsEditing((open) => !open)
                  setActionError(null)
                  setName(merchant.name)
                  setCategory(merchant.category)
                }}
              >
                {isEditing ? t('merchants.cancelEdit') : t('merchants.edit')}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={isToggling}
                onClick={() => void handleToggleActive()}
              >
                {isToggling
                  ? t('merchants.updating')
                  : merchant.isActive
                    ? t('merchants.deactivate')
                    : t('merchants.activate')}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/merchants')}
          >
            {t('common.back')}
          </button>
        </div>
      </div>

      {actionError ? <div className="form-error">{actionError}</div> : null}

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('merchants.colCode')}</span>
          <strong>{merchant.merchantCode}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('merchants.category')}</span>
          <strong>{merchant.category}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.status')}</span>
          <strong>
            <span
              className={
                merchant.isActive ? 'status-chip active' : 'status-chip inactive'
              }
            >
              {merchant.isActive ? t('common.active') : t('common.inactive')}
            </span>
          </strong>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">{t('common.created')}</span>
          <strong>
            {new Date(merchant.createdAt).toLocaleString(dateLocale)}
          </strong>
        </div>
        <div className="info-card">
          <span className="info-label">{t('common.updated')}</span>
          <strong>
            {new Date(merchant.updatedAt).toLocaleString(dateLocale)}
          </strong>
        </div>
      </div>

      {canManage && isEditing ? (
        <form className="panel-form" onSubmit={handleSave}>
          <h2>{t('merchants.editTitle')}</h2>
          <div className="form-grid">
            <label htmlFor="editName">
              {t('merchants.name')}
              <input
                id="editName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label htmlFor="editCategory">
              {t('merchants.category')}
              <input
                id="editCategory"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? t('merchants.saving') : t('merchants.saveChanges')}
          </button>
        </form>
      ) : null}

      {!canManage ? (
        <div className="notice-card">
          <p>{t('merchants.viewerReadOnlyDetail')}</p>
        </div>
      ) : null}
    </div>
  )
}
