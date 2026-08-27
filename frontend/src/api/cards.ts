import { apiRequest } from './client'
import type {
  Card,
  CardListParams,
  CreateCardPayload,
  PagedResult,
  UpdateCardPayload,
  UpdateCardStatusPayload,
} from './cardTypes'

function buildQuery(params: CardListParams): string {
  const query = new URLSearchParams()
  query.set('page', String(params.page ?? 1))
  query.set('pageSize', String(params.pageSize ?? 10))

  if (params.search?.trim()) {
    query.set('search', params.search.trim())
  }

  if (params.status) {
    query.set('status', params.status)
  }

  if (params.cardType) {
    query.set('cardType', params.cardType)
  }

  return query.toString()
}

export async function listCards(
  params: CardListParams = {},
): Promise<PagedResult<Card>> {
  const query = buildQuery(params)
  return apiRequest<PagedResult<Card>>(`/api/cards?${query}`)
}

export async function getCard(id: string): Promise<Card> {
  return apiRequest<Card>(`/api/cards/${id}`)
}

export async function createCard(payload: CreateCardPayload): Promise<Card> {
  return apiRequest<Card>('/api/cards', {
    method: 'POST',
    body: payload,
  })
}

export async function updateCard(
  id: string,
  payload: UpdateCardPayload,
): Promise<Card> {
  return apiRequest<Card>(`/api/cards/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function updateCardStatus(
  id: string,
  payload: UpdateCardStatusPayload,
): Promise<Card> {
  return apiRequest<Card>(`/api/cards/${id}/status`, {
    method: 'POST',
    body: payload,
  })
}

export async function activateCard(id: string): Promise<Card> {
  return apiRequest<Card>(`/api/cards/${id}/activate`, {
    method: 'POST',
  })
}

export async function blockCard(id: string): Promise<Card> {
  return apiRequest<Card>(`/api/cards/${id}/block`, {
    method: 'POST',
  })
}

export async function deactivateCard(id: string): Promise<Card> {
  return apiRequest<Card>(`/api/cards/${id}/deactivate`, {
    method: 'POST',
  })
}
