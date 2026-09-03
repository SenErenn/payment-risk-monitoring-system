import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { en } from './en'
import { tr } from './tr'
import type { Locale, Messages, TranslationParams } from './types'

const STORAGE_KEY = 'payscope.locale'

const catalogs: Record<Locale, Messages> = { tr, en }

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: TranslationParams) => string
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'tr' || stored === 'en') {
    return stored
  }

  return 'tr'
}

function resolveMessage(messages: Messages, key: string): string | undefined {
  const parts = key.split('.')
  let current: string | Messages | undefined = messages

  for (const part of parts) {
    if (!current || typeof current === 'string') {
      return undefined
    }

    current = current[part]
  }

  return typeof current === 'string' ? current : undefined
}

function formatMessage(template: string, params?: TranslationParams): string {
  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  )
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
    document.title =
      locale === 'tr'
        ? 'PayScope — Ödeme Risk İzleme'
        : 'PayScope — Payment Risk Monitoring'
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
  }, [])

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const fromLocale = resolveMessage(catalogs[locale], key)
      const fallback = resolveMessage(catalogs.en, key)
      return formatMessage(fromLocale ?? fallback ?? key, params)
    },
    [locale],
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider.')
  }

  return context
}

export function useT() {
  return useLocale().t
}
