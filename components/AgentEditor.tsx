'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  ArrowRight,
  Save,
  Brain,
  BookOpen,
  Zap,
  BarChart3,
  RefreshCw,
  Plus,
  Trash2,
  X,
  MessageCircle,
  Globe,
  FileText,
  HelpCircle,
  Link2,
  Power,
  PowerOff,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react'
import {
  Agent,
  AgentPersonality,
  AgentKnowledgeText,
  AgentKnowledgeFaq,
  AgentKnowledgeLink,
  AgentAction,
  AgentConversation,
  AI_MODELS,
  AGENT_ROLES,
  AVATAR_OPTIONS,
  CHANNELS,
  ACTION_TYPES,
} from '@/lib/agent-types'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

type Tab = 'personality' | 'knowledge' | 'actions' | 'performance'

interface AgentData extends Agent {
  knowledge_texts: AgentKnowledgeText[]
  knowledge_faqs: AgentKnowledgeFaq[]
  knowledge_links: AgentKnowledgeLink[]
  actions: AgentAction[]
  conversations: AgentConversation[]
}

export default function AgentEditor({ agentId }: { agentId: string }) {
  const router = useRouter()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('personality')

  // Personality form state
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🤖')
  const [role, setRole] = useState('')
  const [model, setModel] = useState('claude-sonnet')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [personality, setPersonality] = useState<AgentPersonality>({})
  const [constraints, setConstraints] = useState('')
  const [channels, setChannels] = useState<string[]>([])

  const loadAgent = useCallback(async () => {
    const res = await fetch(`/api/agents/${agentId}`)
    const data = await res.json()
    if (data?.id) {
      setAgent(data)
      setName(data.name)
      setAvatar(data.avatar || '🤖')
      setRole(data.role)
      setModel(data.model)
      setSystemPrompt(data.system_prompt || '')
      setPersonality(data.personality || {})
      setConstraints(data.constraints || '')
      setChannels(data.channels || [])
    }
    setLoading(false)
  }, [agentId])

  useEffect(() => {
    loadAgent()
  }, [loadAgent])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, avatar, role, model, system_prompt: systemPrompt,
        personality, constraints, channels,
      }),
    })
    const updated = await res.json()
    if (updated?.id) setAgent((prev) => prev ? { ...prev, ...updated } : prev)
    setSaving(false)
  }

  const handleToggle = async () => {
    if (!agent) return
    const res = await fetch(`/api/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !agent.is_active }),
    })
    const updated = await res.json()
    if (updated?.id) setAgent((prev) => prev ? { ...prev, ...updated } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={28} className="text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">סוכן לא נמצא</p>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'personality', label: 'מטרות ואישיות', icon: <Brain size={16} /> },
    { key: 'knowledge', label: 'בסיס ידע', icon: <BookOpen size={16} /> },
    { key: 'actions', label: 'פעולות', icon: <Zap size={16} /> },
    { key: 'performance', label: 'ביצועים', icon: <BarChart3 size={16} /> },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/ai-agent')}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <ArrowRight size={18} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl">
              {avatar}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{name || 'סוכן חדש'}</h1>
              <p className="text-xs text-slate-400">{role}</p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                agent.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {agent.is_active ? 'פעיל' : 'כבוי'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                agent.is_active
                  ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                  : 'border-green-200 text-green-600 hover:bg-green-50'
              }`}
            >
              {agent.is_active ? <PowerOff size={14} /> : <Power size={14} />}
              {agent.is_active ? 'כבה' : 'הפעל'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Save size={15} />
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                tab === t.key
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          {tab === 'personality' && (
            <PersonalityTab
              name={name} setName={setName}
              avatar={avatar} setAvatar={setAvatar}
              role={role} setRole={setRole}
              model={model} setModel={setModel}
              systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt}
              personality={personality} setPersonality={setPersonality}
              constraints={constraints} setConstraints={setConstraints}
              channels={channels} setChannels={setChannels}
            />
          )}
          {tab === 'knowledge' && (
            <KnowledgeTab agentId={agentId} agent={agent} onReload={loadAgent} />
          )}
          {tab === 'actions' && (
            <ActionsTab agentId={agentId} agent={agent} onReload={loadAgent} />
          )}
          {tab === 'performance' && (
            <PerformanceTab agent={agent} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Tab 1: Personality ─── */
function PersonalityTab({
  name, setName, avatar, setAvatar, role, setRole, model, setModel,
  systemPrompt, setSystemPrompt, personality, setPersonality,
  constraints, setConstraints, channels, setChannels,
}: {
  name: string; setName: (v: string) => void
  avatar: string; setAvatar: (v: string) => void
  role: string; setRole: (v: string) => void
  model: string; setModel: (v: string) => void
  systemPrompt: string; setSystemPrompt: (v: string) => void
  personality: AgentPersonality; setPersonality: (v: AgentPersonality) => void
  constraints: string; setConstraints: (v: string) => void
  channels: string[]; setChannels: (v: string[]) => void
}) {
  const toggleChannel = (ch: string) => {
    setChannels(channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch])
  }

  return (
    <div className="space-y-6">
      {/* Name + Avatar + Role */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Bot size={16} className="text-purple-500" />
          פרטי הסוכן
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">שם הסוכן</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">תפקיד</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
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
                onClick={() => setAvatar(a)}
                className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                  avatar === a ? 'bg-purple-100 ring-2 ring-purple-500 scale-110' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Model + Channels */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">מודל AI וערוצים</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">מודל AI</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white max-w-xs"
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">ערוצי חיבור</label>
          <div className="flex gap-3">
            {CHANNELS.map((ch) => (
              <button
                key={ch.value}
                onClick={() => toggleChannel(ch.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all ${
                  channels.includes(ch.value)
                    ? 'border-purple-300 bg-purple-50 text-purple-700 font-medium'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{ch.icon}</span>
                {ch.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* System Prompt */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-2">הוראות מערכת (System Prompt)</h3>
        <p className="text-xs text-slate-400 mb-3">ההוראות הבסיסיות שמגדירות את התנהגות הסוכן</p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={8}
          placeholder="אתה עוזר שירות לקוחות של חברת עוגן פיננסי. תפקידך לעזור ללקוחות בשאלות על משכנתאות, ביטוח, וייעוץ פיננסי..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none font-mono"
        />
      </section>

      {/* Personality */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">הגדרת אישיות</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">טון דיבור</label>
            <input
              type="text"
              value={personality.tone || ''}
              onChange={(e) => setPersonality({ ...personality, tone: e.target.value })}
              placeholder="למשל: ידידותי, מקצועי, חם, אמפתי"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">מאפיינים</label>
            <input
              type="text"
              value={personality.traits || ''}
              onChange={(e) => setPersonality({ ...personality, traits: e.target.value })}
              placeholder="למשל: סבלני, מדויק, יצירתי"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">מטרה</label>
            <input
              type="text"
              value={personality.goal || ''}
              onChange={(e) => setPersonality({ ...personality, goal: e.target.value })}
              placeholder="למשל: לסייע ללקוחות למצוא את הפתרון הפיננסי המתאים"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">עקרונות ליבה</label>
            <textarea
              value={personality.core_principles || ''}
              onChange={(e) => setPersonality({ ...personality, core_principles: e.target.value })}
              rows={3}
              placeholder="למשל: תמיד הגב באמפתיה, השתמש בשפה ברורה ופשוטה, שמור על טון חיובי"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
            />
          </div>
        </div>
      </section>

      {/* Constraints */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-2">אילוצים והגבלות</h3>
        <p className="text-xs text-slate-400 mb-3">מה הסוכן לא יעשה או לא יאמר</p>
        <textarea
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          rows={4}
          placeholder="למשל: לא לתת ייעוץ משפטי, לא להבטיח תשואות, לא לשתף מידע אישי של לקוחות אחרים"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
        />
      </section>
    </div>
  )
}

/* ─── Tab 2: Knowledge ─── */
function KnowledgeTab({ agentId, agent, onReload }: { agentId: string; agent: AgentData; onReload: () => void }) {
  const [addType, setAddType] = useState<'text' | 'faq' | 'link' | null>(null)
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [faqQ, setFaqQ] = useState('')
  const [faqA, setFaqA] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkDesc, setLinkDesc] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    setAdding(true)
    let body: Record<string, string> = {}
    if (addType === 'text') body = { type: 'text', title: textTitle, content: textContent }
    else if (addType === 'faq') body = { type: 'faq', question: faqQ, answer: faqA }
    else if (addType === 'link') body = { type: 'link', url: linkUrl, description: linkDesc }

    await fetch(`/api/agents/${agentId}/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setAddType(null)
    setTextTitle(''); setTextContent(''); setFaqQ(''); setFaqA(''); setLinkUrl(''); setLinkDesc('')
    await onReload()
    setAdding(false)
  }

  const handleDelete = async (type: string, itemId: string) => {
    await fetch(`/api/agents/${agentId}/knowledge?type=${type}&item_id=${itemId}`, { method: 'DELETE' })
    await onReload()
  }

  return (
    <div className="space-y-6">
      {/* Add buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { type: 'text' as const, label: 'טקסט חופשי', icon: <FileText size={14} /> },
          { type: 'faq' as const, label: 'שאלה ותשובה', icon: <HelpCircle size={14} /> },
          { type: 'link' as const, label: 'קישור', icon: <Link2 size={14} /> },
        ].map((btn) => (
          <button
            key={btn.type}
            onClick={() => setAddType(addType === btn.type ? null : btn.type)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
              addType === btn.type
                ? 'bg-purple-50 border-purple-300 text-purple-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Plus size={14} />
            {btn.icon}
            {btn.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {addType && (
        <div className="bg-white rounded-xl border border-purple-200 p-5">
          {addType === 'text' && (
            <div className="space-y-3">
              <input
                type="text" value={textTitle} onChange={(e) => setTextTitle(e.target.value)}
                placeholder="כותרת (אופציונלי)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
              <textarea
                value={textContent} onChange={(e) => setTextContent(e.target.value)}
                placeholder="הכנס מידע על העסק, מוצרים, תהליכים..."
                rows={5}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          )}
          {addType === 'faq' && (
            <div className="space-y-3">
              <input
                type="text" value={faqQ} onChange={(e) => setFaqQ(e.target.value)}
                placeholder="שאלה"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
              <textarea
                value={faqA} onChange={(e) => setFaqA(e.target.value)}
                placeholder="תשובה"
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          )}
          {addType === 'link' && (
            <div className="space-y-3">
              <input
                type="url" dir="ltr" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text" value={linkDesc} onChange={(e) => setLinkDesc(e.target.value)}
                placeholder="תיאור הקישור"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
            >
              {adding ? 'מוסיף...' : 'הוסף'}
            </button>
            <button onClick={() => setAddType(null)} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Knowledge items */}
      {agent.knowledge_texts.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            טקסטים ({agent.knowledge_texts.length})
          </h3>
          <div className="space-y-2">
            {agent.knowledge_texts.map((t) => (
              <div key={t.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  {t.title && <p className="text-sm font-medium text-slate-700">{t.title}</p>}
                  <p className="text-sm text-slate-500 line-clamp-2">{t.content}</p>
                </div>
                <button onClick={() => handleDelete('text', t.id)} className="p-1 text-slate-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {agent.knowledge_faqs.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <HelpCircle size={16} className="text-amber-500" />
            שאלות ותשובות ({agent.knowledge_faqs.length})
          </h3>
          <div className="space-y-2">
            {agent.knowledge_faqs.map((f) => (
              <div key={f.id} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">ש: {f.question}</p>
                    <p className="text-sm text-slate-500 mt-1">ת: {f.answer}</p>
                  </div>
                  <button onClick={() => handleDelete('faq', f.id)} className="p-1 text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {agent.knowledge_links.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Link2 size={16} className="text-green-500" />
            קישורים ({agent.knowledge_links.length})
          </h3>
          <div className="space-y-2">
            {agent.knowledge_links.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Globe size={14} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-600 truncate" dir="ltr">{l.url}</p>
                  {l.description && <p className="text-xs text-slate-400">{l.description}</p>}
                </div>
                <button onClick={() => handleDelete('link', l.id)} className="p-1 text-slate-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {agent.knowledge_texts.length === 0 && agent.knowledge_faqs.length === 0 && agent.knowledge_links.length === 0 && !addType && (
        <div className="text-center py-12 text-slate-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">אין ידע עדיין. הוסף מידע כדי שהסוכן יוכל לענות טוב יותר.</p>
        </div>
      )}
    </div>
  )
}

/* ─── Tab 3: Actions ─── */
function ActionsTab({ agentId, agent, onReload }: { agentId: string; agent: AgentData; onReload: () => void }) {
  const [adding, setAdding] = useState(false)

  const handleAddAction = async (actionType: string) => {
    const actionDef = ACTION_TYPES.find((a) => a.value === actionType)
    if (!actionDef) return
    setAdding(true)
    await fetch(`/api/agents/${agentId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: actionType,
        description: actionDef.description,
      }),
    })
    await onReload()
    setAdding(false)
  }

  const handleToggle = async (action: AgentAction) => {
    await fetch(`/api/agents/${agentId}/actions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: action.id, is_enabled: !action.is_enabled }),
    })
    await onReload()
  }

  const handleDelete = async (actionId: string) => {
    await fetch(`/api/agents/${agentId}/actions?action_id=${actionId}`, { method: 'DELETE' })
    await onReload()
  }

  const existingTypes = new Set(agent.actions.map((a) => a.action_type))
  const availableActions = ACTION_TYPES.filter((a) => !existingTypes.has(a.value))

  return (
    <div className="space-y-6">
      {/* Available actions to add */}
      {availableActions.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">הוסף פעולות</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableActions.map((action) => (
              <button
                key={action.value}
                onClick={() => handleAddAction(action.value)}
                disabled={adding}
                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors text-start"
              >
                <span className="text-xl">{action.icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{action.label}</p>
                  <p className="text-xs text-slate-400">{action.description}</p>
                </div>
                <Plus size={16} className="text-slate-400 me-auto" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Active actions */}
      {agent.actions.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">פעולות מוגדרות ({agent.actions.length})</h3>
          <div className="space-y-2">
            {agent.actions.map((action) => {
              const def = ACTION_TYPES.find((a) => a.value === action.action_type)
              return (
                <div
                  key={action.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    action.is_enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
                  }`}
                >
                  <span className="text-xl">{def?.icon || '⚡'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{def?.label || action.action_type}</p>
                    <p className="text-xs text-slate-400">{action.description}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(action)}
                    className={`text-xs px-2.5 py-1 rounded-full ${
                      action.is_enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {action.is_enabled ? 'פעיל' : 'כבוי'}
                  </button>
                  <button
                    onClick={() => handleDelete(action.id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {agent.actions.length === 0 && availableActions.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Zap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">כל הפעולות הוגדרו</p>
        </div>
      )}
    </div>
  )
}

/* ─── Tab 4: Performance ─── */
function PerformanceTab({ agent }: { agent: AgentData }) {
  const conversations = agent.conversations || []
  const totalConvs = conversations.length
  const activeConvs = conversations.filter((c) => c.status === 'active').length
  const transferredConvs = conversations.filter((c) => c.status === 'transferred').length
  const rated = conversations.filter((c) => c.satisfaction != null)
  const avgSatisfaction = rated.length > 0
    ? (rated.reduce((s, c) => s + (c.satisfaction || 0), 0) / rated.length).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'סה״כ שיחות', value: totalConvs, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'שיחות פעילות', value: activeConvs, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'הועברו לנציג', value: transferredConvs, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'שביעות רצון', value: avgSatisfaction || '—', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Conversation history */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <MessageCircle size={16} className="text-blue-500" />
          היסטוריית שיחות
        </h3>
        {conversations.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <MessageCircle size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">אין שיחות עדיין</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const lead = (conv as unknown as { leads?: { name: string; phone: string } }).leads
              return (
                <div key={conv.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      {lead?.name || 'לקוח אנונימי'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        {format(new Date(conv.started_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{conv.channel}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    conv.status === 'active' ? 'bg-green-100 text-green-700' :
                    conv.status === 'transferred' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {conv.status === 'active' ? 'פעילה' : conv.status === 'transferred' ? 'הועברה' : 'הסתיימה'}
                  </span>
                  {conv.satisfaction != null && (
                    <span className="text-xs text-amber-500">{'⭐'.repeat(conv.satisfaction)}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
