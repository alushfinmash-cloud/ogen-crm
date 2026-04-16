'use client'

import Sidebar from '@/components/Sidebar'
import IntegrationsPage from '@/components/IntegrationsPage'

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-slate-50" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <IntegrationsPage />
      </main>
    </div>
  )
}
