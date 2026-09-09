import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { HubConnection } from '@microsoft/signalr'
import { useAuth } from '../auth/AuthContext'
import {
  createMonitoringConnection,
  mapHubState,
  type MonitoringEventName,
  type RealtimeConnectionStatus,
} from './monitoringConnection'

type RealtimeContextValue = {
  status: RealtimeConnectionStatus
  connection: HubConnection | null
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: 'disconnected',
  connection: null,
})

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth()
  const [status, setStatus] = useState<RealtimeConnectionStatus>('disconnected')
  const [connection, setConnection] = useState<HubConnection | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setConnection(null)
      setStatus('disconnected')
      return
    }

    let cancelled = false
    const hub = createMonitoringConnection()

    hub.onreconnecting(() => {
      if (!cancelled) {
        setStatus('reconnecting')
      }
    })
    hub.onreconnected(() => {
      if (!cancelled) {
        setStatus('connected')
      }
    })
    hub.onclose(() => {
      if (!cancelled) {
        setStatus('disconnected')
      }
    })

    setConnection(hub)
    setStatus('connecting')

    void hub
      .start()
      .then(() => {
        if (!cancelled) {
          setStatus(mapHubState(hub.state))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('disconnected')
        }
      })

    return () => {
      cancelled = true
      setConnection(null)
      setStatus('disconnected')
      void hub.stop()
    }
  }, [isAuthenticated, token])

  const value = useMemo(
    () => ({
      status,
      connection,
    }),
    [status, connection],
  )

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  )
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

export function useRealtimeEvent<T>(
  eventName: MonitoringEventName,
  handler: (payload: T) => void,
) {
  const { connection } = useRealtime()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!connection) {
      return
    }

    const wrapped = (payload: T) => {
      handlerRef.current(payload)
    }

    connection.on(eventName, wrapped)
    return () => {
      connection.off(eventName, wrapped)
    }
  }, [connection, eventName])
}
