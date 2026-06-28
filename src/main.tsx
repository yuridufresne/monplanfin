import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from '@/App.tsx'
import '@/index.css'

// Monitoring d'erreurs en production — ACTIF seulement si VITE_SENTRY_DSN est défini
// (sinon no-op : aucun risque tant que la clé n'est pas branchée).
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
