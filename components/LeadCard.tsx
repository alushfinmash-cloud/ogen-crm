'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lead, SOURCE_COLORS } from '@/lib/types'
import { Phone, MessageCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface Props {
  lead: Lead
  onClick?: () => void
  isDragging?: boolean
  score?: number
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return parts[0][0] + parts[1][0]
  return parts[0].substring(0, 2)
}

function getAvatarColor(name: string): string {
  const palettes = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-pink-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return palettes[hash % palettes.length]
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86_400_000)
}

export default function LeadCard({ lead, onClick, isDragging = false, score }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortable } =
    useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const initials = getInitials(lead.name)
  const avatarBg = getAvatarColor(lead.name)
  const sourceColor = SOURCE_COLORS[lead.source] || 'bg-slate-100 text-slate-600'
  const days = daysSince(lead.updated_at || lead.created_at)
  const staleWarning = days >= 3

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        bg-white rounded-xl border p-3 cursor-pointer select-none
        transition-all duration-150
        ${isSortable ? 'opacity-30' : ''}
        ${isDragging
          ? 'shadow-2xl border-blue-300 rotate-1 scale-105'
          : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
        }
        ${staleWarning && !isDragging ? 'border-s-2 border-s-amber-400' : ''}
      `}
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        <div
          className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5`}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm leading-tight truncate">{lead.name}</p>
          {lead.phone && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1" dir="ltr">
              <Phone size={10} />
              {lead.phone}
            </p>
          )}
        </div>

        {lead.value && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
            ₪{lead.value >= 1000 ? `${(lead.value / 1000).toFixed(0)}K` : lead.value}
          </span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {lead.source && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceColor}`}>
            {lead.source}
          </span>
        )}
        {score !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            score <= 30 ? 'bg-red-100 text-red-700' : score <= 60 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          }`}>
            {score}
          </span>
        )}
      </div>

      {/* Notes preview */}
      {lead.notes && (
        <p className="text-xs text-slate-400 mt-2 line-clamp-1 leading-relaxed">{lead.notes}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <span className={`text-xs flex items-center gap-1 ${staleWarning ? 'text-amber-500' : 'text-slate-400'}`}>
          <Calendar size={10} />
          {days === 0 ? 'היום' : `לפני ${days} ימים`}
        </span>

        <div className="flex items-center gap-2">
          {lead.phone && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); window.open(`tel:${lead.phone}`) }}
                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                title="התקשר"
              >
                <Phone size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const clean = lead.phone!.replace(/\D/g, '')
                  window.open(`https://wa.me/972${clean.replace(/^0/, '')}`)
                }}
                className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors"
                title="WhatsApp"
              >
                <MessageCircle size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
