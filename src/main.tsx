import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { App } from './app/App'
import { AppProviders } from './app/providers'
import './styles/globals.css'
import './styles/entry.css'

if (!window.ormaDesktop && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      // Installed apps stay open for days; check for a new release hourly.
      if (registration) window.setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
)
