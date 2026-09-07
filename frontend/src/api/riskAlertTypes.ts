import type {
  RiskLevel,
  RiskReason,
  TransactionStatus,
} from './transactionTypes'

export type { RiskLevel, RiskReason, TransactionStatus }

export type AlertStatus =
  | 'Open'
  | 'UnderReview'
  | 'Safe'
  | 'Suspicious'
  | 'Closed'

export interface RiskAlert {
  id: string
  alertCode: string
  transactionId: string
  transactionCode: string
  merchantId: string
  merchantCode: string
  merchantName: string
  cardId: string
  maskedCardNumber: string
  amount: number
  currency: string
  transactionStatus: TransactionStatus
  riskLevel: RiskLevel
  riskScore: number
  riskReasons: RiskReason[]
  status: AlertStatus
  createdAt: string
  updatedAt: string
}

export type RiskAlertSortBy =
  | 'createdAt'
  | 'riskScore'
  | 'riskLevel'
  | 'status'
  | 'alertCode'

export type SortDirection = 'asc' | 'desc'

export interface RiskAlertListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: AlertStatus | null
  riskLevel?: RiskLevel | null
  merchantId?: string | null
  cardId?: string | null
  transactionId?: string | null
  createdFrom?: string | null
  createdTo?: string | null
  sortBy?: RiskAlertSortBy
  sortDirection?: SortDirection
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}
