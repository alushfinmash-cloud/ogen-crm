import Link from 'next/link'
import { Anchor, Home, ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f2744] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center mx-auto mb-6">
          <Anchor size={32} className="text-[#0f2744]" strokeWidth={2.5} />
        </div>
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <p className="text-xl text-slate-300 mb-2">הדף לא נמצא</p>
        <p className="text-slate-500 mb-8">הדף שחיפשת לא קיים או שהועבר למיקום אחר</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-amber-400 text-[#0f2744] px-6 py-3 rounded-xl font-bold hover:bg-amber-500 transition"
        >
          <Home size={18} />
          חזרה לדשבורד
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
