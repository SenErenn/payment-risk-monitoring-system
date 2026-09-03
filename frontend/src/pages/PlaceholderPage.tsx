import { useT } from '../i18n'

interface PlaceholderPageProps {
  titleKey: string
  descriptionKey: string
  comingInKey?: string
}

export function PlaceholderPage({
  titleKey,
  descriptionKey,
  comingInKey,
}: PlaceholderPageProps) {
  const t = useT()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t(titleKey)}</h1>
          <p>{t(descriptionKey)}</p>
        </div>
      </div>

      <div className="notice-card">
        <h2>{t('placeholder.screenTitle')}</h2>
        <p>
          {comingInKey
            ? t('placeholder.bodyWithPr', { comingIn: t(comingInKey) })
            : t('placeholder.bodyDefault')}
        </p>
      </div>
    </div>
  )
}
