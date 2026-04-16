'use client'

import { useState, useEffect } from 'react'
import {
  Zap, Plus, Trash2, Edit3, Save, X, Search, MessageSquare,
} from 'lucide-react'

interface QuickReply {
  id: string
  title: string
  content: string
  category: string
  shortcut: string | null
  usage_count: number
  is_active: boolean
  created_at: string
}

const CATEGORIES = [
  { value: 'general', label: 'כללי', color: 'bg-slate-100 text-slate-700' },
  { value: 'sales', label: 'מכירות', color: 'bg-blue-100 text-blue-700' },
  { value: 'scheduling', label: 'תיאום', color: 'bg-green-100 text-green-700' },
  { value: 'followup', label: 'מעקב', color: 'bg-amber-100 text-amber-700' },
  { value: 'support', label: 'תמיכה', color: 'bg-purple-100 text-purple-700' },
]

export default function QuickRepliesManager() {
  const [replies, setReplies] = useState<QuickReply[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'general',
    shortcut: '',
  })

  const fetchReplies = async () => {
    try {
      const res = await fetch('/api/inbox/quick-replies')
      if (res.ok) setReplies(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReplies() }, [])

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return

    const payload = {
      title: form.title,
      content: form.content,
      category: form.category,
      shortcut: form.shortcut || null,
    }

    try {
      if (editingId) {
        const res = await fetch('/api/inbox/quick-replies', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
        if (res.ok) {
          const updated = await res.json()
          setReplies(prev => prev.map(r => r.id === editingId ? updated : r))
        }
      } else {
        const res = await fetch('/api/inbox/quick-replies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          setReplies(prev => [created, ...prev])
        }
      }
    } catch { /* silent */ }

    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק תבנית זו?')) return
    try {
      await fetch(`/api/inbox/quick-replies?id=${id}`, { method: 'DELETE' })
      setReplies(prev => prev.filter(r => r.id !== id))
    } catch { /* silent */ }
  }

  const handleEdit = (reply: QuickReply) => {
    setEditingId(reply.id)
    setForm({
      title: reply.title,
      content: reply.content,
      category: reply.category,
      shortcut: reply.shortcut || '',
    })
    setShowForm(true)
  }

  const handleToggle = async (reply: QuickReply) => {
    try {
      const res = await fetch('/api/inbox/quick-replies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reply.id, is_active: !reply.is_active }),
      })
      if (res.ok) {
        const updated = await res.json()
        setReplies(prev => prev.map(r => r.id === reply.id ? updated : r))
      }
    } catch { /* silent */ }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ title: '', content: '', category: 'general', shortcut: '' })
  }

  const filtered = replies.filter(r => {
    if (categoryFilter && r.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q) || r.shortcut?.toLowerCase().includes(q)
    }
    return true
  })

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Zap size={26} className="text-amber-500" />
            תגובות מהירות
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            נהל תבניות הודעה מוכנות לשימוש מהיר בשיחות ({replies.length} תבניות)
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} />
          תבנית חדשה
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש תבנית..."
            className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !categoryFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            הכל
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value === categoryFilter ? '' : cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === cat.value ? 'bg-slate-800 text-white' : `${cat.color} hover:opacity-80`
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              {editingId ? <Edit3 size={16} /> : <Plus size={16} />}
              {editingId ? 'עריכת תבנית' : 'תבנית חדשה'}
            </h3>
            <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">כותרת *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="שם התבנית"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">קטגוריה</label>
              <select
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">קיצור (לדוגמה: /hi)</label>
              <input
                type="text"
                value={form.shortcut}
                onChange={(e) => setForm(f => ({ ...f, shortcut: e.target.value }))}
                placeholder="/shortcut"
                dir="ltr"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">תוכן ההודעה *</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="הקלד את תוכן ההודעה..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none h-24"
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={!form.title.trim() || !form.content.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={14} />
              {editingId ? 'עדכן' : 'שמור'}
            </button>
          </div>
        </div>
      )}

      {/* Replies List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <MessageSquare size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 text-sm">
            {search || categoryFilter ? 'אין תבניות תואמות' : 'אין תבניות עדיין'}
          </p>
          {!search && !categoryFilter && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + צור תבנית ראשונה
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(reply => {
            const cat = getCategoryInfo(reply.category)

            return (
              <div
                key={reply.id}
                className={`bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow ${
                  !reply.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{reply.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.color}`}>
                        {cat.label}
                      </span>
                      {reply.shortcut && (
                        <code className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                          {reply.shortcut}
                        </code>
                      )}
                      <span className="text-xs text-slate-400">
                        שימוש: {reply.usage_count} פעמים
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{reply.content}</p>
                  </div>

                  <div className="flex items-center gap-1 mr-3 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(reply)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        reply.is_active ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        reply.is_active ? 'right-0.5' : 'right-5'
                      }`} />
                    </button>
                    <button
                      onClick={() => handleEdit(reply)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                      title="ערוך"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(reply.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"
                      title="מחק"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
