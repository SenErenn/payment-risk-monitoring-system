import type { CardStatus } from '../api/cardTypes'
import { formatAmount } from './transactionUi'

/** Demo card limits use TRY (same as payments). */
export const CARD_DISPLAY_CURRENCY = 'TRY'

export function formatMoney(
  value: number,
  currency: string = CARD_DISPLAY_CURRENCY,
): string {
  return formatAmount(value, currency)
}

export function formatDateTime(value: string, locale = 'tr-TR'): string {
  return new Date(value).toLocaleString(locale)
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
