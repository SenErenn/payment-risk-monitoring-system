export interface DashboardKpis {
  totalTransactions: number
  transactionVolume: number
  currency: string
  approvedCount: number
  declinedCount: number
  highRiskCount: number
  openAlertsCount: number
  approvalRate: number
  averageAmount: number
}

export interface HourlyBucket {
  hourUtc: string
  count: number
}

export interface NamedCount {
  key: string
  count: number
}

export interface TopMerchant {
  merchantId: string
  merchantCode: string
  name: string
  transactionCount: number
  volume: number
}

export interface DashboardSummary {
  fromUtc: string
  toUtc: string
  kpis: DashboardKpis
  hourlyTransactions: HourlyBucket[]
  statusDistribution: NamedCount[]
  riskDistribution: NamedCount[]
  topMerchants: TopMerchant[]
}

export interface DashboardSummaryParams {
  from?: string | null
  to?: string | null
}
