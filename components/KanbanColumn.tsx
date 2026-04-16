'use client'

import { useState, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Lead, PipelineColumn } from '@/lib/types'
import LeadCard from './LeadCard'
import { Plus, MoreVertical, Trash2, Pencil, Check, X } from 'lucide-react'

interface Props {
  column: PipelineColumn
  leads: Lead[]
  leadScores?: Record<string, number>
  onAddLead: () => void
  onEditLead: (lead: Lead) => void
  onDeleteColumn: () => void
  onRenameColumn: (name: string) => void
}

export default function KanbanColumn({
  column,
  leads,
  leadScores,
  onAddLead,
  onEditLead,
  onDeleteColumn,
  onRenameColumn,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.name)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const handleRenameStart = () => {
    setRenameValue(column.name)
    setIsRenaming(true)
    setShowMenu(false)
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  const handleRenameConfirm = () => {
    if (renameValue.trim() && renameValue.trim() !== column.name) {
      onRenameColumn(renameValue.trim())
    }
    setIsRenaming(false)
  }

  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0)

  return (
    <div
      className={`flex flex-col w-72 rounded-xl border transition-colors flex-shrink-0 ${
        isOver
          ? 'border-blue-400 bg-blue-50/80'
          : 'border-slate-200 bg-slate-100/80'
      }`}
      style={{ height: 'calc(100vh - 140px)' }}
    >
      {/* Column Header */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: column.color }}
            />
            {isRenaming ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameConfirm()
                    if (e.key === 'Escape') setIsRenaming(false)
                  }}
                  className="flex-1 text-sm font-semibold bg-white border border-blue-400 rounded px-2 py-0.5 outline-none"
                />
                <button onClick={handleRenameConfirm} className="p-0.5 text-green-600 hover:bg-green-100 rounded">
                  <Check size={14} />
                </button>
                <button onClick={() => setIsRenaming(false)} className="p-0.5 text-slate-400 hover:bg-slate-200 rounded">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <span className="font-semibold text-slate-800 text-sm truncate">{column.name}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ms-2">
            <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {leads.length}
            </span>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-slate-200 rounded-md transition-colors"
              >
                <MoreVertical size={15} className="text-slate-400" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute left-0 top-7 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 w-44 animate-fade-in">
                    <button
                      onClick={handleRenameStart}
                      className="w-full px-3 py-2 text-right text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Pencil size={14} className="text-slate-400" />
                      שנה שם
                    </button>
                    <hr className="my-1 border-slate-100" />
                    <button
                      onClick={() => { onDeleteColumn(); setShowMenu(false) }}
                      className="w-full px-3 py-2 text-right text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      מחק עמודה
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Total value bar */}
        {totalValue > 0 && (
          <p className="text-xs text-emerald-600 font-medium mt-1 pe-1">
            ₪{totalValue.toLocaleString()} סה״כ
          </p>
        )}
      </div>

      {/* Lead cards */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 kanban-column-scroll"
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} score={leadScores?.[lead.id]} onClick={() => onEditLead(lead)} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="text-3xl mb-2 opacity-40">📂</div>
            <p className="text-xs text-slate-400">גרור לידים לכאן</p>
          </div>
        )}
      </div>

      {/* Add lead button */}
      <div className="px-2 pb-2 flex-shrink-0">
        <button
          onClick={onAddLead}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-dashed border-slate-300 hover:border-blue-400 transition-all"
        >
          <Plus size={14} />
          הוסף ליד
        </button>
      </div>
    </div>
  )
}
