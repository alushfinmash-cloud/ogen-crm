import Sidebar from '@/components/Sidebar'
import CommentAutoReply from '@/components/CommentAutoReply'

export default function CommentAutoReplyPage() {
  return (
    <div className="flex h-screen bg-slate-50" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <CommentAutoReply />
      </main>
    </div>
  )
}
