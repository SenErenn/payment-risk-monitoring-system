import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">PayScope</span>
        <span className="badge">Foundation</span>
      </header>

      <main className="app-main">
        <h1>Payment Risk Monitoring System</h1>
        <p className="subtitle">
          Internal platform for card payment simulation, transaction monitoring,
          and risk analysis.
        </p>

        <div className="status-card">
          <p className="status-label">Frontend Status</p>
          <p className="status-value">Running</p>
        </div>
      </main>

      <footer className="app-footer">
        <p>PR-001 — Project Foundation</p>
      </footer>
    </div>
  )
}

export default App
