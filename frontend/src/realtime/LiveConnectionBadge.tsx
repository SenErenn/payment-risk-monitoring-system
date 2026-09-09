import { useT } from '../i18n'
import { useRealtime } from './RealtimeProvider'

export function LiveConnectionBadge() {
  const t = useT()
  const { status } = useRealtime()

  const label =
    status === 'connected'
      ? t('realtime.connected')
      : status === 'reconnecting'
        ? t('realtime.reconnecting')
        : status === 'connecting'
          ? t('realtime.connecting')
          : t('realtime.disconnected')

  return (
    <span
      className={`live-badge live-badge-${status}`}
      title={t('realtime.hint')}
      aria-live="polite"
    >
      <span className="live-badge-dot" aria-hidden="true" />
      {label}
    </span>
  )
}
