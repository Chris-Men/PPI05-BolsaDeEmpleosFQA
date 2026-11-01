import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppRoutes } from './routes/AppRoutes'
import { AuthProvider } from './state/AuthProvider'
import { SiteSettingsProvider } from './state/SiteSettingsProvider'
import './index.css'
import { BackupOperationMonitor } from './components/admin/BackupOperationMonitor'
import { StatisticsExportsProvider } from './state/StatisticsExportsProvider'
import { StatisticsExportMonitor } from './components/admin/StatisticsExportPanel'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider><SiteSettingsProvider><StatisticsExportsProvider><AppRoutes /><BackupOperationMonitor /><StatisticsExportMonitor /></StatisticsExportsProvider></SiteSettingsProvider></AuthProvider>
  </React.StrictMode>,
)
