import Sidebar from '@/components/Sidebar'
import Inbox from '@/components/Inbox'

export default function InboxPage() {
  return (
    <div className="flex h-screen bg-slate-50" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Inbox />
      </main>
    </div>
  )
}
