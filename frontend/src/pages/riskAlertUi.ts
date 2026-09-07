import type { AlertStatus } from '../api/riskAlertTypes'

export { formatAmount, formatDateTime, riskLevelClass } from './transactionUi'

export function alertStatusClass(status: AlertStatus): string {
  switch (status) {
    case 'Open':
      return 'status-chip blocked'
    case 'UnderReview':
      return 'status-chip expired'
    case 'Safe':
      return 'status-chip active'
    case 'Suspicious':
      return 'status-chip blocked'
    case 'Closed':
      return 'status-chip passive'
    default:
      return 'status-chip'
  }
}

export function alertDecisionPanelClass(status: AlertStatus): string {
  if (status === 'Open' || status === 'Suspicious') {
    return 'decision-panel declined'
  }

  if (status === 'Safe') {
    return 'decision-panel approved'
  }

  if (status === 'UnderReview') {
    return 'decision-panel refunded'
  }

  return 'decision-panel'
}
