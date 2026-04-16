'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Anchor,
  Kanban,
  CheckSquare,
  Bot,
  Webhook,
  Settings,
  ChevronLeft,
  GitBranch,
  Users,
  BarChart3,
  Target,
  MessageCircle,
  Zap,
  MessageSquare,
  Menu,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  {
    label: 'דשבורד',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    label: 'פייפליין',
    href: '/pipeline',
    icon: Kanban,
  },
  {
    label: 'אנשי קשר',
    href: '/contacts',
    icon: Users,
  },
  {
    label: 'שיחות',
    href: '/inbox',
    icon: MessageCircle,
    hasBadge: true,
  },
  {
    label: 'משימות',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    label: 'Webhook',
    href: '/webhook',
    icon: Webhook,
  },
  {
    label: 'אוטומציות',
    href: '/workflows',
    icon: GitBranch,
  },
  {
    label: 'סוכן AI',
    href: '/ai-agent',
    icon: Bot,
  },
  {
    label: 'תגובות מהירות',
    href: '/quick-replies',
    icon: Zap,
  },
  {
    label: 'תגובה → DM',
    href: '/comment-auto-reply',
    icon: MessageSquare,
  },
  {
    label: 'ניקוד לידים',
    href: '/scoring',
    icon: Target,
  },
  {
    label: 'הגדרות',
    href: '/settings',
    icon: Settings,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fetch unread conversations count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/inbox/conversations?status=open')
        if (res.ok) {
          const convs = await res.json()
          const total = convs.reduce((sum: number, c: { unread_count: number }) => sum + (c.unread_count || 0), 0)
          setUnreadCount(total)
        }
      } catch { /* silent */ }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0">
            <Anchor size={20} className="text-[#0f2744]" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">עוגן פיננסי</p>
            <p className="text-slate-400 text-xs">CRM מקצועי</p>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden mr-auto text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          const showBadge = item.hasBadge && unreadCount > 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
                }
              `}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {showBadge && (
                <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold me-auto">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {isActive && !showBadge && <ChevronLeft size={14} className="me-auto opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-[#0f2744] font-bold text-sm flex-shrink-0">
            מ
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">מנהל המערכת</p>
            <p className="text-slate-500 text-xs">admin@ogen.co.il</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 right-3 z-50 bg-[#0f2744] text-white p-2 rounded-xl shadow-lg"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop: always visible, mobile: slide in */}
      <aside
        className={`
          bg-[#0f2744] flex flex-col h-full z-50
          md:w-60 md:flex-shrink-0 md:relative md:translate-x-0
          fixed top-0 right-0 w-64 transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
