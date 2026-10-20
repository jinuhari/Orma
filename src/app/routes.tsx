import { Navigate, Route, Routes } from 'react-router-dom'

import { CalendarPage } from '../features/calendar/CalendarPage'
import { AccountPage } from '../features/auth/AccountPage'
import { AppShell } from '../components/layout/AppShell'
import { FocusPage } from '../features/focus/FocusPage'
import { LegacyOrmaView } from '../features/legacy/LegacyOrmaView'
import { PlannerPage } from '../features/planner/PlannerPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TasksPage } from '../features/tasks/TasksPage'

function PlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <section className="placeholder-page" aria-labelledby="placeholderTitle">
      <h1 id="placeholderTitle">{title}</h1>
      <p>{note}</p>
    </section>
  )
}

// Signed-in app routes; the router and auth gate live in App.
export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/map" element={<LegacyOrmaView />} />
        <Route path="/legacy" element={<LegacyOrmaView />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route
          path="/whatsapp"
          element={
            <PlaceholderPage
              title="WhatsApp AI"
              note="Not configured yet. A real backend bot integration will be added before public launch."
            />
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/pricing"
          element={
            <PlaceholderPage
              title="Pricing"
              note="Billing UI will move here after entitlement and webhook foundation is complete."
            />
          }
        />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </AppShell>
  )
}
