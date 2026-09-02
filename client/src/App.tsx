import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import ProtectedRoute from './app/routes/ProtectedRoute'
import RequireRole from './app/components/RequireRole'
import LoginPage from './features/auth/pages/LoginPage'
import RegisterPage from './features/auth/pages/RegisterPage'
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage'
import VerifyEmailPage from './features/auth/pages/VerifyEmailPage'
import DashboardPage from './features/auth/pages/DashboardPage'
import ForbiddenPage from './features/auth/pages/ForbiddenPage'
import SchoolSettingsPage from './features/school-settings/pages/SchoolSettingsPage'
import AcademicYearsPage from './features/school-settings/pages/AcademicYearsPage'
import SchoolsListPage from './features/school-settings/pages/SchoolsListPage'
import './index.css'

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Protected routes — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* School settings — school_admin / principal */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal']} />}>
              <Route path="/school-settings" element={<SchoolSettingsPage />} />
              <Route path="/school-settings/academic-years" element={<AcademicYearsPage />} />
            </Route>

            {/* Super admin — all schools management */}
            <Route element={<RequireRole roles={['super_admin']} />}>
              <Route path="/admin/schools" element={<SchoolsListPage />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}

export default App
