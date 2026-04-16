import Sidebar from '@/components/Sidebar'
import QuickRepliesManager from '@/components/QuickRepliesManager'

export default function QuickRepliesPage() {
  return (
    <div className="flex h-screen bg-slate-50" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <QuickRepliesManager />
      </main>
    </div>
  )
}
