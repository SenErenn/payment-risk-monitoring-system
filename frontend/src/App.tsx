import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { PublicOnlyRoute } from './auth/PublicOnlyRoute'
import { RoleRoute } from './auth/RoleRoute'
import { LocaleProvider } from './i18n'
import { AppLayout } from './layouts/AppLayout'
import { RealtimeProvider } from './realtime'
import { AuditLogsPage } from './pages/AuditLogsPage'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { CardDetailPage } from './pages/CardDetailPage'
import { CardsPage } from './pages/CardsPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { MerchantDetailPage } from './pages/MerchantDetailPage'
import { MerchantsPage } from './pages/MerchantsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RiskAlertDetailPage } from './pages/RiskAlertDetailPage'
import { RiskAlertsPage } from './pages/RiskAlertsPage'
import { RiskRulesPage } from './pages/RiskRulesPage'
import { TransactionDetailPage } from './pages/TransactionDetailPage'
import { TransactionsPage } from './pages/TransactionsPage'
import './App.css'

function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <RealtimeProvider>
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
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route
                    path="/transactions/:id"
                    element={<TransactionDetailPage />}
                  />
                </Route>

                <Route element={<RoleRoute roles={['Admin', 'Analyst']} />}>
                  <Route path="/risk-alerts" element={<RiskAlertsPage />} />
                  <Route
                    path="/risk-alerts/:id"
                    element={<RiskAlertDetailPage />}
                  />
                </Route>

                <Route element={<RoleRoute roles={['Admin', 'Viewer']} />}>
                  <Route path="/merchants" element={<MerchantsPage />} />
                  <Route path="/merchants/:id" element={<MerchantDetailPage />} />
                </Route>

                <Route element={<RoleRoute roles={['Admin']} />}>
                  <Route path="/cards" element={<CardsPage />} />
                  <Route path="/cards/:id" element={<CardDetailPage />} />
                  <Route path="/risk-rules" element={<RiskRulesPage />} />
                  <Route
                    path="/users"
                    element={
                      <PlaceholderPage
                        titleKey="placeholder.usersTitle"
                        descriptionKey="placeholder.usersDesc"
                        comingInKey="placeholder.laterPr"
                      />
                    }
                  />
                  <Route
                    path="/audit-logs"
                    element={<AuditLogsPage />}
                  />
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </LocaleProvider>
  )
}

export default App
