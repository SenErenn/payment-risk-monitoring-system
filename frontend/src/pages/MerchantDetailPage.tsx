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

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

export function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
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
        setError('Merchant id is missing.')
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
              : 'Unable to load merchant.',
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
  }, [id])

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
        setActionError('Unable to update merchant.')
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
        setActionError('Unable to update merchant status.')
      }
    } finally {
      setIsToggling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="notice-card">
          <p>Loading merchant...</p>
        </div>
      </div>
    )
  }

  if (error || !merchant) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Merchant detail</h1>
            <p>{error ?? 'Merchant not found.'}</p>
          </div>
        </div>
        <Link className="text-link" to="/merchants">
          Back to merchants
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
              Merchants
            </Link>
            <span> / {merchant.merchantCode}</span>
          </p>
          <h1>{merchant.name}</h1>
          <p>Merchant profile used in payment simulation.</p>
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
                {isEditing ? 'Cancel edit' : 'Edit'}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={isToggling}
                onClick={() => void handleToggleActive()}
              >
                {isToggling
                  ? 'Updating...'
                  : merchant.isActive
                    ? 'Deactivate'
                    : 'Activate'}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/merchants')}
          >
            Back
          </button>
        </div>
      </div>

      {actionError ? <div className="form-error">{actionError}</div> : null}

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">Code</span>
          <strong>{merchant.merchantCode}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Category</span>
          <strong>{merchant.category}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Status</span>
          <strong>
            <span
              className={
                merchant.isActive ? 'status-chip active' : 'status-chip inactive'
              }
            >
              {merchant.isActive ? 'Active' : 'Inactive'}
            </span>
          </strong>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">Created</span>
          <strong>{formatDate(merchant.createdAt)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Updated</span>
          <strong>{formatDate(merchant.updatedAt)}</strong>
        </div>
      </div>

      {canManage && isEditing ? (
        <form className="panel-form" onSubmit={handleSave}>
          <h2>Edit merchant</h2>
          <div className="form-grid">
            <label htmlFor="editName">
              Name
              <input
                id="editName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label htmlFor="editCategory">
              Category
              <input
                id="editCategory"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      ) : null}

      {!canManage ? (
        <div className="notice-card">
          <p>Viewer access is read-only on this page.</p>
        </div>
      ) : null}
    </div>
  )
}
