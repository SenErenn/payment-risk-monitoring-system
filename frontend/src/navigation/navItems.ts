import type { UserRole } from '../auth/types'

export interface NavItem {
  labelKey: string
  path: string
  roles: UserRole[]
}

export const navigationItems: NavItem[] = [
  {
    labelKey: 'nav.dashboard',
    path: '/dashboard',
    roles: ['Admin', 'Analyst', 'Viewer'],
  },
  {
    labelKey: 'nav.transactions',
    path: '/transactions',
    roles: ['Admin', 'Analyst', 'Viewer'],
  },
  {
    labelKey: 'nav.riskAlerts',
    path: '/risk-alerts',
    roles: ['Admin', 'Analyst'],
  },
  {
    labelKey: 'nav.merchants',
    path: '/merchants',
    roles: ['Admin', 'Viewer'],
  },
  {
    labelKey: 'nav.cards',
    path: '/cards',
    roles: ['Admin'],
  },
  {
    labelKey: 'nav.riskRules',
    path: '/risk-rules',
    roles: ['Admin'],
  },
  {
    labelKey: 'nav.users',
    path: '/users',
    roles: ['Admin'],
  },
  {
    labelKey: 'nav.auditLogs',
    path: '/audit-logs',
    roles: ['Admin'],
  },
]

export function getNavigationForRole(role: UserRole | undefined): NavItem[] {
  if (!role) {
    return []
  }

  return navigationItems.filter((item) => item.roles.includes(role))
}
