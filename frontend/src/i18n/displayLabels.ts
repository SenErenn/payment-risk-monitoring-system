import type { TranslationParams } from './types'

type Translate = (key: string, params?: TranslationParams) => string

function translateOrFallback(
  t: Translate,
  key: string,
  fallback: string,
  params?: TranslationParams,
): string {
  const translated = t(key, params)
  return translated === key ? fallback : translated
}

/** Risk / decline reason codes → localized user-facing text (codes stay technical). */
export function localizeRiskReasonMessage(
  t: Translate,
  code: string,
  fallbackMessage: string,
): string {
  return translateOrFallback(t, `codes.riskReasons.${code}`, fallbackMessage)
}

export function localizeDeclineOrDecision(
  t: Translate,
  options: {
    status?: string
    riskCodes?: string[]
    riskScore?: number
    riskLevel?: string
    declineReason?: string | null
    decisionMessage?: string | null
  },
): string {
  const primaryCode = options.riskCodes?.[0]

  if (options.status === 'Declined' && primaryCode) {
    const declineKey = `codes.declineMessages.${primaryCode}`
    const fromDecline = t(declineKey)
    if (fromDecline !== declineKey) {
      return fromDecline
    }
  }

  if (options.status === 'Approved') {
    const elevated =
      options.riskCodes?.filter((code) => code !== 'BASELINE') ?? []
    if (elevated.length === 0) {
      return translateOrFallback(
        t,
        'codes.decisionMessages.APPROVED',
        options.decisionMessage ?? 'Approved.',
      )
    }

    if (
      typeof options.riskScore === 'number' &&
      options.riskLevel
    ) {
      const levelLabel = translateOrFallback(
        t,
        `status.${options.riskLevel}`,
        options.riskLevel,
      )
      return t('codes.decisionMessages.APPROVED_WITH_RISK', {
        score: options.riskScore,
        level: levelLabel,
      })
    }
  }

  if (primaryCode) {
    const fromReason = localizeRiskReasonMessage(
      t,
      primaryCode,
      options.declineReason ?? options.decisionMessage ?? '',
    )
    if (fromReason) {
      return fromReason
    }
  }

  return (
    options.declineReason ??
    options.decisionMessage ??
    t('transactions.noDecision')
  )
}

export function localizeRiskRuleName(
  t: Translate,
  code: string,
  fallbackName: string,
): string {
  return translateOrFallback(t, `codes.riskRules.${code}.name`, fallbackName)
}

export function localizeRiskRuleDescription(
  t: Translate,
  code: string,
  fallbackDescription: string,
): string {
  return translateOrFallback(
    t,
    `codes.riskRules.${code}.description`,
    fallbackDescription,
  )
}

export function localizeMerchantCategory(
  t: Translate,
  category: string | null | undefined,
): string {
  if (!category) {
    return '—'
  }

  return translateOrFallback(t, `codes.merchantCategories.${category}`, category)
}

export function localizeAuditAction(t: Translate, action: string): string {
  return translateOrFallback(t, `codes.auditActions.${action}`, action)
}

export function localizeAuditEntityType(
  t: Translate,
  entityType: string,
): string {
  return translateOrFallback(t, `codes.auditEntities.${entityType}`, entityType)
}

/**
 * Localize stored English audit summaries by known action patterns.
 * Falls back to the raw summary when the pattern is unknown.
 */
export function localizeAuditSummary(
  t: Translate,
  action: string,
  summary: string,
): string {
  switch (action) {
    case 'UserLogin': {
      const match = /^User (.+) signed in\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.UserLogin', { email: match[1] })
      }
      break
    }
    case 'TransactionsExported': {
      const match = /^Exported (\d+) transaction\(s\) as (\w+)\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.TransactionsExported', {
          count: match[1],
          format: match[2].toUpperCase(),
        })
      }
      break
    }
    case 'MerchantCreated': {
      const match = /^Merchant (.+) created\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.MerchantCreated', { code: match[1] })
      }
      break
    }
    case 'MerchantUpdated': {
      const match = /^Merchant (.+) updated\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.MerchantUpdated', { code: match[1] })
      }
      break
    }
    case 'MerchantActivated': {
      const match = /^Merchant (.+) activated\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.MerchantActivated', { code: match[1] })
      }
      break
    }
    case 'MerchantDeactivated': {
      const match = /^Merchant (.+) deactivated\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.MerchantDeactivated', { code: match[1] })
      }
      break
    }
    case 'CardCreated': {
      const match = /^Card (.+) created\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.CardCreated', { card: match[1] })
      }
      break
    }
    case 'CardUpdated': {
      const match = /^Card (.+) limits updated\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.CardUpdated', { card: match[1] })
      }
      break
    }
    case 'CardStatusChanged': {
      const statusSet = /^Card (.+) status set to (.+)\.$/.exec(summary)
      if (statusSet) {
        const statusLabel = translateOrFallback(
          t,
          `status.${statusSet[2]}`,
          statusSet[2],
        )
        return t('codes.auditSummaries.CardStatusSet', {
          card: statusSet[1],
          status: statusLabel,
        })
      }

      const match = /^Card (.+) (blocked|activated|deactivated)\.$/.exec(summary)
      if (match) {
        const verbKey = `codes.auditSummaries.cardStatus.${match[2]}`
        return t(verbKey, { card: match[1] })
      }
      break
    }
    case 'TransactionCreated': {
      const match = /^Transaction (.+) created \((.+)\)\.$/.exec(summary)
      if (match) {
        const statusLabel = translateOrFallback(
          t,
          `status.${match[2]}`,
          match[2],
        )
        return t('codes.auditSummaries.TransactionCreated', {
          code: match[1],
          status: statusLabel,
        })
      }
      break
    }
    case 'RefundCreated': {
      const match =
        /^Refund (.+) created for transaction (.+)\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.RefundCreated', {
          refund: match[1],
          transaction: match[2],
        })
      }
      break
    }
    case 'RiskRuleUpdated': {
      const match = /^Risk rule (.+) updated\.$/.exec(summary)
      if (match) {
        return t('codes.auditSummaries.RiskRuleUpdated', { code: match[1] })
      }
      break
    }
    case 'RiskAlertReviewed': {
      const match = /^Risk alert (.+) reviewed → (.+)\.$/.exec(summary)
      if (match) {
        const statusLabel = translateOrFallback(
          t,
          `status.${match[2]}`,
          match[2],
        )
        return t('codes.auditSummaries.RiskAlertReviewed', {
          code: match[1],
          status: statusLabel,
        })
      }
      break
    }
    default:
      break
  }

  return summary
}
