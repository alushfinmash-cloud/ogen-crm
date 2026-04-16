'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Plus,
  Search,
  Upload,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Contact, SOURCE_LABELS } from '@/lib/contact-types'
import ContactModal from './ContactModal'
import ImportContacts from './ImportContacts'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

type SortField = 'first_name' | 'last_name' | 'email' | 'phone' | 'created_at'

export default function ContactList() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewContact, setIsNewContact] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [allTags, setAllTags] = useState<string[]>([])
  const limit = 1000

  const loadContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort_by: sortBy,
      sort_dir: sortDir,
    })
    if (search) params.set('search', search)
    if (tagFilter) params.set('tag', tagFilter)

    const res = await fetch(`/api/contacts?${params}`)
    const json = await res.json()
    if (json.data) {
      setContacts(json.data)
      setTotal(json.total)
      // Collect all unique tags
      const tags = new Set<string>()
      json.data.forEach((c: Contact) => c.tags?.forEach((t: string) => tags.add(t)))
      setAllTags((prev) => {
        const merged = new Set(prev)
        tags.forEach((t) => merged.add(t))
        return Array.from(merged).sort()
      })
    }
    setLoading(false)
  }, [page, sortBy, sortDir, search, tagFilter])

  useEffect(() => {
    const timer = setTimeout(loadContacts, 300)
    return () => clearTimeout(timer)
  }, [loadContacts])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const handleExport = async () => {
    const params = new URLSearchParams()
    if (tagFilter) params.set('tag', tagFilter)
    const res = await fetch(`/api/contacts/export?${params}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleContactSaved = () => {
    setIsModalOpen(false)
    setSelectedContact(null)
    setIsNewContact(false)
    loadContacts()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
    setIsModalOpen(false)
    setSelectedContact(null)
    loadContacts()
  }

  const totalPages = Math.ceil(total / limit)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  if (showImport) {
    return <ImportContacts onClose={() => { setShowImport(false); loadContacts() }} />
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users size={22} className="text-indigo-600" />
              אנשי קשר
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} אנשי קשר</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download size={15} />
              יצוא
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Upload size={15} />
              ייבוא
            </button>
            <button
              onClick={() => { setSelectedContact(null); setIsNewContact(true); setIsModalOpen(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus size={16} />
              איש קשר חדש
            </button>
          </div>
        </div>

        {/* Search + Tag filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="חיפוש לפי שם, טלפון או מייל..."
              className="w-full ps-9 pe-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-slate-400" />
            <select
              value={tagFilter}
              onChange={(e) => { setTagFilter(e.target.value); setPage(1) }}
              className="text-sm border border-slate-200 rounded-lg px-2 py-2 bg-white"
            >
              <option value="">כל התגיות</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {tagFilter && (
              <button onClick={() => setTagFilter('')} className="text-sm text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={28} className="text-indigo-500 animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Users size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-1">אין אנשי קשר</h3>
            <p className="text-slate-400 text-sm mb-4">
              {search || tagFilter ? 'לא נמצאו תוצאות' : 'צור איש קשר חדש או ייבא מאקסל'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {[
                  { field: 'first_name' as SortField, label: 'שם פרטי' },
                  { field: 'last_name' as SortField, label: 'שם משפחה' },
                  { field: 'email' as SortField, label: 'דוא"ל' },
                  { field: 'phone' as SortField, label: 'טלפון' },
                  { field: null, label: 'תגיות' },
                  { field: 'created_at' as SortField, label: 'נוצר ב' },
                ].map((col) => (
                  <th
                    key={col.label}
                    onClick={() => col.field && handleSort(col.field)}
                    className={`px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase ${
                      col.field ? 'cursor-pointer hover:text-slate-700 select-none' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => { setSelectedContact(contact); setIsNewContact(false); setIsModalOpen(true) }}
                  className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{contact.first_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{contact.last_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500" dir="ltr">{contact.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500" dir="ltr">{contact.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {contact.tags?.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {contact.tags?.length > 3 && (
                        <span className="text-xs text-slate-400">+{contact.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {format(new Date(contact.created_at), 'dd/MM/yyyy', { locale: he })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200 flex-shrink-0">
          <p className="text-sm text-slate-500">
            עמוד {page} מתוך {totalPages} · {total.toLocaleString()} תוצאות
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {isModalOpen && (
        <ContactModal
          contact={isNewContact ? null : selectedContact}
          onSave={handleContactSaved}
          onDelete={handleDelete}
          onClose={() => { setIsModalOpen(false); setSelectedContact(null); setIsNewContact(false) }}
        />
      )}
    </div>
  )
}
