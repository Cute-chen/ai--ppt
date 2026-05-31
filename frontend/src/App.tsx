import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { ApiHttpError, getAccessToken, setUnauthorizedHandler } from './lib/http'
import FeaturesPage from './pages/FeaturesPage'
import JobsPage from './pages/JobsPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ModelSettingsPage from './pages/ModelSettingsPage'
import PricingPage from './pages/PricingPage'
import ProjectsPage from './pages/ProjectsPage'
import RegisterPage from './pages/RegisterPage'
import TemplatesPage from './pages/TemplatesPage'
import WorkspacePage from './pages/WorkspacePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import { useAuthActions, useRequireAuth } from './store/AppStore'

function ProtectedRoute() {
  const isLoggedIn = useRequireAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <AppLayout />
}

function ProtectedStandaloneRoute() {
  const isLoggedIn = useRequireAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

function AuthLifecycle() {
  const navigate = useNavigate()
  const isLoggedIn = useRequireAuth()
  const { logout, refreshCurrentUser } = useAuthActions()

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      void navigate('/login', { replace: true })
    })

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [logout, navigate])

  useEffect(() => {
    if (!isLoggedIn) {
      return
    }

    void refreshCurrentUser().catch((error) => {
      if (error instanceof ApiHttpError && error.status === 401) {
        logout()
        void navigate('/login', { replace: true })
        return
      }

      if (!getAccessToken()) {
        logout()
        void navigate('/login', { replace: true })
      }
    })
  }, [isLoggedIn, refreshCurrentUser, logout, navigate])

  return null
}

export default function App() {
  return (
    <>
      <AuthLifecycle />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/model-settings" element={<ModelSettingsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
        </Route>
        <Route element={<ProtectedStandaloneRoute />}>
          <Route path="/workspace" element={<WorkspacePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
