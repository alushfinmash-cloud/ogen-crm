'use client'

import { useState, useRef, useCallback } from 'react'
import {
  ArrowRight,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react'

interface Props {
  onClose: () => void
}

type Step = 1 | 2 | 3 | 4 | 5

interface ParsedRow {
  [key: string]: string
}

const SYSTEM_FIELDS = [
  { key: 'first_name', label: 'שם פרטי', required: true },
  { key: 'last_name', label: 'שם משפחה', required: false },
  { key: 'phone', label: 'מספר טלפון', required: true },
  { key: 'email', label: 'דוא"ל', required: false },
  { key: 'tags', label: 'תגיות', required: false },
]

export default function ImportContacts({ onClose }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [fileHeaders, setFileHeaders] = useState<string[]>([])
  const [fileRows, setFileRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number; failed: number; total: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string): { headers: string[]; rows: ParsedRow[] } => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const headers = lines[0].split(',').map((h) => h.replace(/^"/, '').replace(/"$/, '').trim())
    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.replace(/^"/, '').replace(/"$/, '').trim())
      const row: ParsedRow = {}
      headers.forEach((h, i) => { row[h] = values[i] || '' })
      return row
    })
    return { headers, rows }
  }

  const handleFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase()

    if (name.endsWith('.csv')) {
      const text = await file.text()
      const { headers, rows } = parseCSV(text)
      setFileHeaders(headers)
      setFileRows(rows)
      // Auto-map by guessing
      const autoMap: Record<string, string> = {}
      SYSTEM_FIELDS.forEach((f) => {
        const match = headers.find((h) =>
          h.includes(f.label) || h.toLowerCase().includes(f.key.replace('_', ' ')) ||
          (f.key === 'phone' && (h.includes('טלפון') || h.includes('phone'))) ||
          (f.key === 'first_name' && (h.includes('שם פרטי') || h.includes('first'))) ||
          (f.key === 'last_name' && (h.includes('שם משפחה') || h.includes('last'))) ||
          (f.key === 'email' && (h.includes('מייל') || h.includes('דוא') || h.includes('email'))) ||
          (f.key === 'tags' && (h.includes('תגי') || h.includes('tag')))
        )
        if (match) autoMap[f.key] = match
      })
      setMapping(autoMap)
      setStep(3)
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      // Dynamic import xlsx
      try {
        const XLSX = (await import('xlsx')).default
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '' })
        if (json.length > 0) {
          const headers = Object.keys(json[0])
          setFileHeaders(headers)
          setFileRows(json.map((row) => {
            const r: ParsedRow = {}
            headers.forEach((h) => { r[h] = String(row[h] ?? '') })
            return r
          }))
          const autoMap: Record<string, string> = {}
          SYSTEM_FIELDS.forEach((f) => {
            const match = headers.find((h) =>
              h.includes(f.label) || h.toLowerCase().includes(f.key.replace('_', ' ')) ||
              (f.key === 'phone' && (h.includes('טלפון') || h.includes('phone'))) ||
              (f.key === 'first_name' && (h.includes('שם פרטי') || h.includes('first'))) ||
              (f.key === 'last_name' && (h.includes('שם משפחה') || h.includes('last'))) ||
              (f.key === 'email' && (h.includes('מייל') || h.includes('דוא') || h.includes('email'))) ||
              (f.key === 'tags' && (h.includes('תגי') || h.includes('tag')))
            )
            if (match) autoMap[f.key] = match
          })
          setMapping(autoMap)
          setStep(3)
        }
      } catch {
        alert('שגיאה בקריאת הקובץ. ודא שהוא קובץ Excel תקין.')
      }
    } else {
      alert('פורמט לא נתמך. השתמש ב-.xlsx, .xls או .csv')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleImport = async () => {
    setImporting(true)
    const rows = fileRows.map((row) => {
      const mapped: Record<string, string> = {}
      SYSTEM_FIELDS.forEach((f) => {
        if (mapping[f.key]) {
          mapped[f.key] = row[mapping[f.key]] || ''
        }
      })
      return mapped
    })

    const res = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    setResult(data)
    setImporting(false)
    setStep(5)
  }

  const previewRows = fileRows.slice(0, 5)
  const canProceedMapping = mapping.first_name && mapping.phone

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <ArrowRight size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Upload size={20} className="text-indigo-600" />
              ייבוא אנשי קשר
            </h1>
            <p className="text-xs text-slate-400">שלב {step} מתוך 5</p>
          </div>
        </div>
        {/* Progress */}
        <div className="flex gap-1 mt-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-indigo-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">

          {/* Step 1: Instructions */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-3">פורמט הקובץ הנדרש</h3>
                <p className="text-sm text-slate-500 mb-4">הקובץ צריך לכלול את העמודות הבאות:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-start font-medium text-slate-600">שם פרטי *</th>
                        <th className="px-3 py-2 text-start font-medium text-slate-600">שם משפחה</th>
                        <th className="px-3 py-2 text-start font-medium text-slate-600">מספר טלפון *</th>
                        <th className="px-3 py-2 text-start font-medium text-slate-600">דוא"ל</th>
                        <th className="px-3 py-2 text-start font-medium text-slate-600">תגיות</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">ישראל</td>
                        <td className="px-3 py-2 text-slate-500">ישראלי</td>
                        <td className="px-3 py-2 text-slate-500" dir="ltr">050-1234567</td>
                        <td className="px-3 py-2 text-slate-500" dir="ltr">israel@email.com</td>
                        <td className="px-3 py-2 text-slate-500">VIP, לקוח חוזר</td>
                      </tr>
                      <tr className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">שרה</td>
                        <td className="px-3 py-2 text-slate-500">כהן</td>
                        <td className="px-3 py-2 text-slate-500" dir="ltr">052-9876543</td>
                        <td className="px-3 py-2 text-slate-500" dir="ltr">sara@email.com</td>
                        <td className="px-3 py-2 text-slate-500">חדש</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700 flex items-start gap-2">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    עמודת מספר טלפון היא חובה. אם המספר כבר קיים במערכת — הרשומה תתעדכן ולא תיווצר כפילות.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                המשך להעלאת קובץ
              </button>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 2 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet size={48} className="mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600 font-medium mb-1">גרור קובץ לכאן או לחץ לבחירה</p>
                <p className="text-sm text-slate-400">נתמכים: .xlsx, .xls, .csv</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              />
              <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700">
                ← חזור
              </button>
            </div>
          )}

          {/* Step 3: Column mapping */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4">מיפוי עמודות</h3>
                <p className="text-sm text-slate-400 mb-4">התאם את עמודות הקובץ לשדות המערכת:</p>
                <div className="space-y-3">
                  {SYSTEM_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-3">
                      <span className={`text-sm w-32 ${field.required ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
                        {field.label} {field.required && '*'}
                      </span>
                      <span className="text-slate-300">←</span>
                      <select
                        value={mapping[field.key] || ''}
                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">— בחר עמודה —</option>
                        {fileHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                  ← חזור
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!canProceedMapping}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors"
                >
                  המשך לתצוגה מקדימה
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-2">תצוגה מקדימה</h3>
                <p className="text-sm text-slate-400 mb-4">
                  מציג {previewRows.length} שורות ראשונות מתוך {fileRows.length}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        {SYSTEM_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                          <th key={f.key} className="px-3 py-2 text-start font-medium text-slate-600">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          {SYSTEM_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                            <td key={f.key} className="px-3 py-2 text-slate-600" dir={f.key === 'phone' || f.key === 'email' ? 'ltr' : undefined}>
                              {row[mapping[f.key]] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(3)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                  ← חזור
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      מייבא {fileRows.length} אנשי קשר...
                    </>
                  ) : (
                    `ייבא ${fileRows.length} אנשי קשר`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Results */}
          {step === 5 && result && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">הייבוא הושלם!</h3>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-green-600">{result.created}</p>
                    <p className="text-xs text-green-600 mt-1">נוצרו</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                    <p className="text-xs text-blue-600 mt-1">עודכנו</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                    <p className="text-xs text-red-600 mt-1">נכשלו</p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                חזור לרשימת אנשי קשר
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
