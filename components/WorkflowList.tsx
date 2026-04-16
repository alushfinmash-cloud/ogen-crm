'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Workflow, TRIGGER_LABELS } from '@/lib/workflow-types'
import {
  Plus,
  RefreshCw,
  GitBranch,
  Play,
  Pause,
  Trash2,
  Pencil,
  Zap,
  ArrowLeftRight,
  Webhook,
} from 'lucide-react'

export default function WorkflowList() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<(Workflow & { workflow_steps?: { id: string }[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTrigger, setNewTrigger] = useState<'webhook_lead' | 'column_change'>('webhook_lead')

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('workflows')
      .select('*, workflow_steps(id)')
      .order('created_at', { ascending: false })
    if (data) setWorkflows(data)
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    const { data } = await supabase
      .from('workflows')
      .insert({ name: newName.trim(), trigger_type: newTrigger, trigger_config: {} })
      .select()
      .single()
    if (data) {
      router.push(`/workflows/${data.id}`)
    }
  }

  const handleToggle = async (wf: Workflow) => {
    const newActive = !wf.is_active
    await supabase.from('workflows').update({ is_active: newActive }).eq('id', wf.id)
    setWorkflows((prev) =>
      prev.map((w) => (w.id === wf.id ? { ...w, is_active: newActive } : w))
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('האם למחוק workflow זה?')) return
    await supabase.from('workflow_logs').delete().eq('workflow_id', id)
    await supabase.from('workflow_steps').delete().eq('workflow_id', id)
    await supabase.from('workflows').delete().eq('id', id)
    setWorkflows((prev) => prev.filter((w) => w.id !== id))
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={28} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GitBranch size={22} className="text-blue-600" />
            אוטומציות (Workflows)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">בנה אוטומציות שירוצו כשליד נכנס או עובר שלב</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus size={16} />
          workflow חדש
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Create inline form */}
        {showCreate && (
          <div className="bg-white rounded-xl border border-blue-200 p-5 mb-5 max-w-2xl animate-fade-in">
            <h3 className="font-semibold text-slate-800 mb-3">יצירת Workflow חדש</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">שם ה-Workflow</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder='לדוגמה: "ליד חדש — הודעת ברוכים הבאים"'
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">סוג טריגר</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTrigger('webhook_lead')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-all ${
                      newTrigger === 'webhook_lead'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Webhook size={16} />
                    ליד נכנס דרך Webhook
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTrigger('column_change')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-all ${
                      newTrigger === 'column_change'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowLeftRight size={16} />
                    ליד הועבר לעמודה
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  צור ופתח בילדר
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName('') }}
                  className="px-4 py-2 text-slate-500 text-sm hover:bg-slate-100 rounded-lg"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workflow list */}
        {workflows.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
              <GitBranch size={30} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">אין workflows עדיין</h3>
            <p className="text-slate-500 text-sm mb-5 max-w-sm">
              צור workflow כדי להפעיל אוטומציות כשלידים נכנסים או עוברים שלבים בפייפליין
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus size={16} />
              צור workflow ראשון
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className={`bg-white rounded-xl border p-4 transition-all hover:shadow-sm cursor-pointer ${
                  wf.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
                onClick={() => router.push(`/workflows/${wf.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      wf.is_active ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <Zap size={18} className={wf.is_active ? 'text-blue-600' : 'text-slate-400'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{wf.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">
                          {TRIGGER_LABELS[wf.trigger_type] || wf.trigger_type}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400">
                          {wf.workflow_steps?.length || 0} פעולות
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400">{formatDate(wf.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggle(wf)}
                      className={`p-2 rounded-lg transition-colors ${
                        wf.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={wf.is_active ? 'השהה' : 'הפעל'}
                    >
                      {wf.is_active ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={() => router.push(`/workflows/${wf.id}`)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="ערוך"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="מחק"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Status badge */}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    wf.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {wf.is_active ? 'פעיל' : 'מושהה'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
