'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckSquare,
  Plus,
  Filter,
  AlertTriangle,
  Clock,
  RefreshCw,
  Calendar,
  User,
  Flag,
  Trash2,
  Edit3,
  ChevronDown,
  X,
  Link2,
} from 'lucide-react'
import { Task, TaskPriority, TaskStatus, PRIORITIES, STATUSES, PRIORITY_COLORS, STATUS_COLORS, ASSIGNEES, isOverdue, isDueToday } from '@/lib/task-types'
import CreateTaskModal from './CreateTaskModal'
import { format, formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

type FilterType = 'all' | 'overdue' | 'today' | TaskStatus

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (priorityFilter) params.set('priority', priorityFilter)
    if (assigneeFilter) params.set('assigned_to', assigneeFilter)
    // Status filter handled client-side for overdue/today
    if (activeFilter !== 'all' && activeFilter !== 'overdue' && activeFilter !== 'today') {
      params.set('status', activeFilter)
    }

    const res = await fetch(`/api/tasks?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) setTasks(data)
    setLoading(false)
  }, [priorityFilter, assigneeFilter, activeFilter])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleDelete = async (id: string) => {
    if (!confirm('האם למחוק את המשימה?')) return
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: newStatus }),
    })
    const updated = await res.json()
    if (updated?.id) {
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    }
  }

  const handleSave = async (data: Partial<Task>) => {
    if (editingTask) {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTask.id, ...data }),
      })
      const updated = await res.json()
      if (updated?.id) {
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      }
    } else {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const created = await res.json()
      if (created?.id) {
        setTasks((prev) => [created, ...prev])
      }
    }
    setIsCreateOpen(false)
    setEditingTask(null)
  }

  // Apply client-side filters
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'overdue') return isOverdue(t)
    if (activeFilter === 'today') return isDueToday(t)
    return true
  })

  const overdueCount = tasks.filter(isOverdue).length
  const todayCount = tasks.filter(isDueToday).length
  const openCount = tasks.filter((t) => t.status === 'פתוחה' || t.status === 'בטיפול').length

  const FILTER_TABS: { key: FilterType; label: string; count?: number; color?: string }[] = [
    { key: 'all', label: 'הכל', count: tasks.length },
    { key: 'overdue', label: 'באיחור', count: overdueCount, color: 'text-red-600' },
    { key: 'today', label: 'היום', count: todayCount, color: 'text-amber-600' },
    { key: 'פתוחה', label: 'פתוחות' },
    { key: 'בטיפול', label: 'בטיפול' },
    { key: 'הושלמה', label: 'הושלמו' },
    { key: 'בוטלה', label: 'בוטלו' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="text-blue-500 animate-spin" />
          <p className="text-slate-500">טוען משימות...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Notification Banner */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm font-medium">
            יש לך {overdueCount} משימות באיחור שדורשות טיפול מיידי
          </p>
          <button
            onClick={() => setActiveFilter('overdue')}
            className="ms-auto text-red-600 text-sm font-medium hover:underline"
          >
            הצג
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CheckSquare size={22} className="text-blue-600" />
              ניהול משימות
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {openCount} משימות פתוחות
              {todayCount > 0 && ` · ${todayCount} להיום`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={15} />
              סינון
            </button>
            <button
              onClick={() => { setEditingTask(null); setIsCreateOpen(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus size={16} />
              משימה חדשה
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap ${
                activeFilter === tab.key
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className={tab.color}>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`ms-1.5 text-xs ${activeFilter === tab.key ? 'text-blue-500' : 'text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Flag size={14} className="text-slate-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
                className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">כל העדיפויות</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <User size={14} className="text-slate-400" />
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">כל האחראים</option>
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            {(priorityFilter || assigneeFilter) && (
              <button
                onClick={() => { setPriorityFilter(''); setAssigneeFilter('') }}
                className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <X size={14} />
                נקה
              </button>
            )}
          </div>
        )}
      </header>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckSquare size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-1">אין משימות</h3>
            <p className="text-slate-400 text-sm mb-4">
              {activeFilter === 'overdue' ? 'אין משימות באיחור' :
               activeFilter === 'today' ? 'אין משימות להיום' :
               'צור משימה חדשה כדי להתחיל'}
            </p>
            {activeFilter === 'all' && (
              <button
                onClick={() => { setEditingTask(null); setIsCreateOpen(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus size={16} />
                משימה חדשה
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl">
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onEdit={() => { setEditingTask(task); setIsCreateOpen(true) }}
                onDelete={() => handleDelete(task.id)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isCreateOpen && (
        <CreateTaskModal
          task={editingTask}
          onSave={handleSave}
          onClose={() => { setIsCreateOpen(false); setEditingTask(null) }}
        />
      )}
    </div>
  )
}

function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (task: Task, status: TaskStatus) => void
}) {
  const [statusOpen, setStatusOpen] = useState(false)
  const overdue = isOverdue(task)
  const today = isDueToday(task)
  const priority = PRIORITY_COLORS[task.priority]
  const status = STATUS_COLORS[task.status]
  const done = task.status === 'הושלמה' || task.status === 'בוטלה'

  return (
    <div
      className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-4 transition-all hover:shadow-sm ${
        overdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
      } ${done ? 'opacity-60' : ''}`}
    >
      {/* Priority dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priority.dot}`} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {task.title}
          </p>
          {task.leads && (
            <span className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
              <Link2 size={10} />
              {task.leads.name}
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {task.due_date && (
            <span className={`flex items-center gap-1 text-xs ${
              overdue ? 'text-red-500 font-medium' : today ? 'text-amber-500' : 'text-slate-400'
            }`}>
              {overdue && <AlertTriangle size={11} />}
              {today && <Clock size={11} />}
              {!overdue && !today && <Calendar size={11} />}
              {overdue
                ? `באיחור — ${formatDistanceToNow(new Date(task.due_date), { locale: he, addSuffix: false })}`
                : today
                ? 'היום'
                : format(new Date(task.due_date), 'dd/MM/yyyy HH:mm')}
            </span>
          )}
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <User size={11} />
            {task.assigned_to}
          </span>
        </div>
      </div>

      {/* Priority badge */}
      <span className={`text-xs px-2 py-0.5 rounded-full ${priority.bg} ${priority.text} flex-shrink-0`}>
        {task.priority}
      </span>

      {/* Status dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setStatusOpen(!statusOpen)}
          className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${status.bg} ${status.text}`}
        >
          {task.status}
          <ChevronDown size={12} />
        </button>
        {statusOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
            <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(task, s); setStatusOpen(false) }}
                  className={`w-full text-start px-3 py-1.5 text-sm hover:bg-slate-50 ${
                    task.status === s ? 'font-medium text-blue-600' : 'text-slate-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">
          <Edit3 size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
