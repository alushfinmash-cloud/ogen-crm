'use client'

import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import WorkflowBuilder from '@/components/WorkflowBuilder'

export default function WorkflowEditorPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <WorkflowBuilder workflowId={id} />
      </main>
    </div>
  )
}
