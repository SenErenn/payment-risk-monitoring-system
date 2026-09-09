import { apiRequest } from './client'
import type { RiskRule, UpdateRiskRulePayload } from './riskRuleTypes'

export async function listRiskRules(): Promise<RiskRule[]> {
  return apiRequest<RiskRule[]>('/api/risk-rules')
}

export async function getRiskRule(id: string): Promise<RiskRule> {
  return apiRequest<RiskRule>(`/api/risk-rules/${id}`)
}

export async function updateRiskRule(
  id: string,
  payload: UpdateRiskRulePayload,
): Promise<RiskRule> {
  return apiRequest<RiskRule>(`/api/risk-rules/${id}`, {
    method: 'PUT',
    body: payload,
  })
}
