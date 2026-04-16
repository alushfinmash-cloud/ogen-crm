import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — search messages across all conversations
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const channel = searchParams.get('channel')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'נדרשים לפחות 2 תווים לחיפוש' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('messages')
    .select(`
      id,
      content,
      direction,
      channel,
      sender_name,
      created_at,
      conversation_id,
      conversations!inner (
        id,
        contact_name,
        contact_phone,
        channel,
        status
      )
    `)
    .ilike('content', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (channel) {
    query = query.eq('channel', channel)
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Format results
  const results = (data || []).map((msg: Record<string, unknown>) => {
    const conv = msg.conversations as Record<string, unknown> | null
    return {
      message_id: msg.id,
      content: msg.content,
      direction: msg.direction,
      channel: msg.channel,
      sender_name: msg.sender_name,
      created_at: msg.created_at,
      conversation_id: msg.conversation_id,
      contact_name: conv?.contact_name || 'לא ידוע',
      contact_phone: conv?.contact_phone || '',
    }
  })

  return NextResponse.json({
    query: q,
    total: results.length,
    results,
  })
}
