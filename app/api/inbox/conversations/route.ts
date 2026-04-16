import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — all conversations with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel')
  const status = searchParams.get('status') || 'open'
  const assigned = searchParams.get('assigned_to')
  const search = searchParams.get('search')

  let query = supabaseAdmin
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false })

  if (channel) query = query.eq('channel', channel)
  if (status && status !== 'all') query = query.eq('status', status)
  if (assigned) query = query.eq('assigned_to', assigned)
  if (search) {
    query = query.or(`contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%,last_message.ilike.%${search}%`)
  }

  const { data, error } = await query.limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create or find existing conversation
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { contact_name, contact_phone, contact_email, channel, lead_id, contact_id } = body

  if (!contact_name?.trim()) {
    return NextResponse.json({ error: 'שם חובה' }, { status: 400 })
  }

  // Check if conversation already exists with same phone + channel
  if (contact_phone) {
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('contact_phone', contact_phone)
      .eq('channel', channel || 'whatsapp')
      .eq('status', 'open')
      .single()

    if (existing) return NextResponse.json(existing)
  }

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      contact_name: contact_name.trim(),
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      channel: channel || 'whatsapp',
      lead_id: lead_id || null,
      contact_id: contact_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH — update conversation (assign, close, etc.)
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
