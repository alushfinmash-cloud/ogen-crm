'use client'

import { useState, useEffect } from 'react'
import {
  Zap, Plus, Trash2, Edit2, Check, X, ToggleLeft, ToggleRight,
  TrendingUp, TrendingDown, AlertTriangle, Target,
} from 'lucide-react'
import type { ScoringRule } from '@/lib/scoring-types'
import { TRIGGER_TYPES, SCORE_THRESHOLDS } from '@/lib/scoring-types'

export default function ScoringRulesManager() {
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', trigger_type: '', points: 0 })
  const [thresholds, setThresholds] = useState(SCORE_THRESHOLDS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/scoring/rules')
      if (res.ok) setRules(await res.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.trigger_type) return
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch('/api/scoring/rules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...form }),
        })
        if (res.ok) {
          const updated = await res.json()
          setRules(rules.map(r => r.id === editingId ? updated : r))
        }
      } else {
        const res = await fetch('/api/scoring/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const created = await res.json()
          setRules([...rules, created])
        }
      }
      resetForm()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (rule: ScoringRule) => {
    const res = await fetch('/api/scoring/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
    })
    if (res.ok) {
      setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את הכלל?')) return
    await fetch(`/api/scoring/rules?id=${id}`, { method: 'DELETE' })
    setRules(rules.filter(r => r.id !== id))
  }

  const startEdit = (rule: ScoringRule) => {
    setEditingId(rule.id)
    setForm({ name: rule.name, trigger_type: rule.trigger_type, points: rule.points })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', trigger_type: '', points: 0 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target size={28} className="text-blue-600" />
            ניקוד לידים — Lead Scoring
          </h1>
          <p className="text-slate-500 text-sm mt-1">הגדר כללי ניקוד אוטומטיים לזיהוי לידים חמים</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus size={16} />
          הוסף כלל חדש
        </button>
      </div>

      {/* Thresholds Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          סף התראות
        </h2>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">ליד חם (התראה מעל):</label>
            <input
              type="number"
              min={0}
              max={100}
              value={thresholds.hot}
              onChange={(e) => setThresholds(t => ({ ...t, hot: Number(e.target.value) }))}
              className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
            />
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">🔥 חם</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">ליד קר (התראה מתחת):</label>
            <input
              type="number"
              min={0}
              max={100}
              value={thresholds.cold}
              onChange={(e) => setThresholds(t => ({ ...t, cold: Number(e.target.value) }))}
              className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
            />
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">❄️ קר</span>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-700 mb-4">
            {editingId ? 'עריכת כלל' : 'כלל ניקוד חדש'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">שם הכלל</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="למשל: ליד נכנס למערכת"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">טריגר</label>
              <select
                value={form.trigger_type}
                onChange={(e) => setForm(f => ({ ...f, trigger_type: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">בחר טריגר...</option>
                {Object.entries(TRIGGER_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">ניקוד (חיובי/שלילי)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm(f => ({ ...f, points: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <span className={`text-lg ${form.points > 0 ? 'text-green-500' : form.points < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {form.points > 0 ? <TrendingUp size={20} /> : form.points < 0 ? <TrendingDown size={20} /> : '—'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.trigger_type}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={16} />
              {editingId ? 'עדכן' : 'שמור'}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              <X size={16} />
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Zap size={18} className="text-amber-500" />
          <h2 className="font-semibold text-slate-700">כללי ניקוד ({rules.length})</h2>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Target size={40} className="mx-auto mb-3 opacity-50" />
            <p>אין כללי ניקוד עדיין</p>
            <p className="text-xs mt-1">הוסף כלל ראשון כדי להתחיל לנקד לידים</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-2.5 px-4 text-right font-medium text-slate-500">פעיל</th>
                <th className="py-2.5 px-4 text-right font-medium text-slate-500">שם הכלל</th>
                <th className="py-2.5 px-4 text-right font-medium text-slate-500">טריגר</th>
                <th className="py-2.5 px-4 text-right font-medium text-slate-500">ניקוד</th>
                <th className="py-2.5 px-4 text-right font-medium text-slate-500">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} className={`border-b border-slate-100 hover:bg-slate-50 ${!rule.is_active ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-4">
                    <button onClick={() => handleToggle(rule)} className="text-slate-500 hover:text-blue-600">
                      {rule.is_active
                        ? <ToggleRight size={22} className="text-green-500" />
                        : <ToggleLeft size={22} />
                      }
                    </button>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{rule.name}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {TRIGGER_TYPES[rule.trigger_type] || rule.trigger_type}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      rule.points > 0
                        ? 'bg-green-100 text-green-700'
                        : rule.points < 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {rule.points > 0 ? '+' : ''}{rule.points}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(rule)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">מקרא ניקוד</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-3 rounded-full bg-red-400" />
            <span className="text-xs text-slate-500">0-30 — קר ❄️</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-3 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-500">31-60 — פושר 🌤️</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-3 rounded-full bg-green-400" />
            <span className="text-xs text-slate-500">61-100 — חם 🔥</span>
          </div>
        </div>
      </div>
    </div>
  )
}
