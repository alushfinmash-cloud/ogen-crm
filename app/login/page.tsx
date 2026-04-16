'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Anchor, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/dashboard'
        router.push(redirect)
      } else {
        const data = await res.json()
        setError(data.error || 'שגיאה בהתחברות')
      }
    } catch {
      setError('שגיאת תקשורת')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f2744] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center mx-auto mb-4">
            <Anchor size={32} className="text-[#0f2744]" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">עוגן פיננסי</h1>
          <p className="text-slate-400 mt-1">CRM מקצועי</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">כניסה למערכת</h2>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              סיסמת מנהל
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הזן סיסמה"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-amber-400 text-[#0f2744] rounded-xl font-bold hover:bg-amber-500 transition disabled:opacity-50"
          >
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-6">
          גרסה 1.0 — עוגן פיננסי CRM
        </p>
      </div>
    </div>
  )
}
