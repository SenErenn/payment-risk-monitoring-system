export type RiskRuleThresholdUnit =
  | 'Amount'
  | 'Ratio'
  | 'Count'
  | 'Multiplier'

export interface RiskRule {
  id: string
  code: string
  name: string
  description: string
  threshold: number
  thresholdUnit: RiskRuleThresholdUnit
  points: number
  isEnabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface UpdateRiskRulePayload {
  threshold: number
  points: number
  isEnabled: boolean
}
