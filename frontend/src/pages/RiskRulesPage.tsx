import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { listRiskRules, updateRiskRule } from '../api/riskRules'
import type { RiskRule, RiskRuleThresholdUnit } from '../api/riskRuleTypes'
import { useLocale, useT } from '../i18n'
import {
  localizeRiskRuleDescription,
  localizeRiskRuleName,
} from '../i18n/displayLabels'
import { formatDateTime } from './transactionUi'

interface RuleDraft {
  threshold: string
  points: string
  isEnabled: boolean
}

function toDraft(rule: RiskRule): RuleDraft {
  return {
    threshold: String(rule.threshold),
    points: String(rule.points),
    isEnabled: rule.isEnabled,
  }
}

function formatThresholdHint(
  unit: RiskRuleThresholdUnit,
  t: (key: string) => string,
): string {
  switch (unit) {
    case 'Amount':
      return t('riskRules.unitAmountHint')
    case 'Ratio':
      return t('riskRules.unitRatioHint')
    case 'Count':
      return t('riskRules.unitCountHint')
    case 'Multiplier':
      return t('riskRules.unitMultiplierHint')
    default:
      return ''
  }
}

export function RiskRulesPage() {
  const t = useT()
  const { locale } = useLocale()
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'

  const [rules, setRules] = useState<RiskRule[]>([])
  const [drafts, setDrafts] = useState<Record<string, RuleDraft>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await listRiskRules()
        if (!cancelled) {
          setRules(data)
          const nextDrafts: Record<string, RuleDraft> = {}
          for (const rule of data) {
            nextDrafts[rule.id] = toDraft(rule)
          }
          setDrafts(nextDrafts)
        }
      } catch (err) {
        if (!cancelled) {
          setRules([])
          setError(
            err instanceof ApiError ? err.message : t('riskRules.loadFailed'),
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
  }, [t])

  function startEdit(rule: RiskRule) {
    setEditingId(rule.id)
    setDrafts((prev) => ({ ...prev, [rule.id]: toDraft(rule) }))
    setError(null)
    setSuccess(null)
  }

  function cancelEdit(rule: RiskRule) {
    setEditingId(null)
    setDrafts((prev) => ({ ...prev, [rule.id]: toDraft(rule) }))
    setError(null)
  }

  function updateDraft(
    ruleId: string,
    patch: Partial<RuleDraft>,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], ...patch },
    }))
    setError(null)
    setSuccess(null)
  }

  async function handleSave(event: FormEvent, rule: RiskRule) {
    event.preventDefault()
    const draft = drafts[rule.id]
    if (!draft) {
      return
    }

    const threshold = Number(draft.threshold)
    const points = Number(draft.points)

    if (!Number.isFinite(threshold) || threshold <= 0) {
      setError(t('riskRules.invalidThreshold'))
      return
    }

    if (
      rule.thresholdUnit === 'Ratio' &&
      (threshold <= 0 || threshold > 1)
    ) {
      setError(t('riskRules.invalidRatio'))
      return
    }

    if (
      (rule.thresholdUnit === 'Count' ||
        rule.thresholdUnit === 'Multiplier') &&
      threshold < 1
    ) {
      setError(t('riskRules.invalidCountOrMultiplier'))
      return
    }

    if (!Number.isInteger(points) || points < 0 || points > 100) {
      setError(t('riskRules.invalidPoints'))
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateRiskRule(rule.id, {
        threshold,
        points,
        isEnabled: draft.isEnabled,
      })
      setRules((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      )
      setDrafts((prev) => ({ ...prev, [updated.id]: toDraft(updated) }))
      setEditingId(null)
      setSuccess(t('riskRules.saveSuccess'))
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('riskRules.saveFailed'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h1>{t('riskRules.title')}</h1>
          <p>{t('riskRules.subtitle')}</p>
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}
      {success ? <div className="form-success">{success}</div> : null}

      {isLoading ? (
        <div className="notice-card">
          <p>{t('riskRules.loading')}</p>
        </div>
      ) : null}

      {!isLoading && rules.length === 0 ? (
        <div className="notice-card">
          <h2>{t('riskRules.emptyTitle')}</h2>
          <p>{t('riskRules.emptyHint')}</p>
        </div>
      ) : null}

      {!isLoading && rules.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('riskRules.colCode')}</th>
                <th>{t('riskRules.colName')}</th>
                <th>{t('riskRules.colThreshold')}</th>
                <th>{t('riskRules.colPoints')}</th>
                <th>{t('riskRules.colEnabled')}</th>
                <th>{t('common.updated')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const isEditing = editingId === rule.id
                const draft = drafts[rule.id] ?? toDraft(rule)

                return (
                  <tr key={rule.id}>
                    <td>
                      <span className="mono-text">{rule.code}</span>
                    </td>
                    <td>
                      <div>
                        {localizeRiskRuleName(t, rule.code, rule.name)}
                      </div>
                      <span className="muted-text">
                        {localizeRiskRuleDescription(
                          t,
                          rule.code,
                          rule.description,
                        )}
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <label className="inline-field">
                          <input
                            type="number"
                            step={
                              rule.thresholdUnit === 'Ratio' ? '0.01' : '1'
                            }
                            min={rule.thresholdUnit === 'Ratio' ? '0.01' : '1'}
                            max={
                              rule.thresholdUnit === 'Ratio' ? '1' : undefined
                            }
                            value={draft.threshold}
                            onChange={(event) =>
                              updateDraft(rule.id, {
                                threshold: event.target.value,
                              })
                            }
                            disabled={isSaving}
                          />
                          <span className="muted-text">
                            {t(`status.${rule.thresholdUnit}`)} ·{' '}
                            {formatThresholdHint(rule.thresholdUnit, t)}
                          </span>
                        </label>
                      ) : (
                        <>
                          <strong>{rule.threshold}</strong>
                          <div className="muted-text">
                            {t(`status.${rule.thresholdUnit}`)}
                          </div>
                        </>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={draft.points}
                          onChange={(event) =>
                            updateDraft(rule.id, {
                              points: event.target.value,
                            })
                          }
                          disabled={isSaving}
                        />
                      ) : (
                        rule.points
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={draft.isEnabled}
                            onChange={(event) =>
                              updateDraft(rule.id, {
                                isEnabled: event.target.checked,
                              })
                            }
                            disabled={isSaving}
                          />
                          <span>
                            {draft.isEnabled
                              ? t('riskRules.enabled')
                              : t('riskRules.disabled')}
                          </span>
                        </label>
                      ) : (
                        <span
                          className={
                            rule.isEnabled
                              ? 'status-chip active'
                              : 'status-chip passive'
                          }
                        >
                          {rule.isEnabled
                            ? t('riskRules.enabled')
                            : t('riskRules.disabled')}
                        </span>
                      )}
                    </td>
                    <td>{formatDateTime(rule.updatedAt, dateLocale)}</td>
                    <td>
                      {isEditing ? (
                        <form
                          className="action-row"
                          onSubmit={(event) => void handleSave(event, rule)}
                        >
                          <button
                            type="submit"
                            className="primary-button"
                            disabled={isSaving}
                          >
                            {isSaving
                              ? t('riskRules.saving')
                              : t('common.save')}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={isSaving}
                            onClick={() => cancelEdit(rule)}
                          >
                            {t('common.cancel')}
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => startEdit(rule)}
                        >
                          {t('common.edit')}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
