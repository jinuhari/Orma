import { AppRoutes } from './routes'
import { AuthGate } from '../features/auth/AuthGate'

export function App() {
  return (
    <AuthGate>
      <AppRoutes />
    </AuthGate>
  )
}
