import { apiRequest } from './client'
import type {
  CreateRefundPayload,
  CreateTransactionPayload,
  PagedResult,
  RefundSummary,
  Transaction,
  TransactionListParams,
} from './transactionTypes'

function buildQuery(params: TransactionListParams): string {
  const query = new URLSearchParams()
  query.set('page', String(params.page ?? 1))
  query.set('pageSize', String(params.pageSize ?? 10))

  if (params.search?.trim()) {
    query.set('search', params.search.trim())
  }

  if (params.status) {
    query.set('status', params.status)
  }

  if (params.merchantId) {
    query.set('merchantId', params.merchantId)
  }

  if (params.cardId) {
    query.set('cardId', params.cardId)
  }

  if (params.paymentType) {
    query.set('paymentType', params.paymentType)
  }

  if (params.createdFrom) {
    query.set('createdFrom', params.createdFrom)
  }

  if (params.createdTo) {
    query.set('createdTo', params.createdTo)
  }

  if (params.minAmount !== undefined && params.minAmount !== null) {
    query.set('minAmount', String(params.minAmount))
  }

  if (params.maxAmount !== undefined && params.maxAmount !== null) {
    query.set('maxAmount', String(params.maxAmount))
  }

  if (params.sortBy) {
    query.set('sortBy', params.sortBy)
  }

  if (params.sortDirection) {
    query.set('sortDirection', params.sortDirection)
  }

  return query.toString()
}

export async function listTransactions(
  params: TransactionListParams = {},
): Promise<PagedResult<Transaction>> {
  const query = buildQuery(params)
  return apiRequest<PagedResult<Transaction>>(`/api/transactions?${query}`)
}

export async function getTransaction(id: string): Promise<Transaction> {
  return apiRequest<Transaction>(`/api/transactions/${id}`)
}

export async function createTransaction(
  payload: CreateTransactionPayload,
): Promise<Transaction> {
  return apiRequest<Transaction>('/api/transactions', {
    method: 'POST',
    body: payload,
  })
}

export async function listTransactionRefunds(
  transactionId: string,
): Promise<RefundSummary[]> {
  return apiRequest<RefundSummary[]>(
    `/api/transactions/${transactionId}/refunds`,
  )
}

export async function createRefund(
  transactionId: string,
  payload: CreateRefundPayload,
): Promise<RefundSummary> {
  return apiRequest<RefundSummary>(
    `/api/transactions/${transactionId}/refunds`,
    {
      method: 'POST',
      body: payload,
    },
  )
}
