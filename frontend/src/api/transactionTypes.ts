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

export interface TransactionListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: TransactionStatus | null
  merchantId?: string | null
  cardId?: string | null
}

export interface CreateTransactionPayload {
  merchantId: string
  cardId: string
  amount: number
  currency: CurrencyCode
  paymentType: PaymentType
}
