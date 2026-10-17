import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './state/AuthProvider'
import { SiteSettingsProvider } from './state/SiteSettingsProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider><SiteSettingsProvider><App /></SiteSettingsProvider></AuthProvider>
  </React.StrictMode>,
)
