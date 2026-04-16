'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Trash2,
  Save,
  User,
  Phone,
  Mail,
  Tag,
  Clock,
  MessageCircle,
  CheckSquare,
  StickyNote,
  Plus,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { Contact, ContactNote } from '@/lib/contact-types'
import { Task, PRIORITY_COLORS, STATUS_COLORS as TASK_STATUS_COLORS, isOverdue } from '@/lib/task-types'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface Props {
  contact: Contact | null
  onSave: () => void
  onDelete: (id: string) => void
  onClose: () => void
}

type Tab = 'details' | 'leads' | 'tasks' | 'notes'

interface LinkedLead {
  id: string
  name: string
  phone: string
  status: string
  source: string
  created_at: string
}

export default function ContactModal({ contact, onSave, onDelete, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('details')
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState(contact?.first_name || '')
  const [lastName, setLastName] = useState(contact?.last_name || '')
  const [phone, setPhone] = useState(contact?.phone || '')
  const [email, setEmail] = useState(contact?.email || '')
  const [tags, setTags] = useState<string[]>(contact?.tags || [])
  const [tagInput, setTagInput] = useState('')

  // Related data
  const [leads, setLeads] = useState<LinkedLead[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    if (contact) {
      // Load leads by phone
      fetch(`/api/contacts/related?phone=${encodeURIComponent(contact.phone)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.leads) setLeads(data.leads)
          if (data.tasks) setTasks(data.tasks)
        })
        .catch(() => {})

      // Load notes
      fetch(`/api/contacts/notes?contact_id=${contact.id}`)
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setNotes(data) })
        .catch(() => {})
    }
  }, [contact])

  const handleSave = async () => {
    if (!firstName.trim() || !phone.trim()) return
    setSaving(true)

    if (contact) {
      await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact.id,
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          email: email.trim() || null,
          tags,
        }),
      })
    } else {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          phone: phone.trim(),
          email: email.trim() || null,
          tags,
        }),
      })
    }

    setSaving(false)
    onSave()
  }

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  const handleAddNote = async () => {
    if (!contact || !newNote.trim()) return
    setAddingNote(true)
    const res = await fetch('/api/contacts/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contact.id, content: newNote.trim() }),
    })
    const note = await res.json()
    if (note?.id) setNotes((prev) => [note, ...prev])
    setNewNote('')
    setAddingNote(false)
  }

  const handleDeleteNote = async (noteId: string) => {
    await fetch(`/api/contacts/notes?id=${noteId}`, { method: 'DELETE' })
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  const fullName = `${firstName} ${lastName}`.trim()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {firstName ? firstName.slice(0, 2) : <User size={20} />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">
                {contact ? fullName : 'איש קשר חדש'}
              </h2>
              {contact && (
                <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{contact.phone}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {contact && (
              <button
                onClick={() => { if (confirm('האם למחוק?')) onDelete(contact.id) }}
                className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Quick actions */}
        {contact && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
              <Phone size={13} /> התקשר
            </a>
            <a href={`https://wa.me/972${contact.phone.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
              <MessageCircle size={13} /> WhatsApp
            </a>
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                <Mail size={13} /> מייל
              </a>
            )}
          </div>
        )}

        {/* Tabs */}
        {contact && (
          <div className="flex border-b border-slate-200 px-5 flex-shrink-0">
            {([
              { key: 'details' as Tab, label: 'פרטים' },
              { key: 'leads' as Tab, label: `לידים (${leads.length})` },
              { key: 'tasks' as Tab, label: `משימות (${tasks.length})` },
              { key: 'notes' as Tab, label: `הערות (${notes.length})` },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`py-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Details tab */}
          {(!contact || tab === 'details') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">שם פרטי *</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="ישראל"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">שם משפחה</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="ישראלי"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">טלפון *</label>
                  <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000"
                    disabled={!!contact}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">דוא"ל</label>
                  <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">תגיות</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((t) => (
                    <span key={t} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                      {t}
                      <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="הוסף תגית..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button onClick={handleAddTag} className="px-3 py-1.5 bg-indigo-100 text-indigo-600 text-sm rounded-lg hover:bg-indigo-200">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Leads tab */}
          {contact && tab === 'leads' && (
            <div>
              {leads.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <User size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">אין לידים מקושרים</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{lead.name}</p>
                        <p className="text-xs text-slate-400">{lead.source} · {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: he })}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{lead.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasks tab */}
          {contact && tab === 'tasks' && (
            <div>
              {tasks.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">אין משימות מקושרות</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const overdue = isOverdue(task)
                    const pColor = PRIORITY_COLORS[task.priority]
                    const sColor = TASK_STATUS_COLORS[task.status]
                    return (
                      <div key={task.id} className={`border rounded-lg px-3 py-2.5 ${overdue ? 'border-red-200 bg-red-50/50' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pColor.dot}`} />
                          <p className={`text-sm font-medium flex-1 ${task.status === 'הושלמה' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sColor.bg} ${sColor.text}`}>{task.status}</span>
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

          {/* Notes tab */}
          {contact && tab === 'notes' && (
            <div>
              <div className="flex gap-2 mb-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="הוסף הערה..."
                  rows={2}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingNote}
                  className="self-end px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm rounded-lg transition-colors"
                >
                  {addingNote ? '...' : 'הוסף'}
                </button>
              </div>
              {notes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <StickyNote size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">אין הערות עדיין</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400">
                          {note.created_by} · {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                        </span>
                        <button onClick={() => handleDeleteNote(note.id)} className="text-xs text-slate-400 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(!contact || tab === 'details') && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !firstName.trim() || !phone.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save size={15} />
              {saving ? 'שומר...' : contact ? 'שמור שינויים' : 'צור איש קשר'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
