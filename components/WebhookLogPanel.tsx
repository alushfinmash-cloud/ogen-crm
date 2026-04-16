'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Globe,
} from 'lucide-react'

interface LogRow {
  id: string
  webhook_id: string
  lead_id: string | null
  payload: Record<string, unknown>
  status: 'success' | 'error'
  error_message: string | null
  ip_address: string | null
  created_at: string
}

export default function WebhookLogPanel({ webhookId }: { webhookId: string }) {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (data) setLogs(data)
      setLoading(false)
    }
    load()
  }, [webhookId])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <RefreshCw size={18} className="text-blue-500 animate-spin" />
        <span className="text-sm text-slate-500 me-2">טוען לוגים...</span>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock size={24} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">אין לוגים עדיין</p>
        <p className="text-xs text-slate-400 mt-1">שלח בקשת POST לכתובת ה-webhook כדי לראות לוגים כאן</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-700">לוג כניסות ({logs.length})</h4>
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id}>
            <div
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                log.status === 'success'
                  ? 'bg-green-50/80 hover:bg-green-50'
                  : 'bg-red-50/80 hover:bg-red-50'
              }`}
            >
              {log.status === 'success' ? (
                <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
              ) : (
                <XCircle size={15} className="text-red-500 flex-shrink-0" />
              )}

              <span className={`font-medium flex-1 truncate ${
                log.status === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {log.status === 'success'
                  ? `ליד נוצר: ${(log.payload as Record<string, unknown>)?.name || '—'}`
                  : log.error_message || 'שגיאה'}
              </span>

              <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                <Clock size={10} />
                {formatDate(log.created_at)}
              </span>
            </div>

            {/* Expanded payload */}
            {expandedId === log.id && (
              <div className="mt-1 mx-3 p-3 bg-slate-900 rounded-lg text-xs">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <Globe size={11} />
                  <span dir="ltr">{log.ip_address || '—'}</span>
                  {log.lead_id && (
                    <>
                      <span>·</span>
                      <span dir="ltr" className="text-blue-400">Lead: {log.lead_id.slice(0, 8)}...</span>
                    </>
                  )}
                </div>
                <pre className="text-green-400 overflow-x-auto" dir="ltr">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
