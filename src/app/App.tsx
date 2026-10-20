import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthGate } from '../features/auth/AuthGate'
import { DesktopSignInPage } from '../features/site/DesktopSignInPage'
import { LandingPage } from '../features/site/LandingPage'
import { env } from '../lib/env'
import { isStandalone } from '../lib/platform'
import { AppRoutes } from './routes'

// Installed apps skip the marketing site and open straight into the (signed-in) planner.
function HomeRoute() {
  return isStandalone() || env.demoMode ? <Navigate to="/map" replace /> : <LandingPage />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/download" element={<LandingPage />} />
        <Route path="/desktop-sign-in" element={<DesktopSignInPage />} />
        <Route
          path="*"
          element={
            <AuthGate>
              <AppRoutes />
            </AuthGate>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
