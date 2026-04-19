'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Send,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Integration, WhatsAppTemplate, INTEGRATION_INFO, TEMPLATE_VARIABLES } from '@/lib/integration-types'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedType, setExpandedType] = useState<string | null>(null)

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    const res = await fetch('/api/integrations')
    const data = await res.json()
    if (Array.isArray(data)) setIntegrations(data)
    setLoading(false)
  }

  const getIntegration = (type: string) => integrations.find((i) => i.type === type)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={28} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings size={22} className="text-slate-600" />
          הגדרות — אינטגרציות
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">חבר את המערכת לשירותים חיצוניים</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-4">
          {/* WhatsApp */}
          <IntegrationCard
            type="whatsapp"
            integration={getIntegration('whatsapp')}
            expanded={expandedType === 'whatsapp'}
            onToggleExpand={() => setExpandedType(expandedType === 'whatsapp' ? null : 'whatsapp')}
            onReload={loadIntegrations}
          />
          {/* Gmail */}
          <IntegrationCard
            type="gmail"
            integration={getIntegration('gmail')}
            expanded={expandedType === 'gmail'}
            onToggleExpand={() => setExpandedType(expandedType === 'gmail' ? null : 'gmail')}
            onReload={loadIntegrations}
          />
          {/* Calendar */}
          <IntegrationCard
            type="calendar"
            integration={getIntegration('calendar')}
            expanded={expandedType === 'calendar'}
            onToggleExpand={() => setExpandedType(expandedType === 'calendar' ? null : 'calendar')}
            onReload={loadIntegrations}
          />
          {/* Green API */}
          <IntegrationCard
            type="green_api"
            integration={getIntegration('green_api')}
            expanded={expandedType === 'green_api'}
            onToggleExpand={() => setExpandedType(expandedType === 'green_api' ? null : 'green_api')}
            onReload={loadIntegrations}
          />
        </div>
      </div>
    </div>
  )
}

function IntegrationCard({
  type,
  integration,
  expanded,
  onToggleExpand,
  onReload,
}: {
  type: string
  integration: Integration | undefined
  expanded: boolean
  onToggleExpand: () => void
  onReload: () => void
}) {
  const info = INTEGRATION_INFO[type]
  const isActive = integration?.is_active || false

  return (
    <div className={`bg-white rounded-xl border ${isActive ? 'border-green-200' : 'border-slate-200'} overflow-hidden`}>
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className={`w-12 h-12 rounded-xl ${info.bgColor} flex items-center justify-center text-2xl flex-shrink-0`}>
          {info.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800">{info.label}</h3>
          <p className="text-xs text-slate-400">{info.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {isActive ? 'מחובר' : 'לא מחובר'}
          </span>
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-5">
          {type === 'whatsapp' && <WhatsAppConfig integration={integration} onReload={onReload} />}
          {type === 'gmail' && <GmailConfig integration={integration} onReload={onReload} />}
          {type === 'calendar' && <CalendarConfig integration={integration} onReload={onReload} />}
          {type === 'green_api' && <GreenApiConfig integration={integration} onReload={onReload} />}
        </div>
      )}
    </div>
  )
}

