import type { CardStatus } from '../api/cardTypes'

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString()
}

export function cardStatusClass(status: CardStatus): string {
  switch (status) {
    case 'Active':
      return 'status-chip active'
    case 'Blocked':
      return 'status-chip blocked'
    case 'Passive':
      return 'status-chip passive'
    case 'Expired':
      return 'status-chip expired'
    default:
      return 'status-chip'
  }
}
