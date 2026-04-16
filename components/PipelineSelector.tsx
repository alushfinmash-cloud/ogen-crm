'use client'

import { useState, useRef } from 'react'
import { Pipeline, COLUMN_COLORS } from '@/lib/types'
import {
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  GitBranchPlus,
} from 'lucide-react'

interface Props {
  pipelines: Pipeline[]
  activePipelineId: string | null
  onSelect: (id: string) => void
  onAdd: (name: string, color: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export default function PipelineSelector({
  pipelines,
  activePipelineId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLUMN_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  const active = pipelines.find((p) => p.id === activePipelineId)

  const handleAdd = () => {
    if (!newName.trim()) return
    onAdd(newName.trim(), newColor)
    setNewName('')
    setNewColor(COLUMN_COLORS[0])
    setIsAdding(false)
  }

  const handleRenameStart = (p: Pipeline) => {
    setEditingId(p.id)
    setEditName(p.name)
    setTimeout(() => editRef.current?.focus(), 50)
  }

  const handleRenameConfirm = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim())
    }
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    if (pipelines.length <= 1) {
      alert('חייב להישאר לפחות פייפליין אחד.')
      return
    }
    if (!confirm('האם אתה בטוח? כל העמודות והלידים בפייפליין זה יימחקו.')) return
    onDelete(id)
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        {active && (
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: active.color }} />
        )}
        <span className="text-xl font-bold text-slate-900">{active?.name || 'בחר פייפליין'}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => { setIsOpen(false); setIsAdding(false); setEditingId(null) }} />
          <div className="absolute top-full mt-1 start-0 bg-white border border-slate-200 rounded-xl shadow-xl z-30 w-72 animate-fade-in">
            <div className="p-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 px-2 py-1">הפייפליינים שלך</p>
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              {pipelines.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
                    p.id === activePipelineId ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        ref={editRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameConfirm()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 text-sm bg-white border border-blue-400 rounded px-2 py-0.5 outline-none"
                      />
                      <button onClick={handleRenameConfirm} className="p-0.5 text-green-600 hover:bg-green-100 rounded">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-0.5 text-slate-400 hover:bg-slate-200 rounded">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color }}
                        onClick={() => { onSelect(p.id); setIsOpen(false) }}
                      />
                      <span
                        className={`flex-1 text-sm font-medium truncate ${
                          p.id === activePipelineId ? 'text-blue-700' : 'text-slate-700'
                        }`}
                        onClick={() => { onSelect(p.id); setIsOpen(false) }}
                      >
                        {p.name}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRenameStart(p) }}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 hover:!opacity-100"
                        style={{ opacity: 0.5 }}
                        title="שנה שם"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        style={{ opacity: 0.5 }}
                        title="מחק"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add new pipeline */}
            <div className="border-t border-slate-100 p-2">
              {isAdding ? (
                <div className="space-y-2 p-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd()
                      if (e.key === 'Escape') setIsAdding(false)
                    }}
                    placeholder="שם הפייפליין..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-1.5">
                    {COLUMN_COLORS.slice(0, 6).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          newColor === c ? 'border-slate-700 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={!newName.trim()}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      צור
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  <GitBranchPlus size={15} />
                  פייפליין חדש
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
