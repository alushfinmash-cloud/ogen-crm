import Sidebar from '@/components/Sidebar'
import AgentList from '@/components/AgentList'

export default function AgentsPage() {
  return (
    <div className="flex h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <AgentList />
      </main>
    </div>
  )
}
