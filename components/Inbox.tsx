'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageCircle, Search, Send, Plus, Filter,
  Phone, ExternalLink, X, Check, CheckCheck, Clock,
  Archive, UserPlus, RefreshCw, Paperclip, MoreVertical,
  Zap, StickyNote, Tag, Trash2, Copy, Download, FileText,
  Bell, BellOff, Volume2, VolumeX, Settings2,
} from 'lucide-react'
import type { Conversation, Message, ChannelType } from '@/lib/inbox-types'
import { CHANNEL_INFO, STATUS_LABELS, formatTimeShort, getInitials } from '@/lib/inbox-types'
import {
  getNotificationPrefs, saveNotificationPrefs, playNotificationSound,
  requestNotificationPermission, showBrowserNotification, updatePageTitle,
  CHANNEL_LABELS,
} from '@/lib/notifications'
import type { NotificationPreferences } from '@/lib/notifications'

interface QuickReply {
  id: string
  title: string
  content: string
  category: string
  shortcut: string | null
  usage_count: number
}

interface ConversationNote {
  id: string
  conversation_id: string
  content: string
  author: string
  created_at: string
}

interface ConversationTag {
  id: string
  conversation_id: string
  tag: string
  color: string
  created_at: string
}

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChat, setNewChat] = useState({ name: '', phone: '', email: '', channel: 'whatsapp' as ChannelType })
  const [showFilters, setShowFilters] = useState(false)
  const [showConvMenu, setShowConvMenu] = useState(false)

  // Quick replies
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [qrSearch, setQrSearch] = useState('')

  // Notes
  const [notes, setNotes] = useState<ConversationNote[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [newNote, setNewNote] = useState('')

  // Tags
  const [tags, setTags] = useState<ConversationTag[]>([])
  const [newTag, setNewTag] = useState('')

  // Global search
  const [globalSearch, setGlobalSearch] = useState('')
  const [globalResults, setGlobalResults] = useState<Array<{
    message_id: string; content: string; direction: string; channel: string;
    sender_name: string; created_at: string; conversation_id: string;
    contact_name: string; contact_phone: string;
  }>>([])
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(getNotificationPrefs())
  const [showNotifSettings, setShowNotifSettings] = useState(false)
  const prevConvsRef = useRef<Conversation[]>([])
  const prevMsgsRef = useRef<Message[]>([])

  // Right panel tab
  const [rightTab, setRightTab] = useState<'chat' | 'info'>('chat')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = conversations.find(c => c.id === selectedId) || null
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  // ── Fetch conversations ──
  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams()
    if (channelFilter) params.set('channel', channelFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)

    try {
      const res = await fetch(`/api/inbox/conversations?${params}`)
      if (res.ok) setConversations(await res.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [channelFilter, statusFilter, search])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchConversations, 10000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  // Request notification permission on mount
  useEffect(() => {
    if (notifPrefs.browserNotifications) {
      requestNotificationPermission()
    }
  }, [notifPrefs.browserNotifications])

  // Detect new conversations / unread changes for notifications
  useEffect(() => {
    if (prevConvsRef.current.length === 0) {
      prevConvsRef.current = conversations
      return
    }

    const prev = prevConvsRef.current
    const prevIds = new Set(prev.map(c => c.id))

    // Check for new conversations
    for (const conv of conversations) {
      if (!prevIds.has(conv.id)) {
        // New conversation!
        if (notifPrefs.notifyOnNewConversation) {
          playNotificationSound('conversation')
          showBrowserNotification(
            `שיחה חדשה — ${conv.contact_name}`,
            `ערוץ: ${CHANNEL_LABELS[conv.channel] || conv.channel}`,
            { tag: `conv-${conv.id}`, onClick: () => setSelectedId(conv.id) }
          )
        }
      } else {
        // Check if unread increased
        const prevConv = prev.find(c => c.id === conv.id)
        if (prevConv && conv.unread_count > prevConv.unread_count && conv.id !== selectedId) {
          if (notifPrefs.notifyOnNewMessage) {
            playNotificationSound('message')
            showBrowserNotification(
              conv.contact_name,
              conv.last_message || 'הודעה חדשה',
              { tag: `msg-${conv.id}`, onClick: () => setSelectedId(conv.id) }
            )
          }
        }
      }
    }

    prevConvsRef.current = conversations
  }, [conversations, notifPrefs, selectedId])

  // Update page title with unread count
  useEffect(() => {
    updatePageTitle(totalUnread)
    return () => updatePageTitle(0) // Reset on unmount
  }, [totalUnread])

  // Fetch quick replies
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/inbox/quick-replies')
        if (res.ok) setQuickReplies(await res.json())
      } catch { /* silent */ }
    }
    load()
  }, [])

  // Load messages when conversation selected
  useEffect(() => {
    if (!selectedId) return
    setMsgLoading(true)
    setShowNotes(false)
    setRightTab('chat')

    const load = async () => {
      try {
        const res = await fetch(`/api/inbox/messages?conversation_id=${selectedId}`)
        if (res.ok) {
          setMessages(await res.json())
          setConversations(prev =>
            prev.map(c => c.id === selectedId ? { ...c, unread_count: 0 } : c)
          )
        }
      } catch { /* silent */ } finally {
        setMsgLoading(false)
      }
    }
    load()

    // Auto-refresh messages every 5 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/inbox/messages?conversation_id=${selectedId}`)
        if (res.ok) setMessages(await res.json())
      } catch { /* silent */ }
    }, 5000)

    return () => clearInterval(interval)
  }, [selectedId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load notes when opening notes panel
  useEffect(() => {
    if (!showNotes || !selectedId) return
    const load = async () => {
      try {
        const res = await fetch(`/api/inbox/notes?conversation_id=${selectedId}`)
        if (res.ok) setNotes(await res.json())
      } catch { /* silent */ }
    }
    load()
  }, [showNotes, selectedId])

  // Load tags when conversation selected
  useEffect(() => {
    if (!selectedId) return
    const load = async () => {
      try {
        const res = await fetch(`/api/inbox/tags?conversation_id=${selectedId}`)
        if (res.ok) setTags(await res.json())
      } catch { /* silent */ }
    }
    load()
  }, [selectedId])

  // ── Send message ──
  const handleSend = async (content?: string) => {
    const text = content || newMsg.trim()
    if (!text || !selectedId || sending) return
    setNewMsg('')
    setSending(true)
    setShowQuickReplies(false)

    // Optimistic update
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedId,
      direction: 'out',
      channel: selected?.channel || 'whatsapp',
      content: text,
      media_url: null,
      media_type: null,
      status: 'sent',
      sender_name: 'מנהל המערכת',
      external_id: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const res = await fetch('/api/inbox/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selectedId, content: text }),
      })
      if (res.ok) {
        const real = await res.json()
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? real : m))
        setConversations(prev =>
          prev.map(c => c.id === selectedId
            ? { ...c, last_message: text, last_message_at: new Date().toISOString() }
            : c
          ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        )
      }
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? { ...m, status: 'failed' } : m)
      )
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // ── Quick reply select ──
  const handleQuickReply = async (qr: QuickReply) => {
    setNewMsg(qr.content)
    setShowQuickReplies(false)
    inputRef.current?.focus()

    // Increment usage
    try {
      await fetch('/api/inbox/quick-replies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: qr.id, increment_usage: true }),
      })
    } catch { /* silent */ }
  }

  // ── Shortcut detection ──
  const handleInputChange = (val: string) => {
    setNewMsg(val)
    // Check for shortcut commands
    if (val.startsWith('/') && val.length >= 2) {
      const match = quickReplies.find(qr => qr.shortcut === val)
      if (match) {
        setNewMsg(match.content)
        setShowQuickReplies(false)
      }
    }
  }

  // ── New chat ──
  const handleNewChat = async () => {
    if (!newChat.name.trim()) return
    try {
      const res = await fetch('/api/inbox/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: newChat.name,
          contact_phone: newChat.phone || null,
          contact_email: newChat.email || null,
          channel: newChat.channel,
        }),
      })
      if (res.ok) {
        const conv = await res.json()
        setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)])
        setSelectedId(conv.id)
        setShowNewChat(false)
        setNewChat({ name: '', phone: '', email: '', channel: 'whatsapp' })
      }
    } catch { /* silent */ }
  }

  // ── Close / Archive ──
  const handleCloseConversation = async () => {
    if (!selectedId) return
    await fetch('/api/inbox/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedId, status: 'closed' }),
    })
    setConversations(prev => prev.filter(c => c.id !== selectedId))
    setSelectedId(null)
    setShowConvMenu(false)
  }

  const handleArchiveConversation = async () => {
    if (!selectedId) return
    await fetch('/api/inbox/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedId, status: 'archived' }),
    })
    setConversations(prev => prev.filter(c => c.id !== selectedId))
    setSelectedId(null)
    setShowConvMenu(false)
  }

  // ── Add note ──
  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedId) return
    try {
      const res = await fetch('/api/inbox/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selectedId, content: newNote }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes(prev => [note, ...prev])
        setNewNote('')
      }
    } catch { /* silent */ }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/inbox/notes?id=${noteId}`, { method: 'DELETE' })
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch { /* silent */ }
  }

  // ── Global search ──
  const handleGlobalSearch = async () => {
    if (!globalSearch.trim() || globalSearch.length < 2) return
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/inbox/search?q=${encodeURIComponent(globalSearch)}`)
      if (res.ok) {
        const data = await res.json()
        setGlobalResults(data.results || [])
      }
    } catch { /* silent */ }
    finally { setSearchLoading(false) }
  }

  const handleSearchResultClick = (conversationId: string) => {
    setSelectedId(conversationId)
    setShowGlobalSearch(false)
    setGlobalSearch('')
    setGlobalResults([])
  }

  // ── Export ──
  const handleExport = (format: 'csv' | 'text') => {
    if (!selectedId) return
    window.open(`/api/inbox/export?conversation_id=${selectedId}&format=${format}`, '_blank')
    setShowConvMenu(false)
  }

  // ── Tags ──
  const handleAddTag = async () => {
    if (!newTag.trim() || !selectedId) return
    try {
      const res = await fetch('/api/inbox/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selectedId, tag: newTag }),
      })
      if (res.ok) {
        const tag = await res.json()
        setTags(prev => [...prev.filter(t => t.id !== tag.id), tag])
        setNewTag('')
      }
    } catch { /* silent */ }
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      await fetch(`/api/inbox/tags?id=${tagId}`, { method: 'DELETE' })
      setTags(prev => prev.filter(t => t.id !== tagId))
    } catch { /* silent */ }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check size={12} className="text-slate-400" />
      case 'delivered': return <CheckCheck size={12} className="text-slate-400" />
      case 'read': return <CheckCheck size={12} className="text-blue-500" />
      case 'failed': return <X size={12} className="text-red-500" />
      default: return <Clock size={12} className="text-slate-400" />
    }
  }

  const filteredQR = qrSearch
    ? quickReplies.filter(qr =>
        qr.title.includes(qrSearch) || qr.content.includes(qrSearch) || qr.shortcut?.includes(qrSearch)
      )
    : quickReplies

  return (
    <div className="flex h-full">
      {/* ═══════════════════════════════════════════ */}
      {/* ─── Conversations List (Right Panel) ───── */}
      {/* ═══════════════════════════════════════════ */}
      <div className="w-[380px] flex-shrink-0 border-l border-slate-200 flex flex-col bg-white">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MessageCircle size={22} className="text-blue-600" />
              שיחות
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {totalUnread}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNotifSettings(!showNotifSettings)}
                className={`p-2 rounded-lg ${showNotifSettings ? 'bg-green-100 text-green-600' : 'hover:bg-slate-100 text-slate-500'}`}
                title="הגדרות התראות"
              >
                {notifPrefs.soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              </button>
              <button
                onClick={() => setShowGlobalSearch(!showGlobalSearch)}
                className={`p-2 rounded-lg ${showGlobalSearch ? 'bg-purple-100 text-purple-600' : 'hover:bg-slate-100 text-slate-500'}`}
                title="חיפוש בהודעות"
              >
                <Search size={16} />
              </button>
              <button
                onClick={fetchConversations}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                title="רענן"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg ${showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <Filter size={16} />
              </button>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש שיחות..."
              className="w-full pl-3 pr-10 py-2 bg-slate-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-300 focus:bg-white"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex gap-2 mt-2">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="">כל הערוצים</option>
                {Object.entries(CHANNEL_INFO).map(([key, info]) => (
                  <option key={key} value={key}>{info.icon} {info.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="all">כל הסטטוסים</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notification Settings Panel */}
        {showNotifSettings && (
          <div className="p-3 border-b border-slate-200 bg-green-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Settings2 size={14} className="text-green-600" />
                הגדרות התראות
              </span>
              <button onClick={() => setShowNotifSettings(false)} className="p-1 hover:bg-green-100 rounded">
                <X size={14} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Sound toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 flex items-center gap-1.5">
                  {notifPrefs.soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  צלילי התראה
                </span>
                <button
                  onClick={() => {
                    const updated = saveNotificationPrefs({ soundEnabled: !notifPrefs.soundEnabled })
                    if (updated) setNotifPrefs(updated)
                  }}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    notifPrefs.soundEnabled ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    notifPrefs.soundEnabled ? 'right-0.5' : 'right-4'
                  }`} />
                </button>
              </div>

              {/* Volume slider */}
              {notifPrefs.soundEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">עוצמה:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={notifPrefs.soundVolume}
                    onChange={(e) => {
                      const updated = saveNotificationPrefs({ soundVolume: parseFloat(e.target.value) })
                      if (updated) setNotifPrefs(updated)
                    }}
                    className="flex-1 h-1.5 accent-green-600"
                  />
                  <button
                    onClick={() => playNotificationSound('message')}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    בדיקה
                  </button>
                </div>
              )}

              {/* Browser notifications */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 flex items-center gap-1.5">
                  <Bell size={13} />
                  התראות דפדפן
                </span>
                <button
                  onClick={async () => {
                    if (!notifPrefs.browserNotifications) {
                      const granted = await requestNotificationPermission()
                      if (granted) {
                        const updated = saveNotificationPrefs({ browserNotifications: true })
                        if (updated) setNotifPrefs(updated)
                      }
                    } else {
                      const updated = saveNotificationPrefs({ browserNotifications: false })
                      if (updated) setNotifPrefs(updated)
                    }
                  }}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    notifPrefs.browserNotifications ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    notifPrefs.browserNotifications ? 'right-0.5' : 'right-4'
                  }`} />
                </button>
              </div>

              {/* Notify on new message */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700">הודעות נכנסות</span>
                <button
                  onClick={() => {
                    const updated = saveNotificationPrefs({ notifyOnNewMessage: !notifPrefs.notifyOnNewMessage })
                    if (updated) setNotifPrefs(updated)
                  }}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    notifPrefs.notifyOnNewMessage ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    notifPrefs.notifyOnNewMessage ? 'right-0.5' : 'right-4'
                  }`} />
                </button>
              </div>

              {/* Notify on new conversation */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700">שיחות חדשות</span>
                <button
                  onClick={() => {
                    const updated = saveNotificationPrefs({ notifyOnNewConversation: !notifPrefs.notifyOnNewConversation })
                    if (updated) setNotifPrefs(updated)
                  }}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    notifPrefs.notifyOnNewConversation ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    notifPrefs.notifyOnNewConversation ? 'right-0.5' : 'right-4'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Search Panel */}
        {showGlobalSearch && (
          <div className="p-3 border-b border-slate-200 bg-purple-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Search size={14} className="text-purple-500" />
                חיפוש בכל ההודעות
              </span>
              <button onClick={() => { setShowGlobalSearch(false); setGlobalResults([]) }} className="p-1 hover:bg-purple-100 rounded">
                <X size={14} className="text-slate-500" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGlobalSearch() }}
                placeholder="חיפוש טקסט בהודעות..."
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-300"
                autoFocus
              />
              <button
                onClick={handleGlobalSearch}
                disabled={!globalSearch.trim() || globalSearch.length < 2 || searchLoading}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {searchLoading ? '...' : 'חפש'}
              </button>
            </div>
            {globalResults.length > 0 && (
              <div className="max-h-[250px] overflow-y-auto space-y-1">
                <p className="text-xs text-slate-500">{globalResults.length} תוצאות</p>
                {globalResults.map(r => (
                  <button
                    key={r.message_id}
                    onClick={() => handleSearchResultClick(r.conversation_id)}
                    className="w-full text-right p-2 bg-white rounded-lg border border-slate-100 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">{r.contact_name}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleDateString('he-IL')}
                      </span>
                      <span className="text-xs opacity-60">
                        {CHANNEL_INFO[r.channel as keyof typeof CHANNEL_INFO]?.icon || '💬'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{r.content}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New Chat Form */}
        {showNewChat && (
          <div className="p-3 border-b border-slate-200 bg-blue-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">שיחה חדשה</span>
              <button onClick={() => setShowNewChat(false)} className="p-1 hover:bg-blue-100 rounded">
                <X size={14} className="text-slate-500" />
              </button>
            </div>
            <input
              type="text"
              value={newChat.name}
              onChange={(e) => setNewChat(f => ({ ...f, name: e.target.value }))}
              placeholder="שם איש קשר *"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
            <input
              type="tel"
              value={newChat.phone}
              onChange={(e) => setNewChat(f => ({ ...f, phone: e.target.value }))}
              placeholder="מספר טלפון"
              dir="ltr"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
            <input
              type="email"
              value={newChat.email}
              onChange={(e) => setNewChat(f => ({ ...f, email: e.target.value }))}
              placeholder="אימייל"
              dir="ltr"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <select
                value={newChat.channel}
                onChange={(e) => setNewChat(f => ({ ...f, channel: e.target.value as ChannelType }))}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {Object.entries(CHANNEL_INFO).map(([key, info]) => (
                  <option key={key} value={key}>{info.icon} {info.label}</option>
                ))}
              </select>
              <button
                onClick={handleNewChat}
                disabled={!newChat.name.trim()}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                צור
              </button>
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <MessageCircle size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">אין שיחות</p>
              <p className="text-xs mt-1">לחץ + כדי להתחיל שיחה</p>
            </div>
          ) : (
            conversations.map(conv => {
              const ch = CHANNEL_INFO[conv.channel] || CHANNEL_INFO.whatsapp
              const isSelected = conv.id === selectedId
              const hasUnread = conv.unread_count > 0

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`
                    flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors
                    ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'hover:bg-slate-50'}
                    ${hasUnread && !isSelected ? 'bg-amber-50/50' : ''}
                  `}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${
                      hasUnread ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {getInitials(conv.contact_name)}
                    </div>
                    <span className="absolute -bottom-0.5 -left-0.5 text-xs" title={ch.label}>
                      {ch.icon}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${hasUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {conv.contact_name}
                      </span>
                      <span className="text-xs text-slate-400 flex-shrink-0 mr-2">
                        {formatTimeShort(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate ${hasUnread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                        {conv.last_message || 'אין הודעות'}
                      </p>
                      {hasUnread && (
                        <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0 mr-1">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── Chat Window (Left Panel) ──────────── */}
      {/* ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {!selectedId ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <MessageCircle size={36} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-500 mb-1">בחר שיחה</h3>
            <p className="text-sm">בחר שיחה מהרשימה או התחל שיחה חדשה</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  selected ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {selected ? getInitials(selected.contact_name) : '?'}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 text-sm">{selected?.contact_name}</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {selected?.contact_phone && (
                      <span dir="ltr">{selected.contact_phone}</span>
                    )}
                    {selected?.contact_email && (
                      <span dir="ltr" className="text-slate-400">{selected.contact_email}</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${CHANNEL_INFO[selected?.channel || 'whatsapp'].bgClass}`}>
                      {CHANNEL_INFO[selected?.channel || 'whatsapp'].icon} {CHANNEL_INFO[selected?.channel || 'whatsapp'].label}
                    </span>
                    {tags.map(t => (
                      <span
                        key={t.id}
                        className="px-1.5 py-0.5 rounded-full text-xs text-white font-medium cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: t.color }}
                        onClick={() => handleDeleteTag(t.id)}
                        title="לחץ להסרה"
                      >
                        {t.tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Notes toggle */}
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={`p-2 rounded-lg ${showNotes ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-500'}`}
                  title="הערות פנימיות"
                >
                  <StickyNote size={16} />
                </button>
                {selected?.contact_phone && (
                  <>
                    <a
                      href={`tel:${selected.contact_phone}`}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                      title="התקשר"
                    >
                      <Phone size={16} />
                    </a>
                    {selected.channel === 'whatsapp' && (
                      <a
                        href={`https://wa.me/${selected.contact_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                        title="פתח WhatsApp"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowConvMenu(!showConvMenu)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {showConvMenu && (
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[160px]">
                      <button
                        onClick={handleCloseConversation}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Check size={14} />
                        סגור שיחה
                      </button>
                      <button
                        onClick={handleArchiveConversation}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Archive size={14} />
                        ארכיון
                      </button>
                      {selected?.lead_id && (
                        <a
                          href="/pipeline"
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                        >
                          <UserPlus size={14} />
                          עבור לליד
                        </a>
                      )}
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Download size={14} />
                        ייצוא CSV
                      </button>
                      <button
                        onClick={() => handleExport('text')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <FileText size={14} />
                        ייצוא טקסט
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content area with optional notes sidebar */}
            <div className="flex-1 flex overflow-hidden">
              {/* Messages area */}
              <div className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {msgLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <p className="text-sm">אין הודעות עדיין</p>
                      <p className="text-xs mt-1">שלח הודעה ראשונה!</p>
                    </div>
                  ) : (
                    <>
                      {/* Date separator for first message */}
                      {messages.length > 0 && (
                        <div className="flex items-center gap-3 my-2">
                          <div className="flex-1 h-px bg-slate-200" />
                          <span className="text-xs text-slate-400 px-2">
                            {new Date(messages[0].created_at).toLocaleDateString('he-IL')}
                          </span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>
                      )}
                      {messages.map((msg, idx) => {
                        const isOut = msg.direction === 'out'
                        const ch = CHANNEL_INFO[msg.channel] || CHANNEL_INFO.whatsapp
                        const time = new Date(msg.created_at)
                        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`

                        // Show date separator between days
                        const showDateSep = idx > 0 && (
                          new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString()
                        )

                        return (
                          <div key={msg.id}>
                            {showDateSep && (
                              <div className="flex items-center gap-3 my-3">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-slate-400 px-2">
                                  {time.toLocaleDateString('he-IL')}
                                </span>
                                <div className="flex-1 h-px bg-slate-200" />
                              </div>
                            )}
                            <div className={`flex ${isOut ? 'justify-start' : 'justify-end'}`}>
                              <div
                                className={`
                                  max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm relative group
                                  ${isOut
                                    ? 'bg-blue-600 text-white rounded-br-md'
                                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                                  }
                                `}
                              >
                                {/* Copy button on hover */}
                                <button
                                  onClick={() => navigator.clipboard.writeText(msg.content)}
                                  className={`absolute top-1 ${isOut ? 'left-1' : 'right-1'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                                    isOut ? 'hover:bg-blue-500' : 'hover:bg-slate-100'
                                  }`}
                                  title="העתק"
                                >
                                  <Copy size={12} className={isOut ? 'text-blue-200' : 'text-slate-400'} />
                                </button>

                                {!isOut && msg.sender_name && (
                                  <p className="text-xs text-slate-500 mb-0.5 font-medium">{msg.sender_name}</p>
                                )}

                                {/* Media preview */}
                                {msg.media_url && msg.media_type === 'image' && (
                                  <img
                                    src={msg.media_url}
                                    alt="media"
                                    className="rounded-lg mb-2 max-w-full max-h-48 object-cover"
                                  />
                                )}

                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-start' : 'justify-end'}`}>
                                  <span className={`text-xs ${isOut ? 'text-blue-200' : 'text-slate-400'}`}>
                                    {timeStr}
                                  </span>
                                  <span className="text-xs opacity-60" title={ch.label}>{ch.icon}</span>
                                  {isOut && getStatusIcon(msg.status)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Quick Replies Panel */}
                {showQuickReplies && (
                  <div className="border-t border-slate-200 bg-white max-h-[240px] overflow-y-auto">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" />
                        <span className="text-sm font-semibold text-slate-700">תגובות מהירות</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={qrSearch}
                          onChange={(e) => setQrSearch(e.target.value)}
                          placeholder="חיפוש..."
                          className="px-2 py-1 border border-slate-200 rounded text-xs w-32"
                        />
                        <button onClick={() => { setShowQuickReplies(false); setQrSearch('') }}>
                          <X size={14} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredQR.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">אין תבניות תואמות</div>
                      ) : (
                        filteredQR.map(qr => (
                          <button
                            key={qr.id}
                            onClick={() => handleQuickReply(qr)}
                            className="w-full text-right px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-start gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700">{qr.title}</span>
                                {qr.shortcut && (
                                  <code className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{qr.shortcut}</code>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{qr.content}</p>
                            </div>
                            <Send size={12} className="text-slate-300 mt-1 flex-shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className="px-4 py-3 bg-white border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      title="צרף קובץ"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button
                      onClick={() => { setShowQuickReplies(!showQuickReplies); setQrSearch('') }}
                      className={`p-2 rounded-lg ${showQuickReplies ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                      title="תגובות מהירות"
                    >
                      <Zap size={18} />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMsg}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      placeholder="הקלד הודעה... (הקלד / לתגובה מהירה)"
                      className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm border-none focus:ring-2 focus:ring-blue-300 focus:bg-white"
                      disabled={sending}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!newMsg.trim() || sending}
                      className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  {/* Channel indicator */}
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <span className="text-xs text-slate-400">משיב דרך:</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CHANNEL_INFO[selected?.channel || 'whatsapp'].bgClass}`}>
                      {CHANNEL_INFO[selected?.channel || 'whatsapp'].icon} {CHANNEL_INFO[selected?.channel || 'whatsapp'].label}
                    </span>
                    {quickReplies.length > 0 && (
                      <span className="text-xs text-slate-400 mr-auto">
                        💡 הקלד <code className="bg-slate-100 px-1 rounded">/</code> לתגובה מהירה
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Notes Sidebar ─── */}
              {showNotes && (
                <div className="w-[280px] flex-shrink-0 border-r border-slate-200 bg-amber-50/30 flex flex-col">
                  <div className="px-3 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <StickyNote size={14} className="text-amber-500" />
                      הערות פנימיות
                    </h3>
                    <button onClick={() => setShowNotes(false)}>
                      <X size={14} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Tags section */}
                  <div className="p-3 border-b border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                      <Tag size={12} />
                      תגיות
                    </h4>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tags.map(t => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white font-medium"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.tag}
                          <button onClick={() => handleDeleteTag(t.id)} className="hover:opacity-70">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag() }}
                        placeholder="תגית חדשה..."
                        className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs"
                      />
                      <button
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
                        className="px-2 py-1 bg-slate-600 text-white rounded text-xs disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Add note */}
                  <div className="p-3 border-b border-slate-200">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="הוסף הערה פנימית..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none h-16 focus:ring-2 focus:ring-amber-300"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="mt-1.5 w-full py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
                    >
                      הוסף הערה
                    </button>
                  </div>

                  {/* Notes list */}
                  <div className="flex-1 overflow-y-auto">
                    {notes.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        <StickyNote size={20} className="mx-auto mb-2 opacity-40" />
                        אין הערות
                      </div>
                    ) : (
                      notes.map(note => (
                        <div key={note.id} className="px-3 py-2.5 border-b border-slate-100 group">
                          <div className="flex items-start justify-between">
                            <p className="text-xs text-slate-700 whitespace-pre-wrap flex-1">{note.content}</p>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded mr-1 flex-shrink-0"
                            >
                              <Trash2 size={12} className="text-red-400" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-slate-400">{note.author}</span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-400">
                              {new Date(note.created_at).toLocaleDateString('he-IL')}
                              {' '}
                              {new Date(note.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
