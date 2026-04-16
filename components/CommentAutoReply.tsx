'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
  Facebook,
  Instagram,
  Send,
  Eye,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Activity,
  ExternalLink,
} from 'lucide-react'

interface AutoReplyRule {
  id: string
  platform: 'facebook' | 'instagram'
  post_id: string
  post_url: string | null
  post_title: string | null
  keyword: string
  dm_message: string
  public_reply: string | null
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

interface AutoReplyLog {
  id: string
  rule_id: string | null
  platform: string
  post_id: string
  comment_id: string
  commenter_id: string
  commenter_name: string | null
  comment_text: string | null
  keyword_matched: string
  dm_sent: boolean
  public_reply_sent: boolean
  error: string | null
  created_at: string
}

type Tab = 'rules' | 'logs'
type PlatformFilter = 'all' | 'facebook' | 'instagram'

const EMPTY_FORM = {
  platform: 'facebook' as 'facebook' | 'instagram',
  post_id: '',
  post_url: '',
  post_title: '',
  keyword: '',
  dm_message: '',
  public_reply: '',
}

export default function CommentAutoReply() {
  const [rules, setRules] = useState<AutoReplyRule[]>([])
  const [logs, setLogs] = useState<AutoReplyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('rules')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // Fetch rules
  const fetchRules = async () => {
    try {
      const res = await fetch('/api/comment-auto-reply')
      if (res.ok) {
        const data = await res.json()
        setRules(data)
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/comment-auto-reply/logs?limit=100')
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchRules()
    fetchLogs()
  }, [])

  // Save rule (create or update)
  const handleSave = async () => {
    if (!form.post_id || !form.keyword || !form.dm_message) return
    setSaving(true)

    try {
      if (editingId) {
        await fetch('/api/comment-auto-reply', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...form }),
        })
      } else {
        await fetch('/api/comment-auto-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      fetchRules()
    } catch { /* silent */ }

    setSaving(false)
  }

  // Toggle active
  const handleToggle = async (rule: AutoReplyRule) => {
    await fetch('/api/comment-auto-reply', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
    })
    fetchRules()
  }

