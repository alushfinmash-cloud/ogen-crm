import Sidebar from '@/components/Sidebar'
import KanbanBoard from '@/components/KanbanBoard'

export default function PipelinePage() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <KanbanBoard />
      </main>
    </div>
  )
}
