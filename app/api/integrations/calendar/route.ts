import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// POST — create calendar event
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { lead_id, contact_id, title, description, start_time, end_time } = body

  if (!title?.trim() || !start_time || !end_time) {
    return NextResponse.json({ error: 'כותרת, התחלה וסיום חובה' }, { status: 400 })
  }

  // Check Calendar integration
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('config, is_active')
    .eq('type', 'calendar')
    .single()

  let googleEventId = null

  // Try creating in Google Calendar if connected
  if (integration?.is_active && integration.config) {
    const config = integration.config as { access_token?: string; calendar_id?: string }
    if (config.access_token && config.calendar_id) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendar_id)}/events`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary: title,
              description: description || '',
              start: { dateTime: start_time, timeZone: 'Asia/Jerusalem' },
              end: { dateTime: end_time, timeZone: 'Asia/Jerusalem' },
            }),
          }
        )
        if (res.ok) {
          const event = await res.json()
          googleEventId = event.id
        }
      } catch {
        // Continue without Google sync
      }
    }
  }

  // Save to DB
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .insert({
      lead_id: lead_id || null,
      contact_id: contact_id || null,
      title: title.trim(),
      description: description || null,
      start_time,
      end_time,
      google_event_id: googleEventId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// GET — events for a lead/contact or upcoming
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('lead_id')
  const contactId = searchParams.get('contact_id')
  const upcoming = searchParams.get('upcoming')

  let query = supabaseAdmin
    .from('calendar_events')
    .select('*')
    .order('start_time', { ascending: true })

  if (leadId) query = query.eq('lead_id', leadId)
  else if (contactId) query = query.eq('contact_id', contactId)
  else if (upcoming) query = query.gte('start_time', new Date().toISOString()).limit(10)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  await supabaseAdmin.from('calendar_events').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
