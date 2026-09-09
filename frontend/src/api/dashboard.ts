import { apiRequest } from './client'
import type { DashboardSummary, DashboardSummaryParams } from './dashboardTypes'

export async function getDashboardSummary(
  params: DashboardSummaryParams = {},
): Promise<DashboardSummary> {
  const query = new URLSearchParams()

  if (params.from) {
    query.set('from', params.from)
  }

  if (params.to) {
    query.set('to', params.to)
  }

  const suffix = query.toString()
  return apiRequest<DashboardSummary>(
    `/api/dashboard/summary${suffix ? `?${suffix}` : ''}`,
  )
}
