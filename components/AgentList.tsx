'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  Plus,
  RefreshCw,
  Power,
  PowerOff,
  Trash2,
  Settings,
  MessageCircle,
  Zap,
} from 'lucide-react'
import { Agent, AGENT_ROLES, AVATAR_OPTIONS, CHANNELS } from '@/lib/agent-types'

export default function AgentList() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState(AGENT_ROLES[0])
  const [newAvatar, setNewAvatar] = useState('🤖')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    const res = await fetch('/api/agents')
    const data = await res.json()
    if (Array.isArray(data)) setAgents(data)
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), role: newRole, avatar: newAvatar }),
    })
    const created = await res.json()
    if (created?.id) {
      router.push(`/ai-agent/${created.id}`)
    }
    setCreating(false)
  }

  const handleToggle = async (agent: Agent) => {
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !agent.is_active }),
    })
    const updated = await res.json()
    if (updated?.id) {
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('האם למחוק את הסוכן? כל הנתונים יימחקו.')) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    setAgents((prev) => prev.filter((a) => a.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="text-blue-500 animate-spin" />
          <p className="text-slate-500">טוען סוכנים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Bot size={22} className="text-purple-600" />
              סוכני AI
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {agents.length} סוכנים · {agents.filter((a) => a.is_active).length} פעילים
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} />
            סוכן חדש
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Create form */}
        {showCreate && (
          <div className="bg-white rounded-xl border border-purple-200 p-5 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Zap size={16} className="text-purple-500" />
              צור סוכן חדש
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">שם הסוכן *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="למשל: עוזר שירות לקוחות"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תפקיד</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {AGENT_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">אווטאר</label>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_OPTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setNewAvatar(a)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      newAvatar === a
                        ? 'bg-purple-100 ring-2 ring-purple-500 scale-110'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {creating ? 'יוצר...' : 'צור סוכן'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* Agent cards */}
        {agents.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-slate-600 mb-1">אין סוכנים עדיין</h3>
            <p className="text-slate-400 text-sm mb-4">צור את הסוכן הראשון שלך כדי להתחיל</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Plus size={16} />
              סוכן חדש
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`bg-white rounded-xl border p-5 transition-all hover:shadow-md ${
                  agent.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
              >
                {/* Agent header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">
                      {agent.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{agent.name}</h3>
                      <p className="text-xs text-slate-400">{agent.role}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      agent.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {agent.is_active ? 'פעיל' : 'כבוי'}
                  </span>
                </div>

                {/* Model + Channels */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    {agent.model}
                  </span>
                  {agent.channels?.map((ch) => {
                    const channel = CHANNELS.find((c) => c.value === ch)
                    return channel ? (
                      <span key={ch} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {channel.icon} {channel.label}
                      </span>
                    ) : null
                  })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => router.push(`/ai-agent/${agent.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <Settings size={13} />
                    הגדרות
                  </button>
                  <button
                    onClick={() => handleToggle(agent)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      agent.is_active
                        ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                        : 'text-green-600 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {agent.is_active ? <PowerOff size={13} /> : <Power size={13} />}
                    {agent.is_active ? 'כבה' : 'הפעל'}
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors me-auto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
