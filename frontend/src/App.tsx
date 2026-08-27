import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { PublicOnlyRoute } from './auth/PublicOnlyRoute'
import { RoleRoute } from './auth/RoleRoute'
import { AppLayout } from './layouts/AppLayout'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { MerchantDetailPage } from './pages/MerchantDetailPage'
import { MerchantsPage } from './pages/MerchantsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/access-denied" element={<AccessDeniedPage />} />

              <Route element={<RoleRoute roles={['Admin', 'Analyst', 'Viewer']} />}>
                <Route
                  path="/transactions"
                  element={
                    <PlaceholderPage
                      title="Transactions"
                      description="Review simulated payment transactions and statuses."
                      comingIn="PR-011"
                    />
                  }
                />
              </Route>

              <Route element={<RoleRoute roles={['Admin', 'Analyst']} />}>
                <Route
                  path="/risk-alerts"
                  element={
                    <PlaceholderPage
                      title="Risk Alerts"
                      description="Investigate flagged transactions and risk signals."
                      comingIn="PR-014"
                    />
                  }
                />
              </Route>

              <Route element={<RoleRoute roles={['Admin', 'Viewer']} />}>
                <Route path="/merchants" element={<MerchantsPage />} />
                <Route path="/merchants/:id" element={<MerchantDetailPage />} />
              </Route>

              <Route element={<RoleRoute roles={['Admin']} />}>
                <Route
                  path="/cards"
                  element={
                    <PlaceholderPage
                      title="Cards"
                      description="Manage tokenized card records for simulation."
                      comingIn="PR-012"
                    />
                  }
                />
                <Route
                  path="/risk-rules"
                  element={
                    <PlaceholderPage
                      title="Risk Rules"
                      description="Configure rule thresholds for risk scoring."
                      comingIn="PR-013"
                    />
                  }
                />
                <Route
                  path="/users"
                  element={
                    <PlaceholderPage
                      title="Users"
                      description="Administer console users and roles."
                      comingIn="a later PR"
                    />
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    <PlaceholderPage
                      title="Audit Logs"
                      description="Track sensitive actions across the console."
                      comingIn="a later PR"
                    />
                  }
                />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
