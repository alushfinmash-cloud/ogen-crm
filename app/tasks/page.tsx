import Sidebar from '@/components/Sidebar'
import TaskDashboard from '@/components/TaskDashboard'

export default function TasksPage() {
  return (
    <div className="flex h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <TaskDashboard />
      </main>
    </div>
  )
}