/* ─── WhatsApp Config ─── */
function WhatsAppConfig({ integration, onReload }: { integration?: Integration; onReload: () => void }) {
  const config = (integration?.config || {}) as Record<string, string>
  const [phoneNumberId, setPhoneNumberId] = useState(config.phone_number_id || '')
  const [accessToken, setAccessToken] = useState(config.access_token || '')
  const [webhookToken, setWebhookToken] = useState(config.webhook_verify_token || '')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  // Templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplContent, setTplContent] = useState('')

  useEffect(() => {
    fetch('/api/integrations/whatsapp/templates')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setTemplates(d) })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'whatsapp',
        config: { phone_number_id: phoneNumberId, access_token: accessToken, webhook_verify_token: webhookToken },
        is_active: true,
      }),
    })
    await onReload()
    setSaving(false)
  }

  const handleDisconnect = async () => {
    await fetch('/api/integrations?type=whatsapp', { method: 'DELETE' })
    setPhoneNumberId('')
    setAccessToken('')
    setWebhookToken('')
    await onReload()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      if (!phoneNumberId || !accessToken) {
        setTestResult('error')
        setTesting(false)
        return
      }
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })
      setTestResult(res.ok ? 'success' : 'error')
    } catch {
      setTestResult('error')
    }
    setTesting(false)
  }

  const handleAddTemplate = async () => {
    if (!tplName.trim() || !tplContent.trim()) return
    const res = await fetch('/api/integrations/whatsapp/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tplName, content: tplContent }),
    })
    const tpl = await res.json()
    if (tpl?.id) setTemplates((prev) => [tpl, ...prev])
    setTplName('')
    setTplContent('')
    setShowAddTemplate(false)
  }

  const handleDeleteTemplate = async (id: string) => {
    await fetch(`/api/integrations/whatsapp/templates?id=${id}`, { method: 'DELETE' })
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-5">
      {/* Connection fields */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">הגדרות חיבור</h4>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Phone Number ID</label>
          <input type="text" dir="ltr" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="123456789012345"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Access Token</label>
          <div className="relative">
            <input type={showToken ? 'text' : 'password'} dir="ltr" value={accessToken} onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAxxxxxxxx..."
              className="w-full px-3 py-2 pe-10 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
            <button onClick={() => setShowToken(!showToken)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Webhook Verify Token</label>
          <input type="text" dir="ltr" value={webhookToken} onChange={(e) => setWebhookToken(e.target.value)}
            placeholder="my_verify_token"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`p-3 rounded-lg text-sm ${testResult === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {testResult === 'success' ? '✅ החיבור הצליח!' : '❌ החיבור נכשל. בדוק את הפרטים.'}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={saving || !phoneNumberId || !accessToken}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-sm rounded-lg transition-colors">
          <Link2 size={14} /> {saving ? 'שומר...' : 'שמור וחבר'}
        </button>
        <button onClick={handleTest} disabled={testing || !phoneNumberId || !accessToken}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} className={testing ? 'animate-spin' : ''} /> בדוק חיבור
        </button>
        {integration?.is_active && (
          <button onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg transition-colors me-auto">
            <Unlink size={14} /> נתק
          </button>
        )}
      </div>

      {/* Templates */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">תבניות הודעה ({templates.length})</h4>
          <button onClick={() => setShowAddTemplate(!showAddTemplate)}
            className="flex items-center gap-1 text-xs text-green-600 hover:underline">
            <Plus size={12} /> הוסף תבנית
          </button>
        </div>

        {showAddTemplate && (
          <div className="bg-green-50 rounded-lg p-4 mb-3 space-y-2">
            <input type="text" value={tplName} onChange={(e) => setTplName(e.target.value)}
              placeholder="שם התבנית" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none" />
            <textarea value={tplContent} onChange={(e) => setTplContent(e.target.value)}
              placeholder="תוכן ההודעה... השתמש ב-{{שם}} למשתנים" rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none resize-none" />
            <div className="flex flex-wrap gap-1 mb-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <button key={v.key} onClick={() => setTplContent(tplContent + v.key)}
                  className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded hover:bg-green-100">{v.key}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddTemplate} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">הוסף</button>
              <button onClick={() => setShowAddTemplate(false)} className="px-3 py-1.5 text-slate-500 text-sm">ביטול</button>
            </div>
          </div>
        )}

        {templates.length === 0 && !showAddTemplate && (
          <p className="text-sm text-slate-400">אין תבניות עדיין</p>
        )}

        <div className="space-y-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-700">{tpl.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tpl.status === 'approved' ? 'bg-green-100 text-green-700' :
                    tpl.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{tpl.status === 'approved' ? 'מאושר' : tpl.status === 'rejected' ? 'נדחה' : 'ממתין'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{tpl.content}</p>
              </div>
              <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-1 text-slate-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Gmail Config ─── */
function GmailConfig({ integration, onReload }: { integration?: Integration; onReload: () => void }) {
  const config = (integration?.config || {}) as Record<string, string>
  const [clientId, setClientId] = useState(config.client_id || '')
  const [clientSecret, setClientSecret] = useState(config.client_secret || '')
  const [email, setEmail] = useState(config.email || '')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'gmail',
        config: { client_id: clientId, client_secret: clientSecret, email },
        is_active: true,
      }),
    })
    await onReload()
    setSaving(false)
  }

  const handleDisconnect = async () => {
    await fetch('/api/integrations?type=gmail', { method: 'DELETE' })
    setClientId('')
    setClientSecret('')
    setEmail('')
    await onReload()
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        💡 כדי לחבר Gmail, צור OAuth 2.0 credentials ב-Google Cloud Console ואז הזן את הפרטים כאן.
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">כתובת Gmail לשליחה</label>
          <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your@gmail.com"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Client ID</label>
          <input type="text" dir="ltr" value={clientId} onChange={(e) => setClientId(e.target.value)}
            placeholder="xxxx.apps.googleusercontent.com"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Client Secret</label>
          <div className="relative">
            <input type={showSecret ? 'text' : 'password'} dir="ltr" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-xxxxxxxx"
              className="w-full px-3 py-2 pe-10 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400" />
            <button onClick={() => setShowSecret(!showSecret)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={saving || !email}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white text-sm rounded-lg transition-colors">
          <Link2 size={14} /> {saving ? 'שומר...' : 'שמור וחבר'}
        </button>
        {integration?.is_active && (
          <button onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg transition-colors me-auto">
            <Unlink size={14} /> נתק
          </button>
        )}
      </div>

      {/* Variable reference */}
      <div className="pt-3 border-t border-slate-100">
        <h4 className="text-xs font-semibold text-slate-500 mb-2">משתנים דינמיים זמינים</h4>
        <div className="flex flex-wrap gap-1">
          {TEMPLATE_VARIABLES.map((v) => (
            <span key={v.key} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
              {v.key} — {v.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Green API Config ─── */
function GreenApiConfig({ integration, onReload }: { integration?: Integration; onReload: () => void }) {
  const config = (integration?.config || {}) as Record<string, string>
  const [instanceId, setInstanceId] = useState(config.instance_id || '')
  const [apiToken, setApiToken] = useState(config.api_token || '')
  const [apiUrl, setApiUrl] = useState(config.api_url || '')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  // Auto-fill API URL when instance ID changes
  const handleInstanceIdChange = (val: string) => {
    setInstanceId(val)
    if (val.trim()) {
      setApiUrl(`https://${val.trim()}.api.greenapi.com`)
    } else {
      setApiUrl('')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'green_api',
        config: { instance_id: instanceId, api_token: apiToken, api_url: apiUrl },
        is_active: true,
      }),
    })
    await onReload()
    setSaving(false)
    setTestResult(null)
  }

  const handleDisconnect = async () => {
    await fetch('/api/integrations?type=green_api', { method: 'DELETE' })
    setInstanceId('')
    setApiToken('')
    setApiUrl('')
    await onReload()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/integrations/green-api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: instanceId, api_token: apiToken, api_url: apiUrl }),
      })
      const data = await res.json()
      setTestResult(data?.success ? 'success' : 'error')
    } catch {
      setTestResult('error')
    }
    setTesting(false)
  }

  return (
    <div className="space-y-5">
      <div className="p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700">
        💡 הזן את פרטי ה-Green API שלך. תמצא אותם ב-<a href="https://console.green-api.com" target="_blank" rel="noreferrer" className="underline font-medium">console.green-api.com</a>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Instance ID</label>
          <input
            type="text"
            dir="ltr"
            value={instanceId}
            onChange={(e) => handleInstanceIdChange(e.target.value)}
            placeholder="7103592740"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">API Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              dir="ltr"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="65a9c0594f54496b9d0025..."
              className="w-full px-3 py-2 pe-10 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button onClick={() => setShowToken(!showToken)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">API URL (ממולא אוטומטית)</label>
          <input
            type="text"
            dir="ltr"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://7103592740.api.greenapi.com"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
          />
        </div>
      </div>

      {testResult && (
        <div className={`p-3 rounded-lg text-sm ${testResult === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {testResult === 'success' ? '✅ החיבור הצליח! WhatsApp מחובר ומוכן.' : '❌ החיבור נכשל. בדוק שה-Instance ID והטוקן נכונים.'}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !instanceId || !apiToken}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm rounded-lg transition-colors"
        >
          <Link2 size={14} /> {saving ? 'שומר...' : 'שמור וחבר'}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !instanceId || !apiToken}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={testing ? 'animate-spin' : ''} /> בדוק חיבור
        </button>
        {integration?.is_active && (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg transition-colors me-auto"
          >
            <Unlink size={14} /> נתק
          </button>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
        <p>📋 <strong>Webhook URL</strong> להגדרה ב-Green API Console:</p>
        <div className="flex items-center gap-2">
          <code className="bg-slate-100 px-2 py-1 rounded text-slate-600 text-xs flex-1 break-all" dir="ltr">
            https://ogen-crm-git-main-natanel-alushs-projects-27754552.vercel.app/api/inbox/webhook
          </code>
          <button
            onClick={() => navigator.clipboard.writeText('https://ogen-crm-git-main-natanel-alushs-projects-27754552.vercel.app/api/inbox/webhook')}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
            title="העתק"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Calendar Config ─── */
function CalendarConfig({ integration, onReload }: { integration?: Integration; onReload: () => void }) {
  const config = (integration?.config || {}) as Record<string, string>
  const [clientId, setClientId] = useState(config.client_id || '')
  const [clientSecret, setClientSecret] = useState(config.client_secret || '')
  const [calendarId, setCalendarId] = useState(config.calendar_id || 'primary')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'calendar',
        config: { client_id: clientId, client_secret: clientSecret, calendar_id: calendarId },
        is_active: true,
      }),
    })
    await onReload()
    setSaving(false)
  }

  const handleDisconnect = async () => {
    await fetch('/api/integrations?type=calendar', { method: 'DELETE' })
    setClientId('')
    setClientSecret('')
    setCalendarId('primary')
    await onReload()
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        💡 חבר את Google Calendar כדי ליצור פגישות ישירות מכרטיס הליד. צור OAuth credentials ב-Google Cloud Console.
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Calendar ID</label>
          <input type="text" dir="ltr" value={calendarId} onChange={(e) => setCalendarId(e.target.value)}
            placeholder="primary"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Client ID</label>
          <input type="text" dir="ltr" value={clientId} onChange={(e) => setClientId(e.target.value)}
            placeholder="xxxx.apps.googleusercontent.com"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Client Secret</label>
          <div className="relative">
            <input type={showSecret ? 'text' : 'password'} dir="ltr" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-xxxxxxxx"
              className="w-full px-3 py-2 pe-10 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={() => setShowSecret(!showSecret)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm rounded-lg transition-colors">
          <Link2 size={14} /> {saving ? 'שומר...' : 'שמור וחבר'}
        </button>
        {integration?.is_active && (
          <button onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg transition-colors me-auto">
            <Unlink size={14} /> נתק
          </button>
        )}
      </div>
    </div>
  )
}
