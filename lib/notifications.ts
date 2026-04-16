// ═══════════════════════════════════════
// Notification System for Inbox
// ═══════════════════════════════════════

export interface NotificationPreferences {
  soundEnabled: boolean
  browserNotifications: boolean
  soundVolume: number // 0-1
  notifyOnNewMessage: boolean
  notifyOnNewConversation: boolean
  notifyOnMention: boolean
}

const DEFAULT_PREFS: NotificationPreferences = {
  soundEnabled: true,
  browserNotifications: true,
  soundVolume: 0.5,
  notifyOnNewMessage: true,
  notifyOnNewConversation: true,
  notifyOnMention: true,
}

// Get preferences from localStorage
export function getNotificationPrefs(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const stored = localStorage.getItem('ogen_notification_prefs')
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) }
  } catch { /* fallback */ }
  return DEFAULT_PREFS
}

// Save preferences
export function saveNotificationPrefs(prefs: Partial<NotificationPreferences>) {
  if (typeof window === 'undefined') return
  const current = getNotificationPrefs()
  const updated = { ...current, ...prefs }
  localStorage.setItem('ogen_notification_prefs', JSON.stringify(updated))
  return updated
}

// Play notification sound using Web Audio API
export function playNotificationSound(type: 'message' | 'conversation' = 'message') {
  const prefs = getNotificationPrefs()
  if (!prefs.soundEnabled) return

  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    gainNode.gain.value = prefs.soundVolume * 0.3

    if (type === 'message') {
      // Short pleasant "ding" sound
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
      oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.05) // C#6
      oscillator.type = 'sine'
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.15)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15)
    } else {
      // Double "ding-dong" for new conversation
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime) // E5
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1) // A5
      oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.2) // C#6
      oscillator.type = 'sine'
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.3)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
    }
  } catch {
    // Fallback: silent if AudioContext not supported
  }
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Show browser notification
export function showBrowserNotification(
  title: string,
  body: string,
  options?: {
    icon?: string
    tag?: string
    onClick?: () => void
  }
) {
  const prefs = getNotificationPrefs()
  if (!prefs.browserNotifications) return
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  // Don't notify if page is focused
  if (document.hasFocus()) return

  try {
    const notification = new Notification(title, {
      body,
      icon: options?.icon || '/favicon.ico',
      tag: options?.tag || 'ogen-crm-inbox',
      badge: '/favicon.ico',
      dir: 'rtl',
      lang: 'he',
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
      options?.onClick?.()
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)
  } catch {
    // Notification failed silently
  }
}

// Update page title with unread count
export function updatePageTitle(unreadCount: number) {
  if (typeof window === 'undefined') return
  const baseTitle = 'עוגן פיננסי CRM'
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${baseTitle}`
  } else {
    document.title = baseTitle
  }
}

// CHANNEL LABELS for notifications
export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  gmail: 'Gmail',
  sms: 'SMS',
  telegram: 'Telegram',
  webchat: 'צ\'אט אתר',
}
