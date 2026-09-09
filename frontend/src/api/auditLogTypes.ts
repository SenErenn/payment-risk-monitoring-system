export interface AuditLog {
  id: string
  userId: string | null
  userEmail: string | null
  userName: string | null
  action: string
  entityType: string
  entityId: string | null
  summary: string
  details: string | null
  ipAddress: string | null
  createdAt: string
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface AuditLogListParams {
  page?: number
  pageSize?: number
  search?: string
  action?: string | null
  entityType?: string | null
  createdFrom?: string | null
  createdTo?: string | null
}
