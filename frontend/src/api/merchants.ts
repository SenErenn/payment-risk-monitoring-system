import { apiRequest } from './client'
import type {
  AnalyticsRangeParams,
  CreateMerchantPayload,
  Merchant,
  MerchantAnalytics,
  MerchantListParams,
  PagedResult,
  UpdateMerchantPayload,
} from './merchantTypes'

function buildQuery(params: MerchantListParams): string {
  const query = new URLSearchParams()
  query.set('page', String(params.page ?? 1))
  query.set('pageSize', String(params.pageSize ?? 10))

  if (params.search?.trim()) {
    query.set('search', params.search.trim())
  }

  if (params.isActive === true || params.isActive === false) {
    query.set('isActive', String(params.isActive))
  }

  return query.toString()
}

export async function listMerchants(
  params: MerchantListParams = {},
): Promise<PagedResult<Merchant>> {
  const query = buildQuery(params)
  return apiRequest<PagedResult<Merchant>>(`/api/merchants?${query}`)
}

export async function getMerchant(id: string): Promise<Merchant> {
  return apiRequest<Merchant>(`/api/merchants/${id}`)
}

export async function getMerchantAnalytics(
  id: string,
  params: AnalyticsRangeParams = {},
): Promise<MerchantAnalytics> {
  const query = new URLSearchParams()
  if (params.from) {
    query.set('from', params.from)
  }
  if (params.to) {
    query.set('to', params.to)
  }
  const suffix = query.toString()
  return apiRequest<MerchantAnalytics>(
    `/api/merchants/${id}/analytics${suffix ? `?${suffix}` : ''}`,
  )
}

export async function createMerchant(
  payload: CreateMerchantPayload,
): Promise<Merchant> {
  return apiRequest<Merchant>('/api/merchants', {
    method: 'POST',
    body: payload,
  })
}

export async function updateMerchant(
  id: string,
  payload: UpdateMerchantPayload,
): Promise<Merchant> {
  return apiRequest<Merchant>(`/api/merchants/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function activateMerchant(id: string): Promise<Merchant> {
  return apiRequest<Merchant>(`/api/merchants/${id}/activate`, {
    method: 'POST',
  })
}

export async function deactivateMerchant(id: string): Promise<Merchant> {
  return apiRequest<Merchant>(`/api/merchants/${id}/deactivate`, {
    method: 'POST',
  })
}
