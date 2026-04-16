import Sidebar from '@/components/Sidebar'
import WorkflowList from '@/components/WorkflowList'

export default function WorkflowsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <WorkflowList />
      </main>
    </div>
  )
}
