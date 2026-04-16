'use client'

import { useState } from 'react'
import { Pipeline, PipelineColumn } from '@/lib/types'
import { X, Webhook, Plus } from 'lucide-react'

interface Props {
  pipelines: Pipeline[]
  columns: PipelineColumn[]
  onCreate: (name: string, pipelineId: string, columnId: string) => void
  onClose: () => void
}

export default function CreateWebhookModal({ pipelines, columns, onCreate, onClose }: Props) {
  const [name, setName] = useState('')
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id || '')
  const [columnId, setColumnId] = useState('')

  const filteredColumns = columns.filter((c) => c.pipeline_id === pipelineId)

  // Auto-select first column when pipeline changes
  const handlePipelineChange = (id: string) => {
    setPipelineId(id)
    const firstCol = columns.find((c) => c.pipeline_id === id)
    setColumnId(firstCol?.id || '')
  }

  // Set initial column
  if (!columnId && filteredColumns.length > 0) {
    setColumnId(filteredColumns[0].id)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !pipelineId || !columnId) return
    onCreate(name.trim(), pipelineId, columnId)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Webhook size={18} className="text-blue-600" />
            </div>
            <h2 className="font-bold text-slate-900">Webhook חדש</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">שם ה-Webhook *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='לדוגמה: "טופס דף נחיתה", "Facebook Leads"'
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Pipeline */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">פייפליין יעד *</label>
            <select
              value={pipelineId}
              onChange={(e) => handlePipelineChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Column */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">עמודה יעד (שלב) *</label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filteredColumns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {filteredColumns.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">אין עמודות בפייפליין זה. צור עמודות תחילה.</p>
            )}
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
            <p className="font-semibold mb-1">איך זה עובד?</p>
            <p>
              לאחר היצירה תקבל כתובת URL ייחודית. שלח בקשת POST עם JSON שמכיל
              לפחות שדה <code className="bg-blue-100 px-1 rounded">name</code>.
              שדות אופציונליים: phone, email, source, notes, value.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !pipelineId || !columnId}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={15} />
              צור Webhook
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
