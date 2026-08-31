import { apiRequest } from './client'
import type {
  CreateTransactionPayload,
  PagedResult,
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
