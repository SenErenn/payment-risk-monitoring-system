interface PlaceholderPageProps {
  title: string
  description: string
  comingIn?: string
}

export function PlaceholderPage({
  title,
  description,
  comingIn,
}: PlaceholderPageProps) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="notice-card">
        <h2>Placeholder screen</h2>
        <p>
          This page is visible for authorized roles. Feature implementation
          {comingIn ? ` arrives in ${comingIn}.` : ' arrives in a later PR.'}
        </p>
      </div>
    </div>
  )
}
