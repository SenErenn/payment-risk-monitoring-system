import type { UserRole } from '../auth/types'

export interface NavItem {
  label: string
  path: string
  roles: UserRole[]
}

export const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['Admin', 'Analyst', 'Viewer'],
  },
  {
    label: 'Transactions',
    path: '/transactions',
    roles: ['Admin', 'Analyst', 'Viewer'],
  },
  {
    label: 'Risk Alerts',
    path: '/risk-alerts',
    roles: ['Admin', 'Analyst'],
  },
  {
    label: 'Merchants',
    path: '/merchants',
    roles: ['Admin', 'Viewer'],
  },
  {
    label: 'Cards',
    path: '/cards',
    roles: ['Admin'],
  },
  {
    label: 'Risk Rules',
    path: '/risk-rules',
    roles: ['Admin'],
  },
  {
    label: 'Users',
    path: '/users',
    roles: ['Admin'],
  },
  {
    label: 'Audit Logs',
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
