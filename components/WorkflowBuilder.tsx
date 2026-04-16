'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Pipeline, PipelineColumn } from '@/lib/types'
import {
  Workflow,
  WorkflowStep,
  WorkflowLog,
  ActionType,
  ACTION_LABELS,
  ACTION_COLORS,
  TRIGGER_LABELS,
  WAIT_UNITS,
} from '@/lib/workflow-types'
import StepConfigDrawer from './StepConfigDrawer'
import {
  ArrowDown,
  Plus,
  Save,
  Play,
  Pause,
  Trash2,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Zap,
  Webhook,
  ArrowLeftRight,
  UserPlus,
  Tag,
  MessageCircle,
  Clock,
  StopCircle,
  Mail,
  Bell,
  ScrollText,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

const ACTION_ICON_MAP: Record<ActionType, React.ReactNode> = {
  create_contact: <UserPlus size={18} />,
  add_tag: <Tag size={18} />,
  send_whatsapp: <MessageCircle size={18} />,
  wait: <Clock size={18} />,
  stop_previous: <StopCircle size={18} />,
  send_email: <Mail size={18} />,
  create_reminder: <Bell size={18} />,
}

const AVAILABLE_ACTIONS: ActionType[] = [
  'create_contact',
  'add_tag',
  'send_whatsapp',
  'wait',
  'stop_previous',
  'send_email',
  'create_reminder',
]

interface Props {
  workflowId: string
}

export default function WorkflowBuilder({ workflowId }: Props) {
  const router = useRouter()
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [logs, setLogs] = useState<WorkflowLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddStep, setShowAddStep] = useState<number | null>(null)
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [triggerConfig, setTriggerConfig] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  const loadWorkflow = useCallback(async () => {
    setLoading(true)
    const [{ data: wf }, { data: st }, { data: lg }, { data: pipes }, { data: cols }] = await Promise.all([
      supabase.from('workflows').select('*').eq('id', workflowId).single(),
      supabase.from('workflow_steps').select('*').eq('workflow_id', workflowId).order('step_order'),
      supabase.from('workflow_logs').select('*').eq('workflow_id', workflowId).order('executed_at', { ascending: false }).limit(50),
      supabase.from('pipelines').select('*').order('created_at'),
      supabase.from('pipeline_columns').select('*').order('position'),
    ])
    if (wf) {
      setWorkflow(wf)
      setTriggerConfig(wf.trigger_config || {})
    }
    if (st) setSteps(st)
    if (lg) setLogs(lg)
    if (pipes) setPipelines(pipes)
    if (cols) setColumns(cols)
    setLoading(false)
  }, [workflowId])

  useEffect(() => { loadWorkflow() }, [loadWorkflow])

  const handleSave = async () => {
    if (!workflow) return
    setSaving(true)

    await supabase.from('workflows').update({
      name: workflow.name,
      trigger_type: workflow.trigger_type,
      trigger_config: triggerConfig,
      updated_at: new Date().toISOString(),
    }).eq('id', workflowId)

    // Replace steps
    await supabase.from('workflow_steps').delete().eq('workflow_id', workflowId)
    if (steps.length > 0) {
      await supabase.from('workflow_steps').insert(
        steps.map((s, i) => ({
          workflow_id: workflowId,
          step_order: i,
          action_type: s.action_type,
          action_config: s.action_config || {},
          wait_duration: s.wait_duration || null,
        }))
      )
    }

    setDirty(false)
    setSaving(false)
  }

  const handleToggleActive = async () => {
    if (!workflow) return
    if (dirty) await handleSave()
    const newActive = !workflow.is_active
    await supabase.from('workflows').update({ is_active: newActive }).eq('id', workflowId)
    setWorkflow((prev) => prev ? { ...prev, is_active: newActive } : null)
  }

  const handleDelete = async () => {
    if (!confirm('האם למחוק workflow זה לצמיתות?')) return
    await supabase.from('workflow_logs').delete().eq('workflow_id', workflowId)
    await supabase.from('workflow_steps').delete().eq('workflow_id', workflowId)
    await supabase.from('workflows').delete().eq('id', workflowId)
    router.push('/workflows')
  }

  const addStep = (actionType: ActionType, afterIndex: number) => {
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      workflow_id: workflowId,
      step_order: afterIndex + 1,
      action_type: actionType,
      action_config: {},
      wait_duration: actionType === 'wait' ? 60 : null,
      created_at: new Date().toISOString(),
    }
    const updated = [...steps]
    updated.splice(afterIndex + 1, 0, newStep)
    setSteps(updated.map((s, i) => ({ ...s, step_order: i })))
    setShowAddStep(null)
    setDirty(true)
    setEditingStep(newStep)
  }

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i })))
    setDirty(true)
  }

  const updateStep = (updated: WorkflowStep) => {
    setSteps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setDirty(true)
    setEditingStep(null)
  }

  if (loading || !workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={28} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  const filteredCols = columns.filter((c) => c.pipeline_id === triggerConfig.pipeline_id)

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/workflows')}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
          >
            <ChevronRight size={18} />
          </button>
          <input
            value={workflow.name}
            onChange={(e) => { setWorkflow((p) => p ? { ...p, name: e.target.value } : null); setDirty(true) }}
            className="text-lg font-bold text-slate-900 bg-transparent border-none outline-none focus:bg-slate-100 focus:px-2 rounded-lg transition-all"
          />
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            workflow.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {workflow.is_active ? 'פעיל' : 'טיוטה'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showLogs ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <ScrollText size={15} />
            לוגים ({logs.length})
          </button>
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              workflow.is_active
                ? 'text-amber-600 hover:bg-amber-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
          >
            {workflow.is_active ? <><Pause size={15} /> השהה</> : <><Play size={15} /> פרסם</>}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={15} />
            {saving ? 'שומר...' : 'שמור'}
          </button>
          <button onClick={handleDelete} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-6 p-6">
          {/* Flow builder — main area */}
          <div className="flex-1 flex flex-col items-center max-w-xl mx-auto">

            {/* ── Trigger block ── */}
            <div className="w-full bg-gradient-to-l from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={18} />
                <span className="font-bold text-sm">טריגר</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {workflow.trigger_type === 'webhook_lead'
                  ? <Webhook size={16} />
                  : <ArrowLeftRight size={16} />
                }
                <span className="text-sm font-medium">{TRIGGER_LABELS[workflow.trigger_type]}</span>
              </div>

              {/* Trigger config */}
              <div className="bg-white/15 rounded-lg p-3 space-y-2">
                <div>
                  <label className="block text-xs text-white/80 mb-1">פייפליין</label>
                  <select
                    value={triggerConfig.pipeline_id || ''}
                    onChange={(e) => { setTriggerConfig((p) => ({ ...p, pipeline_id: e.target.value, column_id: '' })); setDirty(true) }}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1.5 text-sm text-white placeholder:text-white/50 outline-none"
                  >
                    <option value="" className="text-slate-900">כל הפייפליינים</option>
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>
                    ))}
                  </select>
                </div>
                {workflow.trigger_type === 'column_change' && (
                  <div>
                    <label className="block text-xs text-white/80 mb-1">עמודה יעד</label>
                    <select
                      value={triggerConfig.column_id || ''}
                      onChange={(e) => { setTriggerConfig((p) => ({ ...p, column_id: e.target.value })); setDirty(true) }}
                      className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
                    >
                      <option value="" className="text-slate-900">כל העמודות</option>
                      {filteredCols.map((c) => (
                        <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center my-1">
              <div className="w-px h-6 bg-slate-300" />
              <ArrowDown size={16} className="text-slate-400 -mt-1" />
            </div>

            {/* Add first step button */}
            {steps.length === 0 && (
              <div className="relative w-full">
                <button
                  onClick={() => setShowAddStep(-1)}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <Plus size={24} />
                  <span className="text-sm font-medium">הוסף פעולה ראשונה</span>
                </button>
                {showAddStep === -1 && (
                  <ActionPicker onSelect={(t) => addStep(t, -1)} onClose={() => setShowAddStep(null)} />
                )}
              </div>
            )}

            {/* ── Steps flow ── */}
            {steps.map((step, i) => {
              const colors = ACTION_COLORS[step.action_type]
              return (
                <div key={step.id} className="w-full">
                  {/* Step block */}
                  <div
                    className={`w-full ${colors.bg} border ${colors.border} rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow relative group`}
                    onClick={() => setEditingStep(step)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text}`}>
                          {ACTION_ICON_MAP[step.action_type]}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${colors.text}`}>
                            {ACTION_LABELS[step.action_type]}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {getStepSummary(step)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); removeStep(i) }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Arrow + add button */}
                  <div className="flex flex-col items-center my-1 relative">
                    <div className="w-px h-4 bg-slate-300" />
                    <button
                      onClick={() => setShowAddStep(i)}
                      className="w-7 h-7 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors z-10"
                    >
                      <Plus size={14} />
                    </button>
                    <div className="w-px h-4 bg-slate-300" />
                    {showAddStep === i && (
                      <ActionPicker onSelect={(t) => addStep(t, i)} onClose={() => setShowAddStep(null)} />
                    )}
                  </div>
                </div>
              )
            })}

            {/* End block */}
            {steps.length > 0 && (
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-sm text-slate-500 font-medium">סיום Workflow</span>
              </div>
            )}
          </div>

          {/* Logs panel — side */}
          {showLogs && (
            <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 h-fit max-h-[calc(100vh-150px)] overflow-y-auto">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <ScrollText size={16} className="text-blue-600" />
                לוג הרצות
              </h3>
              {logs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">אין הרצות עדיין</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                      log.status === 'completed' ? 'bg-green-50' :
                      log.status === 'failed' ? 'bg-red-50' :
                      log.status === 'waiting' ? 'bg-amber-50' :
                      log.status === 'stopped' ? 'bg-slate-50' :
                      'bg-blue-50'
                    }`}>
                      {log.status === 'completed' && <CheckCircle size={13} className="text-green-500 mt-0.5 flex-shrink-0" />}
                      {log.status === 'failed' && <XCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />}
                      {log.status === 'waiting' && <Clock size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />}
                      {log.status === 'running' && <RefreshCw size={13} className="text-blue-500 mt-0.5 flex-shrink-0 animate-spin" />}
                      {log.status === 'stopped' && <StopCircle size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 leading-relaxed">{log.details}</p>
                        <p className="text-slate-400 mt-0.5">
                          {new Date(log.executed_at).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step config drawer */}
      {editingStep && (
        <StepConfigDrawer
          step={editingStep}
          onSave={updateStep}
          onClose={() => setEditingStep(null)}
        />
      )}
    </div>
  )
}

function getStepSummary(step: WorkflowStep): string {
  const c = step.action_config as Record<string, string>
  switch (step.action_type) {
    case 'add_tag': return c.tag ? `תג: "${c.tag}"` : 'לחץ להגדרה'
    case 'send_whatsapp': return c.message ? `"${c.message.substring(0, 40)}..."` : 'לחץ להגדרה'
    case 'wait': {
      const m = step.wait_duration || 0
      if (m < 60) return `${m} דקות`
      if (m < 1440) return `${Math.round(m / 60)} שעות`
      return `${Math.round(m / 1440)} ימים`
    }
    case 'send_email': return c.subject ? `נושא: "${c.subject}"` : 'לחץ להגדרה'
    case 'create_reminder': return c.text ? `"${c.text.substring(0, 40)}..."` : 'לחץ להגדרה'
    case 'create_contact': return 'שמירה אוטומטית של הליד'
    case 'stop_previous': return 'עצירת workflows קודמים'
    default: return 'לחץ להגדרה'
  }
}

function ActionPicker({ onSelect, onClose }: { onSelect: (t: ActionType) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute top-full mt-2 z-40 bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-64 animate-fade-in">
        <p className="text-xs font-semibold text-slate-400 px-2 py-1 mb-1">בחר פעולה</p>
        {AVAILABLE_ACTIONS.map((type) => {
          const colors = ACTION_COLORS[type]
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors text-right`}
            >
              <div className={`w-7 h-7 rounded-md ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0`}>
                {ACTION_ICON_MAP[type]}
              </div>
              <span className="text-slate-700 font-medium">{ACTION_LABELS[type]}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
