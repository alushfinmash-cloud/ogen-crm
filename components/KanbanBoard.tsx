'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { supabase } from '@/lib/supabase'
import { Lead, Pipeline, PipelineColumn } from '@/lib/types'
import KanbanColumn from './KanbanColumn'
import LeadCard from './LeadCard'
import LeadModal from './LeadModal'
import AddColumnModal from './AddColumnModal'
import PipelineSelector from './PipelineSelector'
import { Plus, RefreshCw, TrendingUp, Users } from 'lucide-react'

export default function KanbanBoard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null)
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [newLeadColumnId, setNewLeadColumnId] = useState<string | null>(null)
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [leadScores, setLeadScores] = useState<Record<string, number>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Load pipelines on mount
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('pipelines').select('*').order('created_at')
      if (error) {
        console.error('Error loading pipelines:', error.message)
      } else if (data && data.length > 0) {
        setPipelines(data)
        setActivePipelineId(data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Load columns + leads when active pipeline changes
  const loadPipelineData = useCallback(async () => {
    if (!activePipelineId) return
    const [{ data: cols }, { data: leds }] = await Promise.all([
      supabase.from('pipeline_columns').select('*').eq('pipeline_id', activePipelineId).order('position'),
      supabase.from('leads').select('*').order('position'),
    ])
    if (cols) {
      setColumns(cols)
      // Only keep leads belonging to this pipeline's columns
      const colIds = new Set(cols.map((c) => c.id))
      if (leds) setLeads(leds.filter((l) => colIds.has(l.column_id)))
      else setLeads([])
    } else {
      setColumns([])
      setLeads([])
    }
  }, [activePipelineId])

  useEffect(() => {
    if (activePipelineId) loadPipelineData()
  }, [activePipelineId, loadPipelineData])

  // Load lead scores
  useEffect(() => {
    const loadScores = async () => {
      try {
        const res = await fetch('/api/scoring')
        if (res.ok) {
          const data = await res.json()
          const map: Record<string, number> = {}
          if (Array.isArray(data)) {
            data.forEach((s: { lead_id: string; current_score: number }) => {
              map[s.lead_id] = s.current_score
            })
          }
          setLeadScores(map)
        }
      } catch {
        // silent
      }
    }
    loadScores()
  }, [leads.length])

  // ── Pipeline CRUD ──────────────────────────
  const handlePipelineAdd = async (name: string, color: string) => {
    const { data } = await supabase.from('pipelines').insert({ name, color }).select().single()
    if (data) {
      setPipelines((prev) => [...prev, data])
      setActivePipelineId(data.id)
    }
  }

  const handlePipelineRename = async (id: string, name: string) => {
    await supabase.from('pipelines').update({ name }).eq('id', id)
    setPipelines((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  const handlePipelineDelete = async (id: string) => {
    // cascade will remove columns (and restrict on leads will block if leads exist)
    const pipelineCols = columns.filter((c) => c.pipeline_id === id)
    const pipelineColIds = new Set(pipelineCols.map((c) => c.id))
    const pipelineLeads = leads.filter((l) => pipelineColIds.has(l.column_id))
    if (pipelineLeads.length > 0) {
      alert('לא ניתן למחוק פייפליין עם לידים. מחק את הלידים תחילה.')
      return
    }
    await supabase.from('pipeline_columns').delete().eq('pipeline_id', id)
    await supabase.from('pipelines').delete().eq('id', id)
    setPipelines((prev) => {
      const remaining = prev.filter((p) => p.id !== id)
      if (activePipelineId === id && remaining.length > 0) {
        setActivePipelineId(remaining[0].id)
      }
      return remaining
    })
  }

  // ── DnD handlers ───────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveLeadId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    const activeLead = leads.find((l) => l.id === activeId)
    if (!activeLead) return

    const overColumn = columns.find((c) => c.id === overId)
    const overLead = leads.find((l) => l.id === overId)
    const targetColumnId = overColumn?.id ?? overLead?.column_id

    if (targetColumnId && activeLead.column_id !== targetColumnId) {
      setLeads((prev) =>
        prev.map((l) => (l.id === activeId ? { ...l, column_id: targetColumnId } : l))
      )
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLeadId(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const activeLead = leads.find((l) => l.id === activeId)
    if (!activeLead) return

    if (activeId !== overId) {
      const overLead = leads.find((l) => l.id === overId)
      if (overLead && overLead.column_id === activeLead.column_id) {
        const columnLeads = leads.filter((l) => l.column_id === activeLead.column_id)
        const oldIndex = columnLeads.findIndex((l) => l.id === activeId)
        const newIndex = columnLeads.findIndex((l) => l.id === overId)
        const reordered = arrayMove(columnLeads, oldIndex, newIndex)
        setLeads((prev) => {
          const others = prev.filter((l) => l.column_id !== activeLead.column_id)
          return [...others, ...reordered]
        })
      }
    }

    const targetColumnName = columns.find((c) => c.id === activeLead.column_id)?.name ?? ''
    await supabase
      .from('leads')
      .update({ column_id: activeLead.column_id, updated_at: new Date().toISOString() })
      .eq('id', activeId)

    await supabase.from('lead_history').insert({
      lead_id: activeId,
      action: 'column_change',
      description: `הועבר לעמודה: ${targetColumnName}`,
      user_name: 'מנהל המערכת',
    })

    // Trigger column_change workflows
    fetch('/api/workflows/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger_type: 'column_change',
        lead: activeLead,
        meta: { pipeline_id: activePipelineId, column_id: activeLead.column_id },
      }),
    }).catch(() => {})
  }

  // ── Lead CRUD ──────────────────────────────
  const handleAddLead = (columnId: string) => {
    setSelectedLead(null)
    setNewLeadColumnId(columnId)
    setIsLeadModalOpen(true)
  }

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead)
    setNewLeadColumnId(null)
    setIsLeadModalOpen(true)
  }

  const handleLeadSave = async (data: Partial<Lead>) => {
    if (selectedLead) {
      const { data: updated } = await supabase
        .from('leads')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', selectedLead.id)
        .select()
        .single()
      if (updated) {
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updated : l)))
        await supabase.from('lead_history').insert({
          lead_id: selectedLead.id,
          action: 'update',
          description: 'פרטי הליד עודכנו',
          user_name: 'מנהל המערכת',
        })
      }
    } else {
      const colLeads = leads.filter((l) => l.column_id === newLeadColumnId)
      const { data: created } = await supabase
        .from('leads')
        .insert({ ...data, column_id: newLeadColumnId, position: colLeads.length, status: data.status || 'חדש' })
        .select()
        .single()
      if (created) {
        setLeads((prev) => [...prev, created])
        await supabase.from('lead_history').insert({
          lead_id: created.id,
          action: 'create',
          description: 'ליד נוצר במערכת',
          user_name: 'מנהל המערכת',
        })
      }
    }
    setIsLeadModalOpen(false)
  }

  const handleLeadDelete = async (leadId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק ליד זה?')) return
    await supabase.from('lead_history').delete().eq('lead_id', leadId)
    await supabase.from('leads').delete().eq('id', leadId)
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    setIsLeadModalOpen(false)
  }

  // ── Column CRUD ────────────────────────────
  const handleColumnAdd = async (name: string, color: string) => {
    const { data } = await supabase
      .from('pipeline_columns')
      .insert({ name, color, position: columns.length, pipeline_id: activePipelineId })
      .select()
      .single()
    if (data) setColumns((prev) => [...prev, data])
    setIsAddColumnOpen(false)
  }

  const handleColumnDelete = async (columnId: string) => {
    const colLeads = leads.filter((l) => l.column_id === columnId)
    if (colLeads.length > 0) {
      alert('לא ניתן למחוק עמודה עם לידים. העבר אותם תחילה.')
      return
    }
    await supabase.from('pipeline_columns').delete().eq('id', columnId)
    setColumns((prev) => prev.filter((c) => c.id !== columnId))
  }

  const handleColumnRename = async (columnId: string, newName: string) => {
    await supabase.from('pipeline_columns').update({ name: newName }).eq('id', columnId)
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name: newName } : c)))
  }

  const activeLead = activeLeadId ? leads.find((l) => l.id === activeLeadId) : null
  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="text-blue-500 animate-spin" />
          <p className="text-slate-500">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <PipelineSelector
            pipelines={pipelines}
            activePipelineId={activePipelineId}
            onSelect={setActivePipelineId}
            onAdd={handlePipelineAdd}
            onRename={handlePipelineRename}
            onDelete={handlePipelineDelete}
          />
          <div className="flex items-center gap-4 mt-1 ps-3">
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Users size={14} />
              {leads.length} לידים
            </span>
            {totalValue > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <TrendingUp size={14} />
                ₪{totalValue.toLocaleString()} פוטנציאל
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsAddColumnOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus size={16} />
          הוסף עמודה
        </button>
      </header>

      {/* Kanban area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full p-5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  leads={leads.filter((l) => l.column_id === col.id)}
                  leadScores={leadScores}
                  onAddLead={() => handleAddLead(col.id)}
                  onEditLead={handleEditLead}
                  onDeleteColumn={() => handleColumnDelete(col.id)}
                  onRenameColumn={(name) => handleColumnRename(col.id, name)}
                />
              ))}

              {columns.length === 0 && (
                <div className="flex flex-col items-center justify-center w-full text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">אין עמודות עדיין</h3>
                  <p className="text-slate-500 text-sm mb-4">הוסף את עמודת הפייפליין הראשונה שלך</p>
                  <button
                    onClick={() => setIsAddColumnOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus size={16} />
                    הוסף עמודה
                  </button>
                </div>
              )}
            </div>

            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
              {activeLead && <LeadCard lead={activeLead} isDragging score={leadScores[activeLead.id]} />}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Modals */}
      {isLeadModalOpen && (
        <LeadModal
          lead={selectedLead}
          columnId={newLeadColumnId}
          columns={columns}
          onSave={handleLeadSave}
          onDelete={handleLeadDelete}
          onClose={() => setIsLeadModalOpen(false)}
        />
      )}

      {isAddColumnOpen && (
        <AddColumnModal onAdd={handleColumnAdd} onClose={() => setIsAddColumnOpen(false)} />
      )}
    </div>
  )
}
