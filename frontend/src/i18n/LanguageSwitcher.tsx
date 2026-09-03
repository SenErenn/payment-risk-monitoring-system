import { useLocale } from './LocaleContext'
import type { Locale } from './types'

const options: { value: Locale; labelKey: string }[] = [
  { value: 'tr', labelKey: 'common.turkish' },
  { value: 'en', labelKey: 'common.english' },
]

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale()

  return (
    <label className={compact ? 'language-switcher compact' : 'language-switcher'}>
      {!compact ? <span>{t('common.language')}</span> : null}
      <select
        aria-label={t('common.language')}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  )
}
