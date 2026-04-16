import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// POST — trigger automation workflows from inbox events
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { event, data } = body

  // event types: 'new_message', 'new_conversation', 'conversation_closed', 'message_failed'
  if (!event || !data) {
    return NextResponse.json({ error: 'חסר event ו-data' }, { status: 400 })
  }

  try {
    // Find workflows that match this trigger
    const { data: workflows } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'inbox_event')

    if (!workflows || workflows.length === 0) {
      return NextResponse.json({ triggered: 0 })
    }

    let triggered = 0

    for (const workflow of workflows) {
      const config = workflow.trigger_config as Record<string, unknown> || {}

      // Check if this workflow matches the event
      const targetEvent = config.event as string
      if (targetEvent && targetEvent !== event && targetEvent !== 'all') continue

      // Check channel filter
      const targetChannel = config.channel as string
      if (targetChannel && targetChannel !== data.channel) continue

      // Check keyword filter
      const keywords = config.keywords as string[]
      if (keywords && keywords.length > 0) {
        const content = (data.content || '').toLowerCase()
        const hasKeyword = keywords.some((kw: string) => content.includes(kw.toLowerCase()))
        if (!hasKeyword) continue
      }

      // Trigger the workflow
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : 'http://localhost:3000'}/api/workflows/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_id: workflow.id,
            trigger_data: {
              event,
              ...data,
              triggered_at: new Date().toISOString(),
            },
          }),
        })
        triggered++
      } catch {
        // Individual workflow trigger failure
      }

      // Log the trigger
      try {
        await supabaseAdmin.from('workflow_logs').insert({
          workflow_id: workflow.id,
          status: 'triggered',
          trigger_data: { event, ...data },
          result: { triggered: true },
        })
      } catch { /* Ignore log errors */ }
    }

    // Auto-actions based on event type
    if (event === 'new_message' && data.direction === 'in') {
      // Auto-assign to team member if not assigned
      if (data.conversation_id) {
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .select('assigned_to')
          .eq('id', data.conversation_id)
          .single()

        if (conv && !conv.assigned_to) {
          // Could implement round-robin assignment here
          // For now, leave unassigned
        }
      }

      // Trigger lead scoring if conversation has a lead
      if (data.lead_id) {
        try {
          await fetch('/api/scoring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: data.lead_id,
              trigger_type: 'replied_to_message',
            }),
          })
        } catch { /* silent */ }
      }
    }

    // Track conversation activity for lead scoring
    if (event === 'new_conversation' && data.lead_id) {
      try {
        await fetch('/api/scoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: data.lead_id,
            trigger_type: 'conversation_started',
          }),
        })
      } catch { /* silent */ }
    }

    return NextResponse.json({ triggered })
  } catch (err) {
    console.error('Inbox trigger error:', err)
    return NextResponse.json({ error: 'שגיאה בהפעלת אוטומציות' }, { status: 500 })
  }
}
