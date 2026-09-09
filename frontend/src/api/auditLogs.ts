import { apiRequest } from './client'
import type { AuditLog, AuditLogListParams, PagedResult } from './auditLogTypes'

function buildQuery(params: AuditLogListParams): string {
  const query = new URLSearchParams()
  query.set('page', String(params.page ?? 1))
  query.set('pageSize', String(params.pageSize ?? 20))

  if (params.search?.trim()) {
    query.set('search', params.search.trim())
  }

  if (params.action) {
    query.set('action', params.action)
  }

  if (params.entityType) {
    query.set('entityType', params.entityType)
  }

  if (params.createdFrom) {
    query.set('createdFrom', params.createdFrom)
  }

  if (params.createdTo) {
    query.set('createdTo', params.createdTo)
  }

  return query.toString()
}

export async function listAuditLogs(
  params: AuditLogListParams = {},
): Promise<PagedResult<AuditLog>> {
  const query = buildQuery(params)
  return apiRequest<PagedResult<AuditLog>>(`/api/audit-logs?${query}`)
}

export async function listAuditActions(): Promise<string[]> {
  return apiRequest<string[]>('/api/audit-logs/actions')
}
