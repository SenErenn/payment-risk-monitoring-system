import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import { tokenStorage } from '../auth/tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5067'

export const MONITORING_HUB_PATH = '/hubs/monitoring'

export const MonitoringEvents = {
  TransactionCreated: 'TransactionCreated',
  RiskAlertCreated: 'RiskAlertCreated',
} as const

export type MonitoringEventName =
  (typeof MonitoringEvents)[keyof typeof MonitoringEvents]

export type RealtimeConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'

export function createMonitoringConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}${MONITORING_HUB_PATH}`, {
      accessTokenFactory: () => {
        if (tokenStorage.isTokenExpired()) {
          return ''
        }

        return tokenStorage.getToken() ?? ''
      },
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build()
}

export function mapHubState(
  state: HubConnectionState,
): RealtimeConnectionStatus {
  switch (state) {
    case HubConnectionState.Connected:
      return 'connected'
    case HubConnectionState.Connecting:
      return 'connecting'
    case HubConnectionState.Reconnecting:
      return 'reconnecting'
    default:
      return 'disconnected'
  }
}
