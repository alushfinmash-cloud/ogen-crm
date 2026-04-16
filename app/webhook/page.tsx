import Sidebar from '@/components/Sidebar'
import WebhookManager from '@/components/WebhookManager'

export default function WebhookPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <WebhookManager />
      </main>
    </div>
  )
}
