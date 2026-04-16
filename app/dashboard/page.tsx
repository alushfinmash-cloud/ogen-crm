'use client'

import Sidebar from '@/components/Sidebar'
import Dashboard from '@/components/Dashboard'

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-slate-50" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Dashboard />
      </main>
    </div>
  )
}
