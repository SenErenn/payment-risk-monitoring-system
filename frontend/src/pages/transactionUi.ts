import type {
  RiskLevel,
  TransactionStatus,
} from '../api/transactionTypes'

export function formatDateTime(value: string, locale = 'tr-TR'): string {
  return new Date(value).toLocaleString(locale)
}

export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function transactionStatusClass(status: TransactionStatus): string {
  switch (status) {
    case 'Approved':
      return 'status-chip active'
    case 'Declined':
      return 'status-chip blocked'
    case 'Pending':
      return 'status-chip passive'
    case 'Refunded':
    case 'PartiallyRefunded':
      return 'status-chip expired'
    default:
      return 'status-chip'
  }
}

export function riskLevelClass(level: RiskLevel): string {
  switch (level) {
    case 'Low':
      return 'status-chip active'
    case 'Medium':
      return 'status-chip expired'
    case 'High':
      return 'status-chip blocked'
    default:
      return 'status-chip'
  }
}

export function decisionPanelClass(status: TransactionStatus): string {
  if (status === 'Approved') {
    return 'decision-panel approved'
  }

  if (status === 'Declined') {
    return 'decision-panel declined'
  }

  if (status === 'Refunded' || status === 'PartiallyRefunded') {
    return 'decision-panel refunded'
  }

  return 'decision-panel'
}

export function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.round(value * 100) / 100 === value
}
