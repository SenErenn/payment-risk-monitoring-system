export type TransactionStatus =
  | 'Pending'
  | 'Approved'
  | 'Declined'
  | 'Refunded'
  | 'PartiallyRefunded'

export type PaymentType = 'Chip' | 'Contactless' | 'Online' | 'MagneticStripe'

export type RiskLevel = 'Low' | 'Medium' | 'High'

export type CurrencyCode = 'TRY' | 'USD' | 'EUR'

export interface Transaction {
  id: string
  transactionCode: string
  merchantId: string
  merchantCode: string
  merchantName: string
  cardId: string
  cardToken: string
  maskedCardNumber: string
  amount: number
  currency: string
  status: TransactionStatus
  paymentType: PaymentType
  riskScore: number
  riskLevel: RiskLevel
  createdAt: string
  decisionMessage: string | null
  declineReason: string | null
  idempotencyKey: string | null
  isReplay?: boolean
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

export type TransactionSortBy =
  | 'createdAt'
  | 'amount'
  | 'status'
  | 'riskScore'
  | 'riskLevel'
  | 'transactionCode'
  | 'paymentType'

export type SortDirection = 'asc' | 'desc'

export interface TransactionListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: TransactionStatus | null
  merchantId?: string | null
  cardId?: string | null
  paymentType?: PaymentType | null
  createdFrom?: string | null
  createdTo?: string | null
  minAmount?: number | null
  maxAmount?: number | null
  sortBy?: TransactionSortBy
  sortDirection?: SortDirection
}

export interface CreateTransactionPayload {
  merchantId: string
  cardId: string
  amount: number
  currency: CurrencyCode
  paymentType: PaymentType
  idempotencyKey?: string
}