  // Delete rule
  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את החוק הזה?')) return
    await fetch(`/api/comment-auto-reply?id=${id}`, { method: 'DELETE' })
    fetchRules()
  }

  // Edit rule
  const handleEdit = (rule: AutoReplyRule) => {
    setForm({
      platform: rule.platform,
      post_id: rule.post_id,
      post_url: rule.post_url || '',
      post_title: rule.post_title || '',
      keyword: rule.keyword,
      dm_message: rule.dm_message,
      public_reply: rule.public_reply || '',
    })
    setEditingId(rule.id)
    setShowForm(true)
  }

  // Filter rules
  const filteredRules = rules.filter((r) => {
    if (platformFilter !== 'all' && r.platform !== platformFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        r.keyword.includes(q) ||
        (r.post_title || '').toLowerCase().includes(q) ||
        r.dm_message.toLowerCase().includes(q) ||
        r.post_id.includes(q)
      )
    }
    return true
  })

  // Group rules by post
  const groupedByPost = filteredRules.reduce((acc, rule) => {
    const key = `${rule.platform}:${rule.post_id}`
    if (!acc[key]) {
      acc[key] = {
        platform: rule.platform,
        post_id: rule.post_id,
        post_url: rule.post_url,
        post_title: rule.post_title,
        rules: [],
      }
    }
    acc[key].rules.push(rule)
    return acc
  }, {} as Record<string, { platform: string; post_id: string; post_url: string | null; post_title: string | null; rules: AutoReplyRule[] }>)

  const stats = {
    total: rules.length,
    active: rules.filter((r) => r.is_active).length,
    facebook: rules.filter((r) => r.platform === 'facebook').length,
    instagram: rules.filter((r) => r.platform === 'instagram').length,
    totalSent: rules.reduce((sum, r) => sum + (r.usage_count || 0), 0),
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="text-purple-600" size={28} />
            תגובה → הודעה פרטית
          </h1>
          <p className="text-gray-500 mt-1">
            שלח הודעה פרטית אוטומטית למי שמגיב מילת מפתח בפוסט
          </p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM)
            setEditingId(null)
            setShowForm(true)
          }}
          className="bg-purple-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-purple-700 transition font-medium"
        >
          <Plus size={18} />
          חוק חדש
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-gray-500 text-xs">סה״כ חוקים</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-gray-500 text-xs">פעילים</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-gray-500 text-xs">Facebook</p>
          <p className="text-2xl font-bold text-blue-600">{stats.facebook}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-gray-500 text-xs">Instagram</p>
          <p className="text-2xl font-bold text-pink-600">{stats.instagram}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-gray-500 text-xs">הודעות נשלחו</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalSent}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4 w-fit">
        <button
          onClick={() => setTab('rules')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'rules' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={14} className="inline ml-1" />
          חוקים
        </button>
        <button
          onClick={() => { setTab('logs'); fetchLogs() }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'logs' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Activity size={14} className="inline ml-1" />
          לוג פעילות
        </button>
      </div>

      {/* Filters */}
      {tab === 'rules' && (
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="חיפוש לפי מילת מפתח, כותרת פוסט..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(['all', 'facebook', 'instagram'] as PlatformFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  platformFilter === p ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
                }`}
              >
                {p === 'all' ? 'הכל' : p === 'facebook' ? 'Facebook' : 'Instagram'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-lg">
                {editingId ? 'עריכת חוק' : 'חוק חדש'}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Platform */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">פלטפורמה</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm({ ...form, platform: 'facebook' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition font-medium text-sm ${
                      form.platform === 'facebook'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Facebook size={18} />
                    Facebook
                  </button>
                  <button
                    onClick={() => setForm({ ...form, platform: 'instagram' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition font-medium text-sm ${
                      form.platform === 'instagram'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Instagram size={18} />
                    Instagram
                  </button>
                </div>
              </div>

              {/* Post ID */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  מזהה פוסט (Post ID) *
                </label>
                <input
                  type="text"
                  value={form.post_id}
                  onChange={(e) => setForm({ ...form, post_id: e.target.value })}
                  placeholder="לדוגמה: 123456789_987654321"
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                  dir="ltr"
                />
              </div>

              {/* Post Title */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  כותרת / תיאור הפוסט
                </label>
                <input
                  type="text"
                  value={form.post_title}
                  onChange={(e) => setForm({ ...form, post_title: e.target.value })}
                  placeholder="לדוגמה: פוסט מבצע יום האם"
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
              </div>

              {/* Post URL */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  קישור לפוסט (אופציונלי)
                </label>
                <input
                  type="url"
                  value={form.post_url}
                  onChange={(e) => setForm({ ...form, post_url: e.target.value })}
                  placeholder="https://www.facebook.com/..."
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                  dir="ltr"
                />
              </div>

              {/* Keyword */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  <Hash size={14} className="inline ml-1" />
                  מילת מפתח *
                </label>
                <input
                  type="text"
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                  placeholder='לדוגמה: "אמא" או "אני רוצה"'
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  המערכת תזהה את המילה בתגובה (לא רגישה לאותיות גדולות/קטנות)
                </p>
              </div>

              {/* DM Message */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  <Send size={14} className="inline ml-1" />
                  הודעה פרטית לשליחה *
                </label>
                <textarea
                  value={form.dm_message}
                  onChange={(e) => setForm({ ...form, dm_message: e.target.value })}
                  placeholder="היי! ראינו שהגבת על הפוסט שלנו 😊 הנה הלינק למבצע..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 resize-none"
                />
              </div>

              {/* Public Reply (optional) */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  <Eye size={14} className="inline ml-1" />
                  תגובה פומבית (אופציונלי)
                </label>
                <input
                  type="text"
                  value={form.public_reply}
                  onChange={(e) => setForm({ ...form, public_reply: e.target.value })}
                  placeholder='לדוגמה: "שלחנו לך הודעה פרטית 💬"'
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="flex-1 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-100 transition text-sm font-medium"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.post_id || !form.keyword || !form.dm_message}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {saving ? 'שומר...' : editingId ? 'עדכון' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {tab === 'rules' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">טוען...</div>
          ) : Object.keys(groupedByPost).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">אין חוקים עדיין</p>
              <p className="text-gray-400 text-sm mt-1">
                צור חוק חדש כדי לשלוח הודעות פרטיות אוטומטיות למגיבים
              </p>
              <button
                onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}
                className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-purple-700 transition"
              >
                <Plus size={16} className="inline ml-1" />
                צור חוק ראשון
              </button>
            </div>
          ) : (
            Object.entries(groupedByPost).map(([key, group]) => (
              <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Post Header */}
                <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-3">
                  {group.platform === 'facebook' ? (
                    <Facebook size={18} className="text-blue-600" />
                  ) : (
                    <Instagram size={18} className="text-pink-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">
                      {group.post_title || 'פוסט ללא כותרת'}
                    </p>
                    <p className="text-xs text-gray-400 font-mono" dir="ltr">
                      ID: {group.post_id}
                    </p>
                  </div>
                  {group.post_url && (
                    <a
                      href={group.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-purple-600 transition"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {group.rules.length} חוקים
                  </span>
                </div>

                {/* Rules List */}
                <div className="divide-y divide-gray-50">
                  {group.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`px-5 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition ${
                        !rule.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(rule)}
                        className="flex-shrink-0"
                        title={rule.is_active ? 'כבה' : 'הפעל'}
                      >
                        {rule.is_active ? (
                          <ToggleRight size={28} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={28} className="text-gray-300" />
                        )}
                      </button>

                      {/* Keyword */}
                      <div className="flex-shrink-0">
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm font-medium">
                          &quot;{rule.keyword}&quot;
                        </span>
                      </div>

                      {/* Arrow */}
                      <Send size={14} className="text-gray-300 flex-shrink-0" />

                      {/* DM Message preview */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{rule.dm_message}</p>
                        {rule.public_reply && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            <Eye size={12} className="inline ml-1" />
                            תגובה פומבית: {rule.public_reply}
                          </p>
                        )}
                      </div>

                      {/* Usage */}
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {rule.usage_count} שליחות
                      </span>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(rule)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Activity size={36} className="mx-auto mb-2 text-gray-300" />
              <p>אין פעילות עדיין</p>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="px-5 py-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    {/* Status indicator */}
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        log.dm_sent ? 'bg-green-400' : 'bg-red-400'
                      }`}
                    />

                    {/* Platform icon */}
                    {log.platform === 'facebook' ? (
                      <Facebook size={16} className="text-blue-500 flex-shrink-0" />
                    ) : (
                      <Instagram size={16} className="text-pink-500 flex-shrink-0" />
                    )}

                    {/* Commenter */}
                    <span className="text-sm font-medium text-gray-700">
                      {log.commenter_name || log.commenter_id}
                    </span>

                    {/* Keyword matched */}
                    <span className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded-full">
                      &quot;{log.keyword_matched}&quot;
                    </span>

                    {/* Time */}
                    <span className="text-xs text-gray-400 me-auto">
                      {new Date(log.created_at).toLocaleString('he-IL')}
                    </span>

                    {/* Expand */}
                    {expandedLog === log.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>

                  {/* Expanded details */}
                  {expandedLog === log.id && (
                    <div className="mt-3 mr-8 space-y-2 text-sm">
                      {log.comment_text && (
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <p className="text-xs text-gray-400 mb-1">תוכן התגובה:</p>
                          <p className="text-gray-700">{log.comment_text}</p>
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>DM: {log.dm_sent ? '✓ נשלח' : '✗ נכשל'}</span>
                        <span>תגובה פומבית: {log.public_reply_sent ? '✓ נשלח' : '—'}</span>
                      </div>
                      {log.error && (
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
                          שגיאה: {log.error}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 font-mono" dir="ltr">
                        Post: {log.post_id} | Comment: {log.comment_id}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
