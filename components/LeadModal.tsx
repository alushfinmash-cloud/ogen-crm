'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Lead,
  LeadHistory,
  PipelineColumn,
  LEAD_SOURCES,
  LEAD_STATUSES,
  STATUS_COLORS,
} from '@/lib/types'
import {
  X,
  Trash2,
  Save,
  Phone,
  Mail,
  Clock,
  User,
  MessageCircle,
  ArrowLeftRight,
  StickyNote,
  CheckSquare,
  Plus,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Task, PRIORITY_COLORS, STATUS_COLORS as TASK_STATUS_COLORS, isOverdue } from '@/lib/task-types'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { getScoreColor, getScoreLabel, getScoreBgClass } from '@/lib/scoring-types'
import type { LeadScoreHistory } from '@/lib/scoring-types'

interface Props {
  lead: Lead | null
  columnId: string | null
  columns: PipelineColumn[]
  onSave: (data: Partial<Lead>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

type Tab = 'details' | 'history' | 'tasks' | 'score'

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><User size={12} className="text-green-600" /></div>,
  update: <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"><StickyNote size={12} className="text-blue-600" /></div>,
  column_change: <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center"><ArrowLeftRight size={12} className="text-purple-600" /></div>,
}

export default function LeadModal({ lead, columnId, columns, onSave, onDelete, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('details')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<LeadHistory[]>([])
  const [leadTasks, setLeadTasks] = useState<Task[]>([])
  const [leadScore, setLeadScore] = useState(0)
  const [scoreHistory, setScoreHistory] = useState<LeadScoreHistory[]>([])
  const [scoreUpdatedAt, setScoreUpdatedAt] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Lead>>({
    name: '',
    phone: '',
    email: '',
    source: LEAD_SOURCES[0],
    status: 'חדש',
    notes: '',
    value: undefined,
    column_id: columnId || undefined,
  })

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || '',
        source: lead.source,
        status: lead.status,
        notes: lead.notes || '',
        value: lead.value,
        column_id: lead.column_id,
      })
      fetchHistory(lead.id)
      fetchLeadTasks(lead.id)
      fetchScore(lead.id)
    }
  }, [lead])

  const fetchHistory = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
    if (data) setHistory(data)
  }

  const fetchLeadTasks = async (leadId: string) => {
    const res = await fetch(`/api/tasks?lead_id=${leadId}`)
    const data = await res.json()
    if (Array.isArray(data)) setLeadTasks(data)
  }

  const fetchScore = async (leadId: string) => {
    try {
      const res = await fetch(`/api/scoring?lead_id=${leadId}`)
      if (res.ok) {
        const data = await res.json()
        setLeadScore(data.score ?? 0)
        setScoreHistory(data.history ?? [])
        setScoreUpdatedAt(data.updated_at)
      }
    } catch {
      // silent
    }
  }

  const handleSave = async () => {
    if (!form.name?.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const colName = columns.find((c) => c.id === (form.column_id || lead?.column_id))?.name || '—'
  const statusColor = STATUS_COLORS[form.status || ''] || 'bg-slate-100 text-slate-600'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {lead?.name ? lead.name.trim().slice(0, 2) : <User size={20} />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">
                {lead ? lead.name : 'ליד חדש'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                  {form.status}
                </span>
                <span className="text-xs text-slate-400">{colName}</span>
                {lead && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getScoreBgClass(leadScore)}`}>
                    {leadScore} — {getScoreLabel(leadScore)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {lead && (
              <button
                onClick={() => onDelete(lead.id)}
                className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                title="מחק ליד"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Quick actions for existing lead */}
        {lead?.phone && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Phone size={13} />
              התקשר
            </a>
            <a
              href={`https://wa.me/972${lead.phone.replace(/\D/g, '').replace(/^0/, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <MessageCircle size={13} />
              WhatsApp
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Mail size={13} />
                שלח מייל
              </a>
            )}
          </div>
        )}

        {/* Tabs — only for existing lead */}
        {lead && (
          <div className="flex border-b border-slate-200 px-5 flex-shrink-0">
            {(['details', 'score', 'tasks', 'history'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'details' ? 'פרטים' : t === 'score' ? `ניקוד (${leadScore})` : t === 'tasks' ? `משימות (${leadTasks.length})` : `היסטוריה (${history.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Details tab */}
          {(!lead || tab === 'details') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">שם מלא *</label>
                  <input
                    autoFocus
                    type="text"
                    value={form.name || ''}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="ישראל ישראלי"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">טלפון</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={form.phone || ''}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="050-0000000"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">אימייל</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={form.email || ''}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">מקור ליד</label>
                  <select
                    value={form.source || ''}
                    onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">סטטוס</label>
                  <select
                    value={form.status || ''}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ערך עסקה (₪)</label>
                  <input
                    type="number"
                    dir="ltr"
                    value={form.value || ''}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, value: e.target.value ? Number(e.target.value) : undefined }))
                    }
                    placeholder="0"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {lead && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">עמודה</label>
                    <select
                      value={form.column_id || lead.column_id}
                      onChange={(e) => setForm((p) => ({ ...p, column_id: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {columns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">הערות</label>
                <textarea
                  value={form.notes || ''}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="הוסף הערות על הלקוח, הצרכים שלו, שיחות שהיו..."
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Tasks tab */}
          {lead && tab === 'tasks' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-600">משימות מקושרות</p>
                <a
                  href={`/tasks`}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <Plus size={12} />
                  צור משימה
                </a>
              </div>
              {leadTasks.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">אין משימות מקושרות לליד זה</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leadTasks.map((task) => {
                    const overdue = isOverdue(task)
                    const pColor = PRIORITY_COLORS[task.priority]
                    const sColor = TASK_STATUS_COLORS[task.status]
                    return (
                      <div
                        key={task.id}
                        className={`border rounded-lg px-3 py-2.5 ${overdue ? 'border-red-200 bg-red-50/50' : 'border-slate-200'}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pColor.dot}`} />
                          <p className={`text-sm font-medium flex-1 ${task.status === 'הושלמה' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {task.title}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sColor.bg} ${sColor.text}`}>
                            {task.status}
                          </span>
                        </div>
                        {task.due_date && (
                          <p className={`text-xs mt-1 flex items-center gap-1 ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                            {overdue && <AlertTriangle size={10} />}
                            <Clock size={10} />
                            {format(new Date(task.due_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* History tab */}
          {lead && tab === 'score' && (
            <div className="space-y-4">
              {/* Score Gauge */}
              <div className="text-center py-4">
                <div className="relative inline-flex items-center justify-center">
                  <svg width="140" height="80" viewBox="0 0 140 80">
                    {/* Background arc */}
                    <path
                      d="M 10 75 A 60 60 0 0 1 130 75"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    {/* Score arc */}
                    <path
                      d="M 10 75 A 60 60 0 0 1 130 75"
                      fill="none"
                      stroke={getScoreColor(leadScore)}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${(leadScore / 100) * 188} 188`}
                    />
                  </svg>
                  <div className="absolute bottom-0 text-center">
                    <span className="text-3xl font-bold" style={{ color: getScoreColor(leadScore) }}>
                      {leadScore}
                    </span>
                    <span className="text-xs text-slate-400 block">/100</span>
                  </div>
                </div>
                <p className={`mt-2 text-sm font-semibold ${getScoreBgClass(leadScore)} inline-block px-3 py-1 rounded-full`}>
                  {getScoreLabel(leadScore)}
                </p>
                {scoreUpdatedAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    עדכון אחרון: {format(new Date(scoreUpdatedAt), 'dd/MM/yyyy HH:mm', { locale: he })}
                  </p>
                )}
              </div>

              {/* Score History */}
              <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-2">היסטוריית ניקוד</h3>
                {scoreHistory.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <Target size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">אין שינויי ניקוד עדיין</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {scoreHistory.map(item => (
                      <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-50">
                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                          item.points_change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.points_change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {item.points_change > 0 ? '+' : ''}{item.points_change}
                        </span>
                        <span className="text-sm text-slate-700 flex-1">{item.reason}</span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(item.created_at), 'dd/MM HH:mm', { locale: he })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {lead && tab === 'history' && (
            <div>
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">אין פעילות עדיין</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute end-3 top-0 bottom-0 w-px bg-slate-200" />
                  <div className="space-y-4">
                    {history.map((item) => (
                      <div key={item.id} className="flex gap-3 items-start pe-8">
                        <div className="flex-shrink-0">
                          {ACTION_ICONS[item.action] || (
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                              <Clock size={12} className="text-slate-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800">{item.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400">
                              {format(new Date(item.created_at), 'dd/MM/yyyy • HH:mm', { locale: he })}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">{item.user_name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(!lead || tab === 'details') && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 flex-shrink-0">

            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name?.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save size={15} />
              {saving ? 'שומר...' : lead ? 'שמור שינויים' : 'צור ליד'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
