import Sidebar from '@/components/Sidebar'
import AgentEditor from '@/components/AgentEditor'

export default function AgentEditorPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <AgentEditor agentId={params.id} />
      </main>
    </div>
  )
}
