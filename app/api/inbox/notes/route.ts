import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — notes for a conversation
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')

  if (!conversationId) {
    return NextResponse.json({ error: 'חסר conversation_id' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('conversation_notes')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — add note
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { conversation_id, content } = body

  if (!conversation_id || !content?.trim()) {
    return NextResponse.json({ error: 'conversation_id ותוכן חובה' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('conversation_notes')
    .insert({
      conversation_id,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — remove note
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('conversation_notes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
