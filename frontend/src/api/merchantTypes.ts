export interface Merchant {
  id: string
  merchantCode: string
  name: string
  category: string
  isActive: boolean
  createdAt: string
  updatedAt: string
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

export interface MerchantListParams {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean | null
}

export interface CreateMerchantPayload {
  merchantCode: string
  name: string
  category: string
  isActive: boolean
}

export interface UpdateMerchantPayload {
  name: string
  category: string
}

export interface AnalyticsRangeParams {
  from?: string | null
  to?: string | null
}

export interface MerchantAnalytics {
  merchantId: string
  fromUtc: string
  toUtc: string
  volume: number
  currency: string
  transactionCount: number
  approvedCount: number
  declinedCount: number
  approvalRate: number
  highRiskCount: number
  riskAlertCount: number
}
