import { apiRequest } from './client'
import type {
  PagedResult,
  RiskAlert,
  RiskAlertListParams,
} from './riskAlertTypes'

function buildQuery(params: RiskAlertListParams): string {
  const query = new URLSearchParams()
  query.set('page', String(params.page ?? 1))
  query.set('pageSize', String(params.pageSize ?? 10))

  if (params.search?.trim()) {
    query.set('search', params.search.trim())
  }

  if (params.status) {
    query.set('status', params.status)
  }

  if (params.riskLevel) {
    query.set('riskLevel', params.riskLevel)
  }

  if (params.merchantId) {
    query.set('merchantId', params.merchantId)
  }

  if (params.cardId) {
    query.set('cardId', params.cardId)
  }

  if (params.transactionId) {
    query.set('transactionId', params.transactionId)
  }

  if (params.createdFrom) {
    query.set('createdFrom', params.createdFrom)
  }

  if (params.createdTo) {
    query.set('createdTo', params.createdTo)
  }

  if (params.sortBy) {
    query.set('sortBy', params.sortBy)
  }

  if (params.sortDirection) {
    query.set('sortDirection', params.sortDirection)
  }

  return query.toString()
}

export async function listRiskAlerts(
  params: RiskAlertListParams = {},
): Promise<PagedResult<RiskAlert>> {
  const query = buildQuery(params)
  return apiRequest<PagedResult<RiskAlert>>(`/api/risk-alerts?${query}`)
}

export async function listOpenRiskAlerts(
  params: RiskAlertListParams = {},
): Promise<PagedResult<RiskAlert>> {
  const query = buildQuery(params)
  return apiRequest<PagedResult<RiskAlert>>(`/api/risk-alerts/open?${query}`)
}

export async function getRiskAlert(id: string): Promise<RiskAlert> {
  return apiRequest<RiskAlert>(`/api/risk-alerts/${id}`)
}
