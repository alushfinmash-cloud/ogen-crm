'use client'

import { useState } from 'react'
import { WorkflowStep, ACTION_LABELS, ACTION_COLORS, WAIT_UNITS } from '@/lib/workflow-types'
import { X, Save } from 'lucide-react'

interface Props {
  step: WorkflowStep
  onSave: (step: WorkflowStep) => void
  onClose: () => void
}

export default function StepConfigDrawer({ step, onSave, onClose }: Props) {
  const [config, setConfig] = useState<Record<string, unknown>>(step.action_config || {})
  const [waitDuration, setWaitDuration] = useState(step.wait_duration || 60)
  const [waitUnit, setWaitUnit] = useState(() => {
    const d = step.wait_duration || 60
    if (d >= 1440 && d % 1440 === 0) return 1440
    if (d >= 60 && d % 60 === 0) return 60
    return 1
  })
  const [waitAmount, setWaitAmount] = useState(() => {
    const d = step.wait_duration || 60
    if (d >= 1440 && d % 1440 === 0) return d / 1440
    if (d >= 60 && d % 60 === 0) return d / 60
    return d
  })

  const colors = ACTION_COLORS[step.action_type]

  const handleSave = () => {
    const updated = {
      ...step,
      action_config: config,
      wait_duration: step.action_type === 'wait' ? waitAmount * waitUnit : step.wait_duration,
    }
    onSave(updated)
  }

  const setField = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${colors.border} ${colors.bg} rounded-t-2xl`}>
          <h3 className={`font-bold ${colors.text}`}>{ACTION_LABELS[step.action_type]}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/50 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {step.action_type === 'add_tag' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">שם התג</label>
              <input
                value={(config.tag as string) || ''}
                onChange={(e) => setField('tag', e.target.value)}
                placeholder='לדוגמה: "ליד חם", "פגישה נקבעה"'
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">ניתן להשתמש במשתנים: {'{{שם}}'}, {'{{מקור}}'}</p>
            </div>
          )}

          {step.action_type === 'send_whatsapp' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">תבנית הודעה</label>
                <textarea
                  value={(config.message as string) || ''}
                  onChange={(e) => setField('message', e.target.value)}
                  placeholder={'שלום {{שם}}! קיבלנו את פנייתך ונחזור אליך בהקדם.'}
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                <p className="text-xs text-emerald-700 font-semibold mb-1">משתנים זמינים:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['{{שם}}', '{{טלפון}}', '{{אימייל}}', '{{מקור}}'].map((v) => (
                    <span key={v} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-mono">{v}</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {step.action_type === 'wait' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">משך המתנה</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={waitAmount}
                  onChange={(e) => setWaitAmount(Number(e.target.value) || 1)}
                  className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
                <select
                  value={waitUnit}
                  onChange={(e) => setWaitUnit(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {WAIT_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step.action_type === 'send_email' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">נושא המייל</label>
                <input
                  value={(config.subject as string) || ''}
                  onChange={(e) => setField('subject', e.target.value)}
                  placeholder='לדוגמה: "תודה על פנייתך, {{שם}}"'
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">תוכן המייל</label>
                <textarea
                  value={(config.body as string) || ''}
                  onChange={(e) => setField('body', e.target.value)}
                  placeholder="שלום {{שם}}, קיבלנו את פנייתך..."
                  rows={5}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {step.action_type === 'create_reminder' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">תוכן התזכורת</label>
                <input
                  value={(config.text as string) || ''}
                  onChange={(e) => setField('text', e.target.value)}
                  placeholder='לדוגמה: "לחזור ל-{{שם}} — {{טלפון}}"'
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">בעוד כמה זמן?</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={(config.due_amount as number) || 1}
                    onChange={(e) => {
                      const amount = Number(e.target.value) || 1
                      setField('due_amount', amount)
                      setField('due_in_minutes', amount * ((config.due_unit as number) || 1440))
                    }}
                    className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"
                  />
                  <select
                    value={(config.due_unit as number) || 1440}
                    onChange={(e) => {
                      const unit = Number(e.target.value)
                      setField('due_unit', unit)
                      setField('due_in_minutes', ((config.due_amount as number) || 1) * unit)
                    }}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WAIT_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {step.action_type === 'create_contact' && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">יצירת איש קשר</p>
              <p>פעולה זו מסמנת את הליד כאיש קשר פעיל במערכת ומתעדת את הפעולה בהיסטוריה.</p>
              <p className="mt-1">לא נדרשת הגדרה נוספת.</p>
            </div>
          )}

          {step.action_type === 'stop_previous' && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">עצירת workflows קודמים</p>
              <p>פעולה זו תעצור את כל ה-workflows הפעילים (בסטטוס "ממתין") עבור ליד זה.</p>
              <p className="mt-1">שימושי כאשר הליד עובר שלב ואוטומציות קודמות כבר לא רלוונטיות.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Save size={15} />
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}
