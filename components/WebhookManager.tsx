'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Pipeline, PipelineColumn } from '@/lib/types'
import CreateWebhookModal from './CreateWebhookModal'
import WebhookLogPanel from './WebhookLogPanel'
import {
  Plus,
  RefreshCw,
  Webhook,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ScrollText,
  ExternalLink,
  Circle,
  AlertCircle,
} from 'lucide-react'

interface WebhookRow {
  id: string
  name: string
  slug: string
  pipeline_id: string
  column_id: string
  is_active: boolean
  created_at: string
  pipelines: { name: string; color: string } | null
  pipeline_columns: { name: string; color: string } | null
}

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [logWebhookId, setLogWebhookId] = useState<string | null>(null)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [columns, setColumns] = useState<PipelineColumn[]>([])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const loadData = useCallback(async () => {
    setLoading(true)
    const [whRes, pipesRes, colsRes] = await Promise.all([
      supabase
        .from('webhooks')
        .select('*, pipelines(name, color), pipeline_columns(name, color)')
        .order('created_at', { ascending: false }),
      supabase.from('pipelines').select('*').order('created_at'),
      supabase.from('pipeline_columns').select('*').order('position'),
    ])
    if (whRes.data) setWebhooks(whRes.data)
    if (pipesRes.data) setPipelines(pipesRes.data)
    if (colsRes.data) setColumns(colsRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCopy = (webhook: WebhookRow) => {
    const url = `${baseUrl}/api/webhooks/${webhook.slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(webhook.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleToggle = async (webhook: WebhookRow) => {
    const newActive = !webhook.is_active
    await supabase.from('webhooks').update({ is_active: newActive }).eq('id', webhook.id)
    setWebhooks((prev) =>
      prev.map((w) => (w.id === webhook.id ? { ...w, is_active: newActive } : w))
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('האם למחוק webhook זה? כל הלוגים ימחקו גם.')) return
    await supabase.from('webhook_logs').delete().eq('webhook_id', id)
    await supabase.from('webhooks').delete().eq('id', id)
    setWebhooks((prev) => prev.filter((w) => w.id !== id))
  }

  const handleCreate = async (name: string, pipelineId: string, columnId: string) => {
    const slug =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 8)

    const { data, error } = await supabase
      .from('webhooks')
      .insert({ name: name.trim(), slug, pipeline_id: pipelineId, column_id: columnId })
      .select('*, pipelines(name, color), pipeline_columns(name, color)')
      .single()

    if (data) {
      setWebhooks((prev) => [data, ...prev])
    }
    setIsCreateOpen(false)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="text-blue-500 animate-spin" />
          <p className="text-slate-500">טוען webhooks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Webhook size={22} className="text-blue-600" />
            ניהול Webhooks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">קבלת לידים ממקורות חיצוניים אוטומטית</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus size={16} />
          webhook חדש
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {webhooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
              <Webhook size={30} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">אין webhooks עדיין</h3>
            <p className="text-slate-500 text-sm mb-5 max-w-sm">
              צור webhook כדי לקבל לידים אוטומטית מטפסים חיצוניים, דפי נחיתה, או כל מערכת אחרת
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={16} />
              צור webhook ראשון
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {webhooks.map((wh) => {
              const url = `${baseUrl}/api/webhooks/${wh.slug}`
              const isCopied = copiedId === wh.id

              return (
                <div
                  key={wh.id}
                  className={`bg-white rounded-xl border p-5 transition-all ${
                    wh.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${wh.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <div>
                        <h3 className="font-semibold text-slate-900">{wh.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: (wh.pipelines?.color || '#3b82f6') + '20',
                              color: wh.pipelines?.color || '#3b82f6',
                            }}
                          >
                            {wh.pipelines?.name || '—'}
                          </span>
                          <span className="text-xs text-slate-400">→</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {wh.pipeline_columns?.name || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setLogWebhookId(logWebhookId === wh.id ? null : wh.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          logWebhookId === wh.id
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                        title="הצג לוגים"
                      >
                        <ScrollText size={16} />
                      </button>
                      <button
                        onClick={() => handleToggle(wh)}
                        className={`p-2 rounded-lg transition-colors ${
                          wh.is_active
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={wh.is_active ? 'השבת' : 'הפעל'}
                      >
                        {wh.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => handleDelete(wh.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="מחק"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* URL row */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 overflow-hidden">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex-shrink-0">
                        POST
                      </span>
                      <code className="text-xs text-slate-600 truncate flex-1" dir="ltr">
                        {url}
                      </code>
                    </div>
                    <button
                      onClick={() => handleCopy(wh)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all flex-shrink-0 ${
                        isCopied
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      {isCopied ? 'הועתק!' : 'העתק'}
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      נוצר: {formatDate(wh.created_at)}
                    </span>
                    <span className={`text-xs font-medium flex items-center gap-1 ${wh.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                      <Circle size={6} className={wh.is_active ? 'fill-green-500' : 'fill-slate-300'} />
                      {wh.is_active ? 'פעיל' : 'מושבת'}
                    </span>
                  </div>

                  {/* Logs panel — inline */}
                  {logWebhookId === wh.id && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <WebhookLogPanel webhookId={wh.id} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {isCreateOpen && (
        <CreateWebhookModal
          pipelines={pipelines}
          columns={columns}
          onCreate={handleCreate}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  )
}
