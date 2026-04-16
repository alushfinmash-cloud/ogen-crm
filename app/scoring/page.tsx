'use client'

import Sidebar from '@/components/Sidebar'
import ScoringRulesManager from '@/components/ScoringRulesManager'

export default function ScoringPage() {
  return (
    <div className="flex h-screen bg-slate-50" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <ScoringRulesManager />
      </main>
    </div>
  )
}
