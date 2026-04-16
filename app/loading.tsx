import { Anchor } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Anchor size={28} className="text-[#0f2744]" strokeWidth={2.5} />
        </div>
        <p className="text-slate-400 text-sm">טוען...</p>
      </div>
    </div>
  )
}
