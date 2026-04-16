import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — inbox statistics for dashboard
export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Total conversations
    const { count: totalConvs } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true })

    // Open conversations
    const { count: openConvs } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')

    // Total unread
    const { data: unreadData } = await supabaseAdmin
      .from('conversations')
      .select('unread_count')
      .eq('status', 'open')
      .gt('unread_count', 0)

    const totalUnread = (unreadData || []).reduce((sum, c) => sum + (c.unread_count || 0), 0)

    // Messages today
    const { count: todayMessages } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart)

    // Messages this week
    const { count: weekMessages } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)

    // Messages by channel
    const { data: channelData } = await supabaseAdmin
      .from('conversations')
      .select('channel')

    const byChannel: Record<string, number> = {}
    for (const c of (channelData || [])) {
      byChannel[c.channel] = (byChannel[c.channel] || 0) + 1
    }

    // Incoming vs outgoing this week
    const { count: incomingWeek } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'in')
      .gte('created_at', weekAgo)

    const { count: outgoingWeek } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'out')
      .gte('created_at', weekAgo)

    // Messages per day (last 7 days)
    const { data: dailyMessages } = await supabaseAdmin
      .from('messages')
      .select('created_at, direction')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: true })

    const perDay: Record<string, { date: string; incoming: number; outgoing: number; total: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })
      perDay[key] = { date: label, incoming: 0, outgoing: 0, total: 0 }
    }
    for (const msg of (dailyMessages || [])) {
      const key = msg.created_at.slice(0, 10)
      if (perDay[key]) {
        perDay[key].total++
        if (msg.direction === 'in') perDay[key].incoming++
        else perDay[key].outgoing++
      }
    }

    // Average response time (simplified — time between first incoming and first outgoing in conversations)
    const { data: recentConvs } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .gte('created_at', monthAgo)
      .limit(50)

    let totalResponseTime = 0
    let responseCount = 0

    for (const conv of (recentConvs || [])) {
      const { data: firstIn } = await supabaseAdmin
        .from('messages')
        .select('created_at')
        .eq('conversation_id', conv.id)
        .eq('direction', 'in')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (firstIn) {
        const { data: firstOut } = await supabaseAdmin
          .from('messages')
          .select('created_at')
          .eq('conversation_id', conv.id)
          .eq('direction', 'out')
          .gt('created_at', firstIn.created_at)
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        if (firstOut) {
          const diff = new Date(firstOut.created_at).getTime() - new Date(firstIn.created_at).getTime()
          totalResponseTime += diff
          responseCount++
        }
      }
    }

    const avgResponseMinutes = responseCount > 0
      ? Math.round(totalResponseTime / responseCount / 60000)
      : 0

    return NextResponse.json({
      totalConversations: totalConvs || 0,
      openConversations: openConvs || 0,
      totalUnread,
      todayMessages: todayMessages || 0,
      weekMessages: weekMessages || 0,
      incomingWeek: incomingWeek || 0,
      outgoingWeek: outgoingWeek || 0,
      byChannel,
      dailyMessages: Object.values(perDay),
      avgResponseMinutes,
    })
  } catch (err) {
    console.error('Inbox stats error:', err)
    return NextResponse.json({ error: 'שגיאה בטעינת סטטיסטיקות' }, { status: 500 })
  }
}
