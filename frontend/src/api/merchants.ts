import { apiRequest } from './client'
import type {
  CreateMerchantPayload,
  Merchant,
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
